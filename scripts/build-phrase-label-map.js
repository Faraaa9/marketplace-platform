/**
 * Phase-2 prereq deliverable #1: translate phrase-brain labels -> live slugs.
 *
 * Input  : data/routing/category-intelligence/live_taxonomy.json  (from
 *          pull-live-taxonomy.js) and the phrase brain stats array.
 * Output : data/routing/category-intelligence/phrase_label_map.json
 *
 * The phrase brain's top_category / category_distribution keys are paslaugos.lt
 * RAW LABELS (250 distinct). The live pipeline emits paslaugurinka SLUGS. This
 * builds { "<label>": { slugs, matched_by, confidence, needs_review } } so a
 * later phase can expand a phrase's label to live slugs.
 *
 * Passes:
 *   - AUTO   : normalized label == normalized live name (or alias) -> exact_name
 *              / alias, confidence 1.0, needs_review false.
 *   - HEURISTIC: token-overlap / substring against live names. Proposes 1:N
 *              candidates, confidence < 1, needs_review true.
 *   - UNMAPPED: nothing plausible -> [], needs_review true.
 *
 * Normalization is byte-for-byte the pipeline's normalize() in
 * src/lib/category-suggestions.ts. SELECT-only upstream; this script is pure fs.
 *
 * Run from repo root (after pull-live-taxonomy.js):
 *   node scripts/build-phrase-label-map.js
 */
const path = require("path");
const fs = require("fs");

const CI_DIR = path.resolve(__dirname, "../data/routing/category-intelligence");
const TAXONOMY = path.join(CI_DIR, "live_taxonomy.json");
const OUT = path.join(CI_DIR, "phrase_label_map.json");

// phrase brain lives outside the repo (24MB, gitignored, offline-only).
// Override with PHRASE_STATS_PATH; otherwise probe the known offline locations.
const PHRASE_STATS = (() => {
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
})();

// Exact copy of normalize() from src/lib/category-suggestions.ts.
const normalize = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

// Same stopword list the pipeline's tokenize() uses, so heuristic token
// overlap doesn't get dominated by filler words.
const STOPWORDS = new Set([
  "ir", "ar", "arba", "tai", "yra", "bet", "kad", "kaip", "jei", "nes", "del", "su",
  "uz", "be", "po", "is", "ant", "prie", "tarp", "iki", "nuo", "kol", "tik",
  "tas", "ta", "tie", "tos", "sis", "si", "siuo", "sia", "siais", "sioms",
  "as", "tu", "jis", "ji", "mes", "jus", "jie", "jos", "save", "savo",
  "mano", "musu", "tavo", "jusu", "kazkas", "kazkur", "labai", "geras", "gera",
  "reikia", "reiktu", "noriu", "norime", "noretume", "noretumeme", "norecia",
  "ieskau", "iesko", "ieskome", "iesku", "noriau", "noretu",
  "galetu", "galeciau", "galetume", "butu", "buvo", "buti", "buvome",
  "labas", "sveiki", "aciu", "prasau", "padeti",
  "the", "a", "an", "and", "or", "but", "it", "in", "on", "to", "for",
]);

function tokenSet(value) {
  return new Set(
    normalize(value)
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
  );
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function main() {
  const taxonomy = JSON.parse(fs.readFileSync(TAXONOMY, "utf8"));
  const stats = JSON.parse(fs.readFileSync(PHRASE_STATS, "utf8"));

  // Live lookup: normalized name/alias -> set of slugs (1 name can repeat
  // across the duplicate-heavy taxonomy, so a label can legitimately fan out).
  const nameToSlugs = new Map();
  const aliasToSlugs = new Map();
  const cats = taxonomy.map((c) => ({
    slug: c.slug,
    name: c.name,
    depth: c.depth,
    normName: normalize(c.name),
    tokens: tokenSet(c.name),
  }));

  for (const c of cats) {
    if (!nameToSlugs.has(c.normName)) nameToSlugs.set(c.normName, new Set());
    nameToSlugs.get(c.normName).add(c.slug);
  }
  for (const raw of taxonomy) {
    for (const alias of raw.aliases || []) {
      const n = normalize(alias);
      if (!n) continue;
      if (!aliasToSlugs.has(n)) aliasToSlugs.set(n, new Set());
      aliasToSlugs.get(n).add(raw.slug);
    }
  }

  // Distinct labels + their peak total_count (for ranking the needs_review
  // backlog: a high-count unmapped label blocks more traffic).
  const labelPeak = new Map();
  for (const r of stats) {
    const labels = new Set([r.top_category, ...Object.keys(r.category_distribution || {})]);
    for (const label of labels) {
      labelPeak.set(label, Math.max(labelPeak.get(label) || 0, r.total_count || 0));
    }
  }
  // Only the 250 top_category labels are required deliverables, but mapping the
  // full distribution vocabulary too is free and lets Phase 2 expand minority
  // candidates. Keep the union; report stats on top_category labels.
  const topLabels = new Set(stats.map((r) => r.top_category));

  const map = {};
  const stat = { exact: 0, alias: 0, heuristic: 0, unmapped: 0 };

  for (const label of labelPeak.keys()) {
    const norm = normalize(label);
    const tokens = tokenSet(label);

    let entry;
    if (nameToSlugs.has(norm)) {
      entry = {
        slugs: [...nameToSlugs.get(norm)].sort(),
        matched_by: "exact_name",
        confidence: 1,
        needs_review: false,
      };
      if (topLabels.has(label)) stat.exact++;
    } else if (aliasToSlugs.has(norm)) {
      entry = {
        slugs: [...aliasToSlugs.get(norm)].sort(),
        matched_by: "alias",
        confidence: 1,
        needs_review: false,
      };
      if (topLabels.has(label)) stat.alias++;
    } else {
      // Heuristic: rank live cats by (jaccard token overlap, substring bonus).
      const scored = [];
      for (const c of cats) {
        let score = jaccard(tokens, c.tokens);
        // substring either direction is a strong signal for coarse->fine fan-out
        if (norm && (c.normName.includes(norm) || norm.includes(c.normName))) {
          score = Math.max(score, 0.6);
        }
        if (score > 0) scored.push({ slug: c.slug, score, normName: c.normName, depth: c.depth });
      }
      scored.sort((a, b) => b.score - a.score || a.depth - b.depth);

      if (scored.length === 0) {
        entry = { slugs: [], matched_by: "unmapped", confidence: 0, needs_review: true };
        if (topLabels.has(label)) stat.unmapped++;
      } else {
        const top = scored[0].score;
        // Keep the top candidate plus any near-ties (coarse label fanning out
        // to several finer slugs). Threshold keeps obvious noise out.
        const KEEP = Math.max(0.34, top - 0.12);
        const picked = scored.filter((s) => s.score >= KEEP).slice(0, 8);
        const slugs = picked.length ? picked : scored.slice(0, 1);
        entry = {
          slugs: slugs.map((s) => s.slug),
          matched_by: "heuristic",
          confidence: Number(top.toFixed(3)),
          needs_review: true,
        };
        if (topLabels.has(label)) stat.heuristic++;
      }
    }
    entry.peak_total_count = labelPeak.get(label) || 0;
    entry.is_top_category = topLabels.has(label);
    map[label] = entry;
  }

  fs.writeFileSync(OUT, JSON.stringify(map, null, 2));

  const totalTop = topLabels.size;
  console.log(`Wrote ${Object.keys(map).length} labels (${totalTop} are top_category) -> ${OUT}`);
  console.log("Coverage of the 250 top_category labels:");
  console.log(`  exact_name : ${stat.exact}`);
  console.log(`  alias      : ${stat.alias}`);
  console.log(`  heuristic  : ${stat.heuristic} (needs_review)`);
  console.log(`  unmapped   : ${stat.unmapped} (needs_review)`);

  // Top-10 highest-traffic labels a human must audit (unmapped first, then heuristic).
  const review = [...topLabels]
    .map((l) => ({ label: l, ...map[l] }))
    .filter((e) => e.needs_review)
    .sort((a, b) => {
      const rank = (e) => (e.matched_by === "unmapped" ? 1 : 0);
      return rank(b) - rank(a) || b.peak_total_count - a.peak_total_count;
    })
    .slice(0, 10);
  console.log("\nTop-10 needs_review by peak traffic (unmapped prioritized):");
  for (const e of review) {
    console.log(
      `  [${e.matched_by}] count=${e.peak_total_count} conf=${e.confidence} "${e.label}" -> ${e.slugs.slice(0, 4).join(", ") || "(none)"}`
    );
  }
}

main();
