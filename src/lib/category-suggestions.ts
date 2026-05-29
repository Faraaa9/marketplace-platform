import { prisma } from "@/lib/prisma";
import { pickCategoryOverrideSlug } from "@/lib/category-overrides";
import { resolveModel, resolvePrompt, resolvePromptVersion } from "@/lib/ai/prompt-config";
import { callOpenRouter, type OpenRouterUsage } from "@/lib/ai/openrouter";
import { recordAiRun } from "@/lib/ai/audit";

/**
 * Suggest existing service categories from a natural-language description.
 *
 * Two stages:
 *   1. deterministic scoring over the curated `paslaugurinka-taxonomy` tree
 *      (name + breadcrumb + aliases, diacritic-insensitive, Lithuanian
 *      stem-aware so "orkaitę" matches "Orkaitės pajungimas").
 *   2. optional AI rerank via OpenRouter — kicks in only when configured,
 *      and never invents categories. Falls back to stage 1 silently.
 *
 * The AI must never return a slug that wasn't in the candidate list passed in.
 */

const TAXONOMY_SOURCE = "paslaugurinka-taxonomy";

const DEFAULT_RERANK_MODEL = "google/gemini-2.5-flash";
const RERANK_TIMEOUT_MS = 12_000;
const PROMPT_VERSION = "category-suggest-v1";

export type SuggestionMode = "request" | "provider";

export interface CategorySuggestion {
  id: string;
  slug: string;
  name: string;
  breadcrumb: string[];
  depth: number;
  confidence: number;
  reason: string;
}

export interface SuggestCategoriesInput {
  mode: SuggestionMode;
  text: string;
  title?: string;
  limit?: number;
}

export interface SuggestCategoriesResult {
  suggestions: CategorySuggestion[];
  clarificationQuestion?: string;
}

type CandidateRow = {
  id: string;
  slug: string;
  name: string;
  depth: number;
  parentId: string | null;
  rootId: string | null;
  aliases: string[];
};

// Common Lithuanian/English filler words that shouldn't drive matching.
const STOPWORDS = new Set([
  "ir", "ar", "tai", "yra", "bet", "kad", "kaip", "jei", "nes", "del", "su",
  "uz", "be", "po", "is", "ant", "prie", "tarp", "iki", "nuo", "kol", "tik",
  "tas", "ta", "tie", "tos", "sis", "si", "siuo", "sia", "siais", "sioms",
  "as", "tu", "jis", "ji", "mes", "jus", "jie", "jos", "save", "savo",
  "mano", "musu", "tavo", "jusu", "kazkas", "kazkur", "labai", "geras", "gera",
  "reikia", "reiktu", "noriu", "norime", "noretume", "noretumeme", "norecia",
  "ieskau", "iesko", "ieskome", "iesku", "noriau", "noretu",
  "galetu", "galeciau", "galetume", "butu", "buvo", "yra", "buti", "buvome",
  "labas", "sveiki", "aciu", "prasau", "padeti",
  "the", "a", "an", "and", "or", "but", "is", "it", "in", "on", "to", "for",
]);

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

/**
 * Crude Lithuanian stem: the first 5 chars, which collapses most case endings
 * ("orkaitę"/"orkaitės" → "orkai"). Good enough for substring-style matching.
 */
function stem(token: string): string {
  return token.slice(0, Math.min(5, token.length));
}

async function loadCandidates(): Promise<CandidateRow[]> {
  const taxonomy = await prisma.category.findMany({
    where: {
      pageType: "service",
      externalSource: TAXONOMY_SOURCE,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      depth: true,
      parentId: true,
      rootId: true,
      aliases: { select: { aliasName: true } },
    },
    orderBy: [{ depth: "asc" }, { sortOrder: "asc" }],
  });

  const rows = taxonomy.length > 0
    ? taxonomy
    : await prisma.category.findMany({
        where: { pageType: "service", isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          depth: true,
          parentId: true,
          rootId: true,
          aliases: { select: { aliasName: true } },
        },
        orderBy: [{ depth: "asc" }, { sortOrder: "asc" }],
      });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    depth: row.depth ?? 0,
    parentId: row.parentId,
    rootId: row.rootId,
    aliases: row.aliases.map((alias) => alias.aliasName).filter(Boolean),
  }));
}

function buildBreadcrumb(
  candidate: CandidateRow,
  byId: Map<string, CandidateRow>,
): string[] {
  const out: string[] = [];
  let current: CandidateRow | undefined = candidate;
  while (current) {
    out.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return out;
}

interface ScoreResult {
  score: number;
  matchedTokens: Set<string>;
}

function scoreCandidate(
  userTokens: string[],
  userStems: string[],
  candidate: CandidateRow,
  breadcrumb: string[],
): ScoreResult {
  const searchableParts = [candidate.name, ...candidate.aliases, breadcrumb.join(" ")];
  const candidateTokens = tokenize(searchableParts.join(" "));
  const candidateStems = new Set(candidateTokens.map(stem));
  const candidateTokenSet = new Set(candidateTokens);

  let score = 0;
  const matchedTokens = new Set<string>();
  let leafNameHits = 0;

  for (let i = 0; i < userTokens.length; i++) {
    const userToken = userTokens[i];
    const userStem = userStems[i];

    if (candidateTokenSet.has(userToken)) {
      score += 4;
      matchedTokens.add(userToken);
      if (tokenize(candidate.name).includes(userToken)) leafNameHits++;
      continue;
    }
    if (userStem.length >= 4 && candidateStems.has(userStem)) {
      score += 3;
      matchedTokens.add(userToken);
      if (tokenize(candidate.name).some((t) => stem(t) === userStem)) leafNameHits++;
      continue;
    }
    if (
      userToken.length >= 4 &&
      candidateTokens.some(
        (candidateToken) =>
          candidateToken.includes(userToken) || userToken.includes(candidateToken),
      )
    ) {
      score += 1.5;
      matchedTokens.add(userToken);
    }
  }

  if (matchedTokens.size === 0) {
    return { score: 0, matchedTokens };
  }

  // Prefer concrete leaves over coarse roots when both match.
  if (candidate.depth === 2) score += 2;
  else if (candidate.depth === 1) score += 0.5;

  // Hits directly on the leaf name (vs. on an ancestor's name) win ties.
  score += leafNameHits * 0.5;

  return { score, matchedTokens };
}

interface ScoredCandidate {
  candidate: CandidateRow;
  breadcrumb: string[];
  score: number;
  matchedTokens: Set<string>;
}

function rankCandidates(
  candidates: CandidateRow[],
  byId: Map<string, CandidateRow>,
  query: string,
): ScoredCandidate[] {
  const userTokens = tokenize(query);
  if (userTokens.length === 0) return [];
  const userStems = userTokens.map(stem);

  const scored: ScoredCandidate[] = [];
  for (const candidate of candidates) {
    if ((candidate.depth ?? 0) === 0) continue; // roots are too coarse
    const breadcrumb = buildBreadcrumb(candidate, byId);
    const { score, matchedTokens } = scoreCandidate(
      userTokens,
      userStems,
      candidate,
      breadcrumb,
    );
    if (score <= 0) continue;
    scored.push({ candidate, breadcrumb, score, matchedTokens });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Same score: prefer deeper (more specific) candidates.
    return (b.candidate.depth ?? 0) - (a.candidate.depth ?? 0);
  });

  return scored;
}

function pickTopSuggestions(
  scored: ScoredCandidate[],
  mode: SuggestionMode,
  limit: number,
): ScoredCandidate[] {
  if (scored.length === 0) return [];

  // For providers we want a wider spread across service areas (one chip per
  // area). For clients we lean toward the single best fit and close runners-up.
  const perRootCap = mode === "provider" ? 2 : 3;
  const seenByRoot = new Map<string, number>();
  const picked: ScoredCandidate[] = [];

  for (const entry of scored) {
    const rootKey = entry.candidate.rootId ?? entry.candidate.id;
    const used = seenByRoot.get(rootKey) ?? 0;
    if (used >= perRootCap) continue;
    picked.push(entry);
    seenByRoot.set(rootKey, used + 1);
    if (picked.length >= limit) break;
  }

  return picked;
}

function reasonFor(entry: ScoredCandidate): string {
  const words = [...entry.matchedTokens].slice(0, 3);
  if (words.length === 0) {
    return `Atitinka kategoriją „${entry.candidate.name}".`;
  }
  const joined = words.map((w) => `„${w}"`).join(", ");
  return `Tekste minimi žodžiai ${joined}.`;
}

function forcePreferredFirst(
  picked: ScoredCandidate[],
  preferred: ScoredCandidate | null,
  limit: number,
): ScoredCandidate[] {
  if (!preferred) return picked;
  const rest = picked.filter((entry) => entry.candidate.id !== preferred.candidate.id);
  return [preferred, ...rest].slice(0, limit);
}

function confidenceFor(entry: ScoredCandidate, bestScore: number): number {
  if (bestScore <= 0) return 0;
  const ratio = entry.score / Math.max(bestScore, 1);
  // Squash into a 0..1 score that ranks-by-score but never claims certainty.
  const raw = Math.min(0.95, 0.3 + ratio * 0.65);
  return Math.round(raw * 100) / 100;
}

function maybeClarification(
  picked: ScoredCandidate[],
  mode: SuggestionMode,
): string | undefined {
  if (picked.length === 0) {
    return mode === "provider"
      ? "Aprašykite konkrečiau, kokias paslaugas teikiate."
      : "Aprašykite tiksliau, kokios paslaugos ieškote.";
  }

  const top = picked[0];
  if (top.score < 4) {
    return mode === "provider"
      ? "Pridėkite kelis konkrečių paslaugų pavadinimus, kad galėtume tiksliau pasiūlyti."
      : "Patikslinkite, ką tiksliai reikia padaryti — paslaugą, vietą ar mastą.";
  }

  const roots = new Set(
    picked.slice(0, 3).map((entry) => entry.candidate.rootId ?? entry.candidate.id),
  );
  if (roots.size >= 3) {
    return "Tekstas tinka kelioms sritims — pasirinkite, kuri labiausiai atitinka.";
  }

  return undefined;
}

function toSuggestion(entry: ScoredCandidate, bestScore: number): CategorySuggestion {
  return {
    id: entry.candidate.id,
    slug: entry.candidate.slug,
    name: entry.candidate.name,
    breadcrumb: entry.breadcrumb,
    depth: entry.candidate.depth ?? 0,
    confidence: confidenceFor(entry, bestScore),
    reason: reasonFor(entry),
  };
}

interface AiRerankResult {
  ranking: Array<{ slug: string; confidence: number; reason: string }>;
  clarificationQuestion?: string;
}

interface AiRerankOutcome {
  /** null = nebandyta arba nepavyko (merge praleidžia ir lieka deterministika). */
  result: AiRerankResult | null;
  /** true kai buvo API raktas IR kandidatų — t.y. AI realiai bandytas. */
  attempted: boolean;
  /** true kai gautas ir suparsintas galiojantis atsakymas. */
  ok: boolean;
  model: string | null;
  usage: OpenRouterUsage | null;
  latencyMs: number;
  errorKind?: "timeout" | "http" | "network" | "empty";
}

async function aiRerank(
  input: SuggestCategoriesInput,
  topCandidates: ScoredCandidate[],
): Promise<AiRerankOutcome> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || topCandidates.length === 0) {
    return { result: null, attempted: false, ok: false, model: null, usage: null, latencyMs: 0 };
  }

  const candidateList = topCandidates
    .slice(0, 30)
    .map((entry) => `${entry.candidate.slug} (${entry.breadcrumb.join(" > ")})`)
    .join("\n");
  const validSlugs = new Set(topCandidates.map((entry) => entry.candidate.slug));

  const systemPrompt = await resolvePrompt("category_suggest", "system", { candidateList });
  const userKey = input.mode === "provider" ? "user_provider" : "user_request";
  const titleLine = input.title
    ? input.mode === "provider"
      ? `Antraštė: ${input.title}\n`
      : `Pavadinimas: ${input.title}\n`
    : "";
  const userPrompt = await resolvePrompt("category_suggest", userKey, {
    text: input.text,
    titleLine,
  });
  const model = await resolveModel(
    "category_suggest",
    process.env.OPENROUTER_MODEL || DEFAULT_RERANK_MODEL,
  );

  const call = await callOpenRouter({
    apiKey,
    model,
    timeoutMs: RERANK_TIMEOUT_MS,
    temperature: 0.2,
    maxTokens: 600,
    reasoning: false,
    jsonObject: true,
    title: "paslaugurinka.lt category-suggest",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const failed = (errorKind: AiRerankOutcome["errorKind"]): AiRerankOutcome => ({
    result: null,
    attempted: true,
    ok: false,
    model: call.model,
    usage: call.usage,
    latencyMs: call.latencyMs,
    errorKind,
  });

  if (!call.ok || call.content === null) {
    return failed(call.errorKind ?? "empty");
  }

  let parsed: unknown;
  try {
    const cleaned = call.content
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return failed("empty");
  }
  if (!parsed || typeof parsed !== "object") return failed("empty");
  const obj = parsed as Record<string, unknown>;

  const rawSuggestions = Array.isArray(obj.suggestions) ? obj.suggestions : [];
  const ranking = rawSuggestions
    .map((item): { slug: string; confidence: number; reason: string } | null => {
      if (!item || typeof item !== "object") return null;
      const entry = item as Record<string, unknown>;
      const slug = typeof entry.slug === "string" ? entry.slug.trim() : "";
      if (!validSlugs.has(slug)) return null;
      const confidenceRaw = typeof entry.confidence === "number" ? entry.confidence : 0;
      const confidence = Math.max(0, Math.min(1, confidenceRaw));
      const reason =
        typeof entry.reason === "string" ? entry.reason.trim().slice(0, 200) : "";
      return { slug, confidence, reason };
    })
    .filter((x): x is { slug: string; confidence: number; reason: string } => x !== null);

  const clarificationQuestion =
    typeof obj.clarificationQuestion === "string"
      ? obj.clarificationQuestion.trim().slice(0, 200)
      : "";

  return {
    result: { ranking, clarificationQuestion: clarificationQuestion || undefined },
    attempted: true,
    ok: true,
    model: call.model,
    usage: call.usage,
    latencyMs: call.latencyMs,
  };
}

function mergeWithAi(
  deterministic: ScoredCandidate[],
  ai: AiRerankResult,
  limit: number,
): { picked: ScoredCandidate[]; reasonBySlug: Map<string, string>; confidenceBySlug: Map<string, number> } {
  const bySlug = new Map(deterministic.map((entry) => [entry.candidate.slug, entry]));
  const ordered: ScoredCandidate[] = [];
  const reasonBySlug = new Map<string, string>();
  const confidenceBySlug = new Map<string, number>();

  for (const item of ai.ranking) {
    const entry = bySlug.get(item.slug);
    if (!entry) continue;
    ordered.push(entry);
    if (item.reason) reasonBySlug.set(item.slug, item.reason);
    if (Number.isFinite(item.confidence)) confidenceBySlug.set(item.slug, item.confidence);
    if (ordered.length >= limit) break;
  }

  // Backfill from deterministic order if AI returned fewer than requested.
  if (ordered.length < Math.min(limit, deterministic.length)) {
    const seen = new Set(ordered.map((entry) => entry.candidate.id));
    for (const entry of deterministic) {
      if (seen.has(entry.candidate.id)) continue;
      ordered.push(entry);
      seen.add(entry.candidate.id);
      if (ordered.length >= limit) break;
    }
  }

  return { picked: ordered, reasonBySlug, confidenceBySlug };
}

export async function suggestCategories(
  input: SuggestCategoriesInput,
): Promise<SuggestCategoriesResult> {
  const started = Date.now();
  const text = `${input.title ?? ""} ${input.text ?? ""}`.trim();
  if (text.length < 5) {
    return {
      suggestions: [],
      clarificationQuestion:
        input.mode === "provider"
          ? "Įveskite ilgesnį teikiamų paslaugų aprašymą."
          : "Įveskite ilgesnį aprašymą.",
    };
  }

  const limit = Math.min(Math.max(input.limit ?? 5, 3), 8);
  const candidates = await loadCandidates();
  if (candidates.length === 0) {
    return { suggestions: [] };
  }

  const byId = new Map(candidates.map((c) => [c.id, c]));
  const scored = rankCandidates(candidates, byId, text);
  const validSlugs = new Set(candidates.map((candidate) => candidate.slug));
  const overrideSlug = pickCategoryOverrideSlug(text, validSlugs);
  const overrideCandidate = overrideSlug
    ? candidates.find((candidate) => candidate.slug === overrideSlug)
    : undefined;
  const overrideEntry = overrideCandidate
    ? {
        candidate: overrideCandidate,
        breadcrumb: buildBreadcrumb(overrideCandidate, byId),
        score: Number.MAX_SAFE_INTEGER,
        // Empty — the override matches by rule, not by these specific words, so
        // reasonFor falls back to the honest "Atitinka kategoriją ..." instead of
        // naming words the user never wrote.
        matchedTokens: new Set<string>(),
      }
    : null;

  if (scored.length === 0 && !overrideEntry) {
    return {
      suggestions: [],
      clarificationQuestion:
        input.mode === "provider"
          ? 'Nepavyko atpažinti paslaugų — pridėkite konkrečių pavyzdžių (pvz. „plytelių klijavimas, vamzdžių keitimas").'
          : "Nepavyko atpažinti paslaugos — patikslinkite, ką reikia padaryti.",
    };
  }

  const scoredWithOverride = forcePreferredFirst(scored, overrideEntry, scored.length + 1);
  const deterministicPicked = forcePreferredFirst(
    pickTopSuggestions(scoredWithOverride, input.mode, limit),
    overrideEntry,
    limit,
  );
  const bestScore = deterministicPicked[0]?.score ?? scoredWithOverride[0].score;

  const rerank = await aiRerank(input, scoredWithOverride.slice(0, 30));
  const ai = rerank.result;

  let pickedEntries = deterministicPicked;
  let reasonBySlug: Map<string, string> | null = null;
  let confidenceBySlug: Map<string, number> | null = null;
  let aiClarification: string | undefined;
  const aiUsed = Boolean(ai && ai.ranking.length > 0);

  if (ai && ai.ranking.length > 0) {
    const merged = mergeWithAi(scoredWithOverride, ai, limit);
    pickedEntries = forcePreferredFirst(merged.picked, overrideEntry, limit);
    reasonBySlug = merged.reasonBySlug;
    confidenceBySlug = merged.confidenceBySlug;
    aiClarification = ai.clarificationQuestion;
  }

  const suggestions = pickedEntries.map((entry) => {
    const base = toSuggestion(entry, bestScore);
    const overrideReason = reasonBySlug?.get(entry.candidate.slug);
    const overrideConfidence = confidenceBySlug?.get(entry.candidate.slug);
    return {
      ...base,
      reason: overrideReason || base.reason,
      confidence:
        typeof overrideConfidence === "number" ? overrideConfidence : base.confidence,
    };
  });

  const clarificationQuestion =
    aiClarification && aiClarification.length > 0
      ? aiClarification
      : maybeClarification(pickedEntries, input.mode);

  // Auditas: žymim REALŲ AI rezultatą, ne tik "ar buvo raktas". AI bandytas bet
  // nepavykęs (timeout/klaida) -> error; be rakto nukritęs į deterministiką ->
  // provider "deterministic". Loginam realiai naudotą modelį ir token sąnaudas.
  await recordAiRun({
    feature: "category_suggest",
    status: rerank.attempted ? (rerank.ok ? "success" : "error") : "success",
    provider: rerank.attempted ? "openrouter" : "deterministic",
    model: rerank.model ?? undefined,
    promptVersion: await resolvePromptVersion("category_suggest", PROMPT_VERSION),
    latencyMs: rerank.attempted ? rerank.latencyMs : Date.now() - started,
    errorCode:
      rerank.attempted && !rerank.ok
        ? rerank.errorKind === "timeout"
          ? "AI_TIMEOUT"
          : "AI_REQUEST_FAILED"
        : undefined,
    metadata: {
      mode: input.mode,
      suggestions: suggestions.length,
      hasClarification: Boolean(clarificationQuestion),
      aiUsed,
      aiAttempted: rerank.attempted,
      promptTokens: rerank.usage?.promptTokens ?? null,
      completionTokens: rerank.usage?.completionTokens ?? null,
      totalTokens: rerank.usage?.totalTokens ?? null,
      costUsd: rerank.usage?.costUsd ?? null,
    },
  });

  return {
    suggestions,
    clarificationQuestion,
  };
}
