import type { ImproveDescriptionInput } from "@/lib/validations";
import { getFlatServiceCategories } from "@/lib/service-categories";
import { pickCategoryOverrideSlug } from "@/lib/category-overrides";
import {
  categoryMatchesRequestIntent,
  filterRequestCategoryChoices,
  buildDomainIndex,
  inferRequestRoots,
  type RootSignal,
} from "@/lib/category-selection-rules";
import { resolveModel, resolvePrompt, resolvePromptVersion } from "@/lib/ai/prompt-config";
import { callOpenRouter } from "@/lib/ai/openrouter";
import { recordAiRun } from "@/lib/ai/audit";

// Gemini handles Lithuanian grammar/nuance best of the OpenRouter models.
// 2.5-flash lets us turn reasoning off (3.x flash forces it), so this short
// cleanup task stays fast and the whole token budget goes to the answer.
const DEFAULT_MODEL = "google/gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 30_000;
const PROMPT_VERSION = "request-improve-v1";

/**
 * Build the curated-category prompt list (`slug (Pavadinimas)`, grouped by
 * root) and the valid-slug set used to validate the model's answer. The
 * taxonomy lives in the DB, so this resolves at call time.
 */
const normalizeForMatch = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ");

function scoreCategory(query: string, haystack: string, depth = 0): number {
  const normalizedHaystack = normalizeForMatch(haystack);
  const tokens = normalizeForMatch(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
  let score = depth >= 2 ? 3 : 0;
  for (const token of tokens) {
    if (normalizedHaystack.includes(token)) score += token.length;
  }
  if (tokens.length > 0 && normalizedHaystack.includes(tokens.join(" "))) score += 20;
  return score;
}

async function getCategoryPromptData(input: ImproveDescriptionInput): Promise<{ list: string; validSlugs: Set<string> }> {
  const categories = await getFlatServiceCategories();
  const byId = new Map(categories.map((category) => [category.id, category]));
  const query = `${input.title ?? ""} ${input.category ?? ""} ${input.description}`;
  const rootSignal = inferRequestRoots(query, buildDomainIndex(categories));

  const candidates = categories
    .filter((category) => (category.depth ?? 0) > 0)
    .map((category) => {
      const names: string[] = [category.name];
      let parent = category.parentId ? byId.get(category.parentId) : undefined;
      while (parent) {
        names.unshift(parent.name);
        parent = parent.parentId ? byId.get(parent.parentId) : undefined;
      }
      const breadcrumb = names.join(" > ");
      return {
        category,
        breadcrumb,
        score: scoreCategory(query, breadcrumb, category.depth),
      };
    })
    .filter(({ category }) =>
      categoryMatchesRequestIntent(
        {
          id: category.id,
          slug: category.slug,
          name: category.name,
          depth: category.depth ?? null,
          parentId: category.parentId ?? null,
          rootId: category.rootId ?? null,
        },
        query,
        rootSignal,
      ),
    )
    .sort((a, b) => b.score - a.score || (b.category.depth ?? 0) - (a.category.depth ?? 0))
    .slice(0, 140);

  const allValidSlugs = new Set(categories.map((category) => category.slug));
  const overrideSlug = pickCategoryOverrideSlug(query, allValidSlugs);
  if (overrideSlug) {
    const overrideCategory = categories.find((category) => category.slug === overrideSlug);
    if (overrideCategory) {
      const names: string[] = [overrideCategory.name];
      let parent = overrideCategory.parentId ? byId.get(overrideCategory.parentId) : undefined;
      while (parent) {
        names.unshift(parent.name);
        parent = parent.parentId ? byId.get(parent.parentId) : undefined;
      }
      const existingIndex = candidates.findIndex(
        (entry) => entry.category.slug === overrideSlug,
      );
      if (existingIndex >= 0) {
        candidates.splice(existingIndex, 1);
      }
      candidates.unshift({
        category: overrideCategory,
        breadcrumb: names.join(" > "),
        score: Number.MAX_SAFE_INTEGER,
      });
    }
  }

  const validSlugs = new Set<string>();
  const lines = candidates.map(({ category, breadcrumb }) => {
    validSlugs.add(category.slug);
    return `${category.slug} (${breadcrumb})`;
  });
  return { list: lines.join("\n"), validSlugs };
}

export class AiImproveError extends Error {}

export interface ImproveRecommendation {
  prompt: string;
  field: string;
  /** Short statement to append to the description if the user picks TAIP. */
  yesAnswer: string;
  /** Short statement to append to the description if the user picks NE. */
  noAnswer: string;
}

export interface ImproveDescriptionResult {
  improvedDescription: string;
  title: string;
  /** 0–3 curated category slugs, most relevant first. */
  categories: string[];
  /** Legacy single-slug field: same as categories[0] (or ""). Kept so the v1
   *  RequestAiAgentPanel keeps working without changes. */
  category: string;
  location: string;
  budget: string;
  deadline: string;
  recommendations: ImproveRecommendation[];
}

function parseResult(
  raw: string,
  validSlugs: Set<string>,
  categoryBySlug: Map<string, Awaited<ReturnType<typeof getFlatServiceCategories>>[number]>,
  originalText: string,
  rootSignal?: RootSignal,
): ImproveDescriptionResult | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let obj: unknown;
  try {
    obj = JSON.parse(cleaned);
  } catch (err) {
    console.error("AI JSON parse failed:", { raw: raw.slice(0, 200), error: String(err) });
    return null;
  }
  if (!obj || typeof obj !== "object") {
    console.error("AI response not an object:", { raw: raw.slice(0, 200) });
    return null;
  }
  const record = obj as Record<string, unknown>;

  const improvedDescription =
    typeof record.improvedDescription === "string" ? record.improvedDescription.trim() : "";
  if (!improvedDescription) {
    console.error("AI improvedDescription empty or missing", { record: JSON.stringify(record).slice(0, 200) });
    return null;
  }

  const title = typeof record.title === "string" ? record.title.trim().slice(0, 90) : "";

  // categories[]: validate each slug, dedupe while preserving order, cap at 3.
  const rawCategories: string[] = Array.isArray(record.categories)
    ? record.categories
        .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
        .filter((slug) => slug.length > 0 && validSlugs.has(slug))
    : [];
  const seen = new Set<string>();
  const categories: string[] = [];
  for (const slug of rawCategories) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    categories.push(slug);
    if (categories.length === 3) break;
  }
  const filteredCategories = filterRequestCategoryChoices(
    categories,
    originalText,
    (slug) => {
      const category = categoryBySlug.get(slug)!;
      return {
        id: category.id,
        slug: category.slug,
        name: category.name,
        depth: category.depth ?? null,
        parentId: category.parentId ?? null,
        rootId: category.rootId ?? null,
      };
    },
    rootSignal,
  );
  categories.length = 0;
  categories.push(...filteredCategories);

  // Legacy single-slug fallback for the v1 panel. Prefer the array's first
  // entry; fall back to the model's separately-returned "category" if it
  // happened to skip the array.
  let category = categories[0] ?? "";
  if (!category) {
    const rawCategory = (typeof record.category === "string" ? record.category.trim() : "").toLowerCase();
    if (validSlugs.has(rawCategory)) {
      category = rawCategory;
      categories.push(rawCategory);
    }
  }

  const location =
    typeof record.location === "string" ? record.location.trim().slice(0, 100) : "";

  const budget =
    typeof record.budget === "string" ? record.budget.trim().slice(0, 100) : "";

  const deadline =
    typeof record.deadline === "string" ? record.deadline.trim().slice(0, 100) : "";

  const recommendations: ImproveRecommendation[] = Array.isArray(record.recommendations)
    ? record.recommendations
        .map((item): ImproveRecommendation | null => {
          if (!item || typeof item !== "object") return null;
          const entry = item as Record<string, unknown>;
          const prompt = typeof entry.prompt === "string" ? entry.prompt.trim() : "";
          const field = typeof entry.field === "string" ? entry.field.trim() : "";
          const yesAnswer =
            typeof entry.yesAnswer === "string" ? entry.yesAnswer.trim() : "";
          const noAnswer =
            typeof entry.noAnswer === "string" ? entry.noAnswer.trim() : "";
          // Drop recommendations missing either yes/no answer — the new UI
          // shows TAIP/NE buttons and needs both branches.
          if (!prompt || !field || !yesAnswer || !noAnswer) return null;
          return { prompt, field, yesAnswer, noAnswer };
        })
        .filter((x): x is ImproveRecommendation => x !== null)
        .slice(0, 5)
    : [];

  return {
    improvedDescription,
    title,
    categories,
    category,
    location,
    budget,
    deadline,
    recommendations,
  };
}

export async function improveDescription(
  input: ImproveDescriptionInput,
): Promise<ImproveDescriptionResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new AiImproveError("AI_NOT_CONFIGURED");
  }

  const categories = await getFlatServiceCategories();
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const { list: categoryList, validSlugs } = await getCategoryPromptData(input);
  const systemPrompt = await resolvePrompt("request_improve", "system", { categoryList });
  const model = await resolveModel("request_improve", process.env.OPENROUTER_MODEL || DEFAULT_MODEL);
  const promptVersion = await resolvePromptVersion("request_improve", PROMPT_VERSION);

  const context: string[] = [];
  if (input.category) context.push(`Kategorija: ${input.category}`);
  if (input.title) context.push(`Pavadinimas: ${input.title}`);
  const userContent = `${context.length ? `${context.join("\n")}\n\n` : ""}Aprašymas:\n${input.description}`;

  const call = await callOpenRouter({
    apiKey,
    model,
    timeoutMs: REQUEST_TIMEOUT_MS,
    temperature: 0.3,
    maxTokens: 1400,
    reasoning: false,
    jsonObject: true,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });

  // Auditas loginamas čia (ne route), kad būtų užfiksuotas REALIAI naudotas
  // modelis, prompto versija ir token sąnaudos.
  const logError = (errorCode: string, extra?: Record<string, unknown>) =>
    recordAiRun({
      feature: "request_improve",
      status: "error",
      provider: "openrouter",
      model: call.model,
      promptVersion,
      latencyMs: call.latencyMs,
      errorCode,
      metadata: { attempts: call.attempts, ...extra },
    });

  if (!call.ok || call.content === null) {
    const errorCode =
      call.errorKind === "timeout"
        ? "AI_TIMEOUT"
        : !call.ok
          ? "AI_REQUEST_FAILED"
          : "AI_EMPTY_RESPONSE";
    await logError(errorCode);
    throw new AiImproveError(errorCode);
  }

  const resultRootSignal = inferRequestRoots(userContent, buildDomainIndex(categories));
  const result = parseResult(call.content, validSlugs, categoryBySlug, userContent, resultRootSignal);
  if (!result) {
    await logError("AI_EMPTY_RESPONSE", { parseFailed: true });
    throw new AiImproveError("AI_EMPTY_RESPONSE");
  }

  const overrideCategory = pickCategoryOverrideSlug(userContent, validSlugs);
  if (overrideCategory) {
    result.category = overrideCategory;
    // Promote the override slug to the front of the categories list.
    result.categories = [
      overrideCategory,
      ...result.categories.filter((slug) => slug !== overrideCategory),
    ].slice(0, 3);
  }

  await recordAiRun({
    feature: "request_improve",
    status: "success",
    provider: "openrouter",
    model: call.model,
    promptVersion,
    latencyMs: call.latencyMs,
    metadata: {
      attempts: call.attempts,
      hasTitle: Boolean(result.title),
      hasCategory: Boolean(result.category),
      recommendations: result.recommendations.length,
      promptTokens: call.usage?.promptTokens ?? null,
      completionTokens: call.usage?.completionTokens ?? null,
      totalTokens: call.usage?.totalTokens ?? null,
      costUsd: call.usage?.costUsd ?? null,
    },
  });

  return result;
}
