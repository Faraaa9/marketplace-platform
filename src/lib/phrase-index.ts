import fs from "node:fs";
import path from "node:path";

/**
 * Phrase-brain index (Phase 2): a precomputed map from normalized request
 * n-grams to the categories real requests with that phrase actually landed in.
 * Built offline from ~200K scraped requests (see scripts/build-phrase-index.ts).
 * Used as a SECOND RETRIEVER / candidate generator in suggestCategories —
 * never a re-ranker. Keys are already normalized with the pipeline's normalize().
 */
export interface PhraseEntry {
  slugs: string[];
  share: number;
  strength: "strong" | "medium" | "ambiguous";
  needs_context: boolean;
  ngram_size: number;
  total_count: number;
}

const PHRASE_INDEX_REL = "data/routing/category-intelligence/phrase_index.json";

let cache: Map<string, PhraseEntry> | null | undefined;

/**
 * Load + cache the phrase index. Returns null (cached) if the file is missing
 * or malformed — the caller degrades to lexical-only and never throws on the
 * request-create hot path. Tries cwd first (eval / Next.js server both run from
 * the repo root), then a path relative to this module as a fallback.
 */
export function loadPhraseIndex(): Map<string, PhraseEntry> | null {
  if (cache !== undefined) return cache;
  const candidates = [
    path.join(process.cwd(), PHRASE_INDEX_REL),
    path.join(__dirname, "..", "..", PHRASE_INDEX_REL),
  ];
  for (const file of candidates) {
    try {
      if (!fs.existsSync(file)) continue;
      const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, PhraseEntry>;
      cache = new Map(Object.entries(raw));
      return cache;
    } catch {
      // fall through to next candidate / null
    }
  }
  cache = null;
  return cache;
}
