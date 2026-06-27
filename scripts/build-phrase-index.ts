/**
 * Phase-2 prereq deliverable #2: build the runtime phrase index (offline artifact).
 *
 * Reads the phrase brain (phrase_category_stats.json) + phrase_label_map.json
 * and emits data/routing/category-intelligence/phrase_index.json: a map from
 * normalized phrase -> routing payload, for fast lookup by the Phase-2 retriever.
 *
 * This is ONLY the offline artifact + builder. It does NOT build the in-memory
 * Map or wire anything into the live pipeline -- that is Phase 2 proper.
 *
 * Rules (from the brief):
 *   - normalize() is byte-for-byte the pipeline's normalize() in
 *     src/lib/category-suggestions.ts.
 *   - DROP entries with strength === "weak" OR total_count < 15.
 *   - Translate top_category label -> live slugs via phrase_label_map (1:N expand).
 *   - If the label is unmapped (no slugs), DROP the phrase (can't route it).
 *   - Deterministic, dependency-free (Node + fs).
 *
 * Run from repo root:
 *   npx ts-node --transpile-only -r ./scripts/_register-paths.js \
 *     --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' \
 *     scripts/build-phrase-index.ts
 *
 * Optional override: PHRASE_STATS_PATH=/abs/path/phrase_category_stats.json
 */
import * as fs from "fs";
import * as path from "path";

const CI_DIR = path.resolve(__dirname, "../data/routing/category-intelligence");
const LABEL_MAP_PATH = path.join(CI_DIR, "phrase_label_map.json");
const OUT = path.join(CI_DIR, "phrase_index.json");

function resolvePhraseStats(): string {
  if (process.env.PHRASE_STATS_PATH) return process.env.PHRASE_STATS_PATH;
  const candidates = [
    path.join(CI_DIR, "phrase_category_stats.json"),
    path.join(
      process.env.HOME || "",
      "Documents/KATEGORIJOS + 200K-uzklausu/data/routing/category-intelligence/phrase_category_stats.json"
    ),
  ];
  const hit = candidates.find((p) => fs.existsSync(p));
  if (!hit) {
    throw new Error(
      `phrase_category_stats.json not found. Set PHRASE_STATS_PATH. Tried:\n  ${candidates.join("\n  ")}`
    );
  }
  return hit;
}

// Exact copy of normalize() from src/lib/category-suggestions.ts.
const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

type Strength = "strong" | "medium" | "ambiguous" | "weak";

interface PhraseStat {
  phrase: string;
  ngram_size: number;
  total_count: number;
  top_category: string;
  top_category_share: number;
  strength: Strength;
  needs_context: boolean;
  category_distribution: Record<string, { count: number; share: number }>;
}

interface LabelMapEntry {
  slugs: string[];
  matched_by: string;
  confidence: number;
  needs_review: boolean;
}

interface IndexEntry {
  slugs: string[];
  share: number;
  strength: Strength;
  needs_context: boolean;
  ngram_size: number;
  total_count: number;
}

function main(): void {
  const statsPath = resolvePhraseStats();
  const stats: PhraseStat[] = JSON.parse(fs.readFileSync(statsPath, "utf8"));
  const labelMap: Record<string, LabelMapEntry> = JSON.parse(
    fs.readFileSync(LABEL_MAP_PATH, "utf8")
  );

  const index: Record<string, IndexEntry> = {};
  const drops = { weak: 0, lowCount: 0, unmapped: 0, collision: 0 };
  let kept = 0;

  // Deterministic order: highest total_count first, so on a normalized-phrase
  // collision the higher-traffic stat wins (and the tie-break is stable).
  const ordered = [...stats].sort(
    (a, b) => b.total_count - a.total_count || a.phrase.localeCompare(b.phrase)
  );

  for (const s of ordered) {
    if (s.strength === "weak") {
      drops.weak++;
      continue;
    }
    if (s.total_count < 15) {
      drops.lowCount++;
      continue;
    }

    const entry = labelMap[s.top_category];
    const slugs = entry?.slugs ?? [];
    if (slugs.length === 0) {
      // unmapped (or label absent from map) -> can't route this phrase
      drops.unmapped++;
      continue;
    }

    const key = normalize(s.phrase);
    if (!key) {
      drops.unmapped++;
      continue;
    }
    if (index[key]) {
      // already filled by a higher-traffic phrase that normalized the same way
      drops.collision++;
      continue;
    }

    index[key] = {
      slugs,
      share: s.top_category_share,
      strength: s.strength,
      needs_context: s.needs_context,
      ngram_size: s.ngram_size,
      total_count: s.total_count,
    };
    kept++;
  }

  fs.writeFileSync(OUT, JSON.stringify(index, null, 2));

  const bytes = fs.statSync(OUT).size;
  console.log(`Read ${stats.length} phrase stats from ${statsPath}`);
  console.log(`Kept ${kept} phrases -> ${OUT} (${(bytes / 1024 / 1024).toFixed(2)} MB)`);
  console.log("Dropped:");
  console.log(`  strength weak     : ${drops.weak}`);
  console.log(`  total_count < 15  : ${drops.lowCount}`);
  console.log(`  unmapped label    : ${drops.unmapped}`);
  console.log(`  normalize collision: ${drops.collision}`);
}

main();
