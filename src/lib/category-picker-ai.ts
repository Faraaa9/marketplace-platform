import { prisma } from "@/lib/prisma";
import { resolveModel, resolvePrompt, resolvePromptVersion } from "@/lib/ai/prompt-config";
import { callOpenRouter } from "@/lib/ai/openrouter";
import { recordAiRun } from "@/lib/ai/audit";

/**
 * Two-pass AI category picker for provider profile auto-generation.
 *
 * Pass 1: pick 1–3 ROOTS from the 26 canonical paslaugurinka-taxonomy roots,
 *         using the user's raw input (not the AI marketing rewrite, which
 *         drowns matching in generic words like "specialistas"/"konsultacija").
 * Pass 2: load depth-1 subcategories ONLY under the selected roots, ask the
 *         model to pick only the ones (1–4) that directly match — favouring
 *         precision over filling a quota.
 *
 * Returns the specific depth-1 sub-category IDs (deduped) — written 1:1 into
 * provider_profile_categories. The broad roots are NOT saved (less filter
 * noise); they're only kept as a fallback when no sub-category matched, so a
 * profile is never left with zero categories. Categories from other taxonomy
 * sources (legacy paslaugos.lt rows) are deliberately excluded.
 */

const MODEL = "anthropic/claude-haiku-4.5";
const TAXONOMY_SOURCE = "paslaugurinka-taxonomy";
const PICKER_TIMEOUT_MS = 15_000;
const PROMPT_VERSION = "category-picker-v1";

const MAX_ROOTS = 3;
const MAX_LEAVES = 4;
const MIN_CONFIDENCE = 0.6;
const SAMPLE_CHILDREN_PER_ROOT = 8;

export interface CategoryPickerInput {
  rawText: string;
  title?: string;
}

export interface CategoryPickerResult {
  categoryIds: string[];
  slugs: string[];
  pickedRootNames: string[];
  pickedLeafNames: string[];
}

const EMPTY_RESULT: CategoryPickerResult = {
  categoryIds: [],
  slugs: [],
  pickedRootNames: [],
  pickedLeafNames: [],
};

// Claude Haiku occasionally wraps JSON in ```json fences despite response_format.
// Strip fences, fall back to extracting the first {...} block.
function parseJsonLoose(content: string): unknown {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

interface RootRow {
  id: string;
  name: string;
  slug: string;
  children: { name: string }[];
}

interface LeafRow {
  id: string;
  name: string;
  slug: string;
  depth: number;
  parent: { name: string } | null;
  root: { name: string } | null;
}

export async function pickProviderCategoriesAI(
  input: CategoryPickerInput,
): Promise<CategoryPickerResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error("pickProviderCategoriesAI: OPENROUTER_API_KEY missing");
    return EMPTY_RESULT;
  }
  if (!input.rawText || input.rawText.trim().length < 10) {
    return EMPTY_RESULT;
  }

  const roots = await prisma.category.findMany({
    where: {
      depth: 0,
      externalSource: TAXONOMY_SOURCE,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      children: {
        where: {
          isActive: true,
          externalSource: TAXONOMY_SOURCE,
        },
        select: { name: true },
        orderBy: { sortOrder: "asc" },
        take: SAMPLE_CHILDREN_PER_ROOT,
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  if (roots.length === 0) return EMPTY_RESULT;

  const selectedRoots = await pickRoots(input, roots, apiKey);
  if (selectedRoots.length === 0) return EMPTY_RESULT;

  const selectedRootIds = selectedRoots.map((r) => r.id);

  const leaves = await prisma.category.findMany({
    where: {
      rootId: { in: selectedRootIds },
      depth: 1,
      externalSource: TAXONOMY_SOURCE,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      depth: true,
      parent: { select: { name: true } },
      root: { select: { name: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const selectedLeaves = await pickLeaves(input, leaves, apiKey);

  // Save ONLY the specific sub-categories — keeps profiles precise and avoids
  // broad-root noise in category filters/search. Fall back to the picked roots
  // only when no leaf matched, so a provider never ends up with zero categories.
  const categoryIds =
    selectedLeaves.length > 0
      ? Array.from(new Set(selectedLeaves.map((l) => l.id)))
      : selectedRootIds;
  const slugs =
    selectedLeaves.length > 0
      ? selectedLeaves.map((l) => l.slug)
      : selectedRoots.map((r) => r.slug);

  return {
    categoryIds,
    slugs,
    pickedRootNames: selectedRoots.map((r) => r.name),
    pickedLeafNames: selectedLeaves.map((l) => l.name),
  };
}

async function pickRoots(
  input: CategoryPickerInput,
  roots: RootRow[],
  apiKey: string,
): Promise<RootRow[]> {
  const rootListing = roots
    .map((r, i) => {
      const examples =
        r.children.length > 0
          ? ` (pvz.: ${r.children.map((c) => c.name).join(", ")})`
          : "";
      return `${i + 1}. ${r.name}${examples}`;
    })
    .join("\n");

  const titleLine = input.title ? `Vardas/įmonė: ${input.title}\n` : "";
  const rawText = input.rawText.slice(0, 2000);
  const prompt = await resolvePrompt("category_picker", "roots_user", {
    rootListing,
    titleLine,
    rawText,
  });
  const systemPrompt = await resolvePrompt("category_picker", "system");
  const model = await resolveModel("category_picker", MODEL);
  const promptVersion = await resolvePromptVersion("category_picker", PROMPT_VERSION);

  const call = await callOpenRouter({
    apiKey,
    model,
    timeoutMs: PICKER_TIMEOUT_MS,
    temperature: 0.2,
    maxTokens: 500,
    jsonObject: true,
    title: "paslaugurinka.lt ai-category-pass1",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
  });

  const parsed =
    call.ok && call.content !== null
      ? (parseJsonLoose(call.content) as {
          roots?: Array<{ name?: string; confidence?: number }>;
        } | null)
      : null;

  if (!parsed) {
    await recordAiRun({
      feature: "category_picker",
      status: "error",
      provider: "openrouter",
      model: call.model,
      promptVersion,
      latencyMs: call.latencyMs,
      errorCode:
        call.errorKind === "timeout"
          ? "AI_TIMEOUT"
          : !call.ok
            ? "AI_REQUEST_FAILED"
            : "AI_EMPTY_RESPONSE",
      metadata: { pass: 1, attempts: call.attempts },
    });
    return [];
  }

  const nameToRoot = new Map(roots.map((r) => [r.name.toLowerCase().trim(), r]));
  const picks = (parsed.roots ?? []).filter(
    (p): p is { name: string; confidence: number } =>
      typeof p.name === "string" && (p.confidence ?? 0) >= MIN_CONFIDENCE,
  );

  const result: RootRow[] = [];
  const seen = new Set<string>();
  for (const pick of picks) {
    const root = nameToRoot.get(pick.name.toLowerCase().trim());
    if (!root || seen.has(root.id)) continue;
    seen.add(root.id);
    result.push(root);
    if (result.length >= MAX_ROOTS) break;
  }

  await recordAiRun({
    feature: "category_picker",
    status: "success",
    provider: "openrouter",
    model: call.model,
    promptVersion,
    latencyMs: call.latencyMs,
    metadata: {
      pass: 1,
      pickedRoots: result.length,
      attempts: call.attempts,
      promptTokens: call.usage?.promptTokens ?? null,
      completionTokens: call.usage?.completionTokens ?? null,
      totalTokens: call.usage?.totalTokens ?? null,
      costUsd: call.usage?.costUsd ?? null,
    },
  });

  return result;
}

async function pickLeaves(
  input: CategoryPickerInput,
  leaves: LeafRow[],
  apiKey: string,
): Promise<LeafRow[]> {
  if (leaves.length === 0) return [];

  const leafListing = leaves
    .map((l) => {
      const rootName = l.root?.name ?? "?";
      return `${l.slug} | ${rootName} > ${l.name}`;
    })
    .join("\n");

  const titleLine = input.title ? `Vardas/įmonė: ${input.title}\n` : "";
  const rawText = input.rawText.slice(0, 2000);
  const prompt = await resolvePrompt("category_picker", "leaves_user", {
    leafListing,
    titleLine,
    rawText,
  });
  const systemPrompt = await resolvePrompt("category_picker", "system");
  const model = await resolveModel("category_picker", MODEL);
  const promptVersion = await resolvePromptVersion("category_picker", PROMPT_VERSION);

  const call = await callOpenRouter({
    apiKey,
    model,
    timeoutMs: PICKER_TIMEOUT_MS,
    temperature: 0.2,
    maxTokens: 800,
    jsonObject: true,
    title: "paslaugurinka.lt ai-category-pass2",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
  });

  const parsed =
    call.ok && call.content !== null
      ? (parseJsonLoose(call.content) as {
          leaves?: Array<{ slug?: string; confidence?: number }>;
        } | null)
      : null;

  if (!parsed) {
    await recordAiRun({
      feature: "category_picker",
      status: "error",
      provider: "openrouter",
      model: call.model,
      promptVersion,
      latencyMs: call.latencyMs,
      errorCode:
        call.errorKind === "timeout"
          ? "AI_TIMEOUT"
          : !call.ok
            ? "AI_REQUEST_FAILED"
            : "AI_EMPTY_RESPONSE",
      metadata: { pass: 2, attempts: call.attempts },
    });
    return [];
  }

  const slugToLeaf = new Map(leaves.map((l) => [l.slug, l]));
  const result: LeafRow[] = [];
  const seen = new Set<string>();
  for (const pick of parsed.leaves ?? []) {
    if (typeof pick.slug !== "string") continue;
    if ((pick.confidence ?? 0) < MIN_CONFIDENCE) continue;
    const leaf = slugToLeaf.get(pick.slug);
    if (!leaf || seen.has(leaf.id)) continue;
    seen.add(leaf.id);
    result.push(leaf);
    if (result.length >= MAX_LEAVES) break;
  }

  await recordAiRun({
    feature: "category_picker",
    status: "success",
    provider: "openrouter",
    model: call.model,
    promptVersion,
    latencyMs: call.latencyMs,
    metadata: {
      pass: 2,
      pickedLeaves: result.length,
      attempts: call.attempts,
      promptTokens: call.usage?.promptTokens ?? null,
      completionTokens: call.usage?.completionTokens ?? null,
      totalTokens: call.usage?.totalTokens ?? null,
      costUsd: call.usage?.costUsd ?? null,
    },
  });

  return result;
}
