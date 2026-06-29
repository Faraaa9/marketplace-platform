import { embedTexts, denseTopK } from "@/lib/category-dense";
import { rerankJobs } from "@/lib/category-rerank";

/**
 * Multi-label categorization pipeline (Phase A). segment (LLM) -> per-job dense
 * retrieval (pgvector top-K) -> LLM rerank picks 1-2 logical categories/job.
 *
 * SAFETY: returns null on ANY failure or timeout (segmentation / embed / pgvector
 * / rerank). The caller treats null as "fall back to the current single-chip
 * behaviour" — the user never sees an error. Gated by the multilabel flag
 * upstream; this module assumes it was already checked.
 */

const SEG_MODEL = "google/gemini-2.5-flash";
const SEG_TIMEOUT_MS = 8_000;
const STEP_TIMEOUT_MS = 12_000;
// Wider candidate net: offline eval (36-req/83-job multi-label golden) measured
// gold-in-1-2 67.5% @20 -> 72.3% @50 (+~5pp), all-jobs-correct 33%->42%. The LLM
// rerank still picks 1-2, so the only cost is a larger rerank prompt (50 vs 20
// candidate names/job) — bounded by STEP_TIMEOUT_MS. User still confirms every pick.
const TOPK = 50;

const SEG_PROMPT =
  "Tu skaidai paslaugų užklausas į ATSKIRUS darbus. Grąžink TIK JSON masyvą trumpų darbų frazių. " +
  "Numanomus darbus irgi išskirk (pvz. 'pilna vonios renovacija' -> griovimas + plytelės + santechnika). " +
  'Pvz.: "Sienų dažymas, plytelių klojimas ir kriauklės" -> ["sienų dažymas","plytelių klojimas","kriauklės keitimas"]';

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

async function segment(text: string): Promise<string[]> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return [];
  const res = await withTimeout(
    fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: SEG_MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: SEG_PROMPT },
          { role: "user", content: text },
        ],
      }),
    }),
    SEG_TIMEOUT_MS,
  );
  if (!res.ok) return [];
  const d = (await res.json()) as { choices: { message: { content: string } }[] };
  const raw = d.choices[0].message.content.trim().replace(/```json|```/g, "").trim();
  try {
    return (JSON.parse(raw) as unknown[]).map((x) => String(x).trim()).filter(Boolean).slice(0, 6);
  } catch {
    return [];
  }
}

export interface MultilabelSuggestion {
  categoryId: string;
  slug: string;
  name: string;
}
export interface MultilabelJob {
  phrase: string;
  suggestions: MultilabelSuggestion[]; // LLM-picked 1-2 logical
  more: MultilabelSuggestion[]; // broader dense candidates ("daugiau")
}

/**
 * Returns the per-job suggestions, or null to signal the caller to fall back to
 * the existing single-chip behaviour. Never throws.
 */
export async function categorizeMultilabel(text: string): Promise<MultilabelJob[] | null> {
  try {
    const phrases = await segment(text);
    if (phrases.length === 0) return null;

    const vecs = await withTimeout(embedTexts(phrases), STEP_TIMEOUT_MS);
    const dense = await withTimeout(
      Promise.all(vecs.map((v) => denseTopK(v, TOPK))),
      STEP_TIMEOUT_MS,
    );
    // If retrieval came back empty for every job, the pool is unusable -> fall back.
    if (dense.every((d) => d.length === 0)) return null;

    const chosen = await withTimeout(
      rerankJobs(phrases.map((phrase, i) => ({ phrase, candidates: dense[i].map((c) => c.name) }))),
      STEP_TIMEOUT_MS,
    );

    const toS = (c: { categoryId: string; slug: string; name: string }): MultilabelSuggestion => ({
      categoryId: c.categoryId,
      slug: c.slug,
      name: c.name,
    });
    return phrases.map((phrase, i) => {
      const pickNames = new Set(chosen[i] ?? []);
      const picks = dense[i].filter((c) => pickNames.has(c.name));
      const suggestions = (picks.length ? picks : dense[i].slice(0, 2)).map(toS);
      const taken = new Set(suggestions.map((s) => s.slug));
      const more = dense[i].filter((c) => !taken.has(c.slug)).slice(0, 5).map(toS);
      return { phrase, suggestions, more };
    });
  } catch {
    return null; // any failure -> caller falls back to current behaviour
  }
}
