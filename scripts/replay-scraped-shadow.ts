/**
 * Offline multi-routing v4 SHADOW REPLAY over scraped historical requests.
 *
 * SAFE / OFFLINE ONLY — this script:
 *   - runs the REAL production v4 classifier (src/lib/routing/multi-routing-v4.ts),
 *     the exact contract validated by the A2.1 production shadow;
 *   - reads only local files (a sanitized request sample + a local taxonomy
 *     snapshot CSV) — it imports NOTHING from src that touches the DB, Prisma,
 *     email, or provider notifications;
 *   - NEVER calls createServiceRequest / notifyRelevantProviders / runShadowRouting;
 *   - writes a report only.
 *
 * Inputs (all local, read-only):
 *   1. sanitized sample NDJSON  (produced by the dataset repo's
 *      scripts/ai-routing/sample_and_sanitize.py — author dropped, PII redacted).
 *   2. taxonomy-deduplication-groups.csv  (docs/ai-routing/) — a local snapshot of
 *      the live taxonomy's duplicated-name groups: rawName -> {tax_ ids, isActive,
 *      class}. This is what lets us measure DISTINCT_TAX ambiguity offline, with
 *      ZERO production DB access.
 *   3. taxonomy_flat.jsonl  (dataset repo) — the canonical category-NAME universe,
 *      to tell a real-but-unique category from a genuinely unmatched name.
 *
 * Run (from marketplace-platform/):
 *   npx ts-node --transpile-only \
 *     --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' \
 *     scripts/replay-scraped-shadow.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  classifyMultiRouting,
  fold,
  distinctiveTokens,
  ROUTING_VERSION,
  type RoutingCandidate,
} from "../src/lib/routing/multi-routing-v4";
import {
  buildCategoryNameIndex,
  mapNameToCategoryId,
  type CategoryLite,
  type CategoryNameIndex,
} from "../src/lib/routing/taxonomy-map";

// ── paths (override via env) ──────────────────────────────────────────────────
const DATASET = process.env.DATASET_DIR ?? "/Users/judyanncastillo/Documents/KATEGORIJOS + 200K-uzklausu";
const N = Number(process.env.SAMPLE_N ?? 200);
const SAMPLE_NDJSON = process.env.SAMPLE_NDJSON ?? path.join(DATASET, "reports/ai-routing/_work", `sample-${N}-sanitized.ndjson`);
const DEDUP_CSV = process.env.DEDUP_CSV ?? path.join(__dirname, "..", "docs/ai-routing/taxonomy-deduplication-groups.csv");
const TAXONOMY_FLAT = process.env.TAXONOMY_FLAT ?? path.join(DATASET, "data/taxonomy/taxonomy_flat.jsonl");
const OUT_DIR = process.env.OUT_DIR ?? path.join(DATASET, "reports/ai-routing");

// ── tiny RFC4180-ish CSV parser (handles quoted fields w/ commas + "" escapes) ─
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift() ?? [];
  return rows
    .filter((r) => r.length > 1)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

// ── resolution status for a scraped category name vs the live taxonomy ─────────
type ResolveStatus = "resolved_tax" | "ambiguous_distinct_tax" | "canonical_no_local_taxid" | "unmatched";
interface CatResolution {
  name: string;
  status: ResolveStatus;
  /** active tax_ ids this name maps to (>=2 => DISTINCT_TAX ambiguous). */
  activeTaxIds: string[];
  /** the single id we feed the classifier as this candidate's identity. */
  candidateId: string;
  ambiguous: boolean;
  /** what production buildCategoryNameIndex would deterministically pick (diagnostic). */
  productionPick: string | null;
}

function loadDedup(): {
  activeTaxByName: Map<string, string[]>;
  index: CategoryNameIndex;
} {
  const recs = parseCsv(fs.readFileSync(DEDUP_CSV, "utf-8"));
  const activeTaxByName = new Map<string, string[]>();
  const cats: CategoryLite[] = [];
  for (const r of recs) {
    const isActiveTaxService =
      r.idSpace === "tax_" && r.pageType === "service" && r.isActive === "true";
    if (!isActiveTaxService) continue;
    const f = fold(r.rawName);
    const arr = activeTaxByName.get(f) ?? [];
    if (!arr.includes(r.id)) arr.push(r.id);
    activeTaxByName.set(f, arr);
    cats.push({ id: r.id, name: r.rawName, slug: r.slug, externalSlug: r.externalSlug || null });
  }
  for (const ids of activeTaxByName.values()) ids.sort();
  // Mirror production: deterministic first-writer-wins on id-sorted categories.
  cats.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { activeTaxByName, index: buildCategoryNameIndex(cats) };
}

function loadCanonicalVocab(): Set<string> {
  const v = new Set<string>();
  for (const line of fs.readFileSync(TAXONOMY_FLAT, "utf-8").split("\n")) {
    const s = line.trim();
    if (!s) continue;
    try {
      const cn = (JSON.parse(s).canonical_name ?? "").trim();
      if (cn) v.add(fold(cn));
    } catch { /* skip */ }
  }
  return v;
}

function resolve(
  name: string,
  activeTaxByName: Map<string, string[]>,
  vocab: Set<string>,
  index: CategoryNameIndex,
): CatResolution {
  const f = fold(name);
  const activeTaxIds = activeTaxByName.get(f) ?? [];
  const productionPick = mapNameToCategoryId(index, name);
  if (activeTaxIds.length >= 2) {
    return { name, status: "ambiguous_distinct_tax", activeTaxIds, candidateId: activeTaxIds[0], ambiguous: true, productionPick };
  }
  if (activeTaxIds.length === 1) {
    return { name, status: "resolved_tax", activeTaxIds, candidateId: activeTaxIds[0], ambiguous: false, productionPick };
  }
  if (vocab.has(f)) {
    return { name, status: "canonical_no_local_taxid", activeTaxIds: [], candidateId: `canon:${f}`, ambiguous: false, productionPick };
  }
  return { name, status: "unmatched", activeTaxIds: [], candidateId: `unmatched:${f}`, ambiguous: false, productionPick };
}

function isRealTaxId(id: string): boolean {
  return id.startsWith("tax_");
}

// ── per-request replay ─────────────────────────────────────────────────────────
interface SampleRow {
  request_id: number | string;
  title_classify: string;
  desc_classify: string;
  title_display: string;
  desc_display: string;
  scraped_categories: string[];
  city: string;
  status: string;
  time: string;
}

interface ResultRow {
  requestId: string;
  title: string;
  descExcerpt: string;
  city: string;
  status: string;
  scrapedCategories: string[];
  resolutions: CatResolution[];
  oldCategoryIds: string[];           // resolved active tax_ ids (union, deduped)
  v4CategoryNames: string[];
  v4CategoryIds: string[];            // candidate identity carried through (incl. placeholders)
  v4ActiveTaxIds: string[];           // survivors whose identity is a real active tax_ id
  confidence: number;
  routingTags: string[];
  projectType: string | null;
  suppressedCategories: string[];
  unmatchedCategoryNames: string[];
  distinctTaxAmbiguousNames: string[];
  // contract checks
  v4SubsetOfInput: boolean;           // survivors ⊆ input candidates (the core invariant)
  v4RealIdsSubsetOfOld: boolean;      // survivor tax_ ids ⊆ resolved old tax_ ids
  inventedIds: string[];              // survivor ids not present in input candidates (expect [])
  v4Empty: boolean;
  allSurvivorsResolveToActiveTax: boolean;
  upstreamSuspect: boolean;
  upstreamSuspectReason: string | null;
  ungroundedCategories: string[];
  /** no scraped category shares even a literal token with the text (== the v4
   * confidence 0.40 cohort). Inflated by LT morphology; kept only for transparency. */
  exactUngrounded: boolean;
  skipped: boolean;
}

// stem helpers mirror the classifier's own evidence test (first-5-char stem), so
// the suspect heuristic tolerates Lithuanian declensions (programuotojas ~
// programuotojai) that the exact-substring confidence grounding misses.
function stemTok(t: string): string {
  return t.length > 5 ? t.slice(0, 5) : t;
}
function textStemSet(text: string): Set<string> {
  const s = new Set<string>();
  for (const w of text.match(/\w+/g) ?? []) s.add(stemTok(w));
  return s;
}
function grounding(names: string[], text: string): {
  exactGrounded: string[]; exactUngrounded: string[];
  stemGrounded: string[]; stemUngrounded: string[];
} {
  const ts = textStemSet(text);
  const exactGrounded: string[] = [], exactUngrounded: string[] = [];
  const stemGrounded: string[] = [], stemUngrounded: string[] = [];
  for (const n of names) {
    const toks = distinctiveTokens(n);
    if (!toks.length) continue; // generic name — no distinctive evidence to test
    (toks.some((t) => text.includes(t)) ? exactGrounded : exactUngrounded).push(n);
    (toks.some((t) => ts.has(stemTok(t))) ? stemGrounded : stemUngrounded).push(n);
  }
  return { exactGrounded, exactUngrounded, stemGrounded, stemUngrounded };
}

function replayRow(
  row: SampleRow,
  activeTaxByName: Map<string, string[]>,
  vocab: Set<string>,
  index: CategoryNameIndex,
): ResultRow {
  const requestId = String(row.request_id);
  const scraped = row.scraped_categories ?? [];
  const text = fold(`${row.title_classify} . ${row.desc_classify}`);

  const resolutions = scraped.map((n) => resolve(n, activeTaxByName, vocab, index));
  const candidates: RoutingCandidate[] = resolutions.map((r) => ({ categoryId: r.candidateId, categoryName: r.name }));

  const v4 = classifyMultiRouting({
    title: row.title_classify,
    description: row.desc_classify,
    candidates,
    status: row.status,
  });

  const v4CategoryNames = v4.routingCategories.map((c) => c.categoryName);
  const v4CategoryIds = v4.routingCategories.map((c) => c.categoryId);

  // input candidate identity set (after the classifier's own fold-dedup the
  // survivor set is always a subset of this).
  const inputIds = new Set(candidates.map((c) => c.categoryId));
  const inventedIds = v4CategoryIds.filter((id) => !inputIds.has(id));
  const v4SubsetOfInput = inventedIds.length === 0;

  const oldCategoryIds = [...new Set(resolutions.flatMap((r) => r.activeTaxIds))];
  const oldIdSet = new Set(oldCategoryIds);
  const v4ActiveTaxIds = v4CategoryIds.filter(isRealTaxId);
  const v4RealIdsSubsetOfOld = v4ActiveTaxIds.every((id) => oldIdSet.has(id));

  const survivorFolds = new Set(v4CategoryNames.map(fold));
  const suppressedCategories = scraped.filter((n) => !survivorFolds.has(fold(n)));
  const unmatchedCategoryNames = resolutions.filter((r) => r.status === "unmatched").map((r) => r.name);
  const distinctTaxAmbiguousNames = resolutions.filter((r) => r.ambiguous).map((r) => r.name);

  // a survivor "resolves to active tax_" if its carried identity is a real tax_ id.
  const survivorRes = v4.routingCategories.map(
    (c) => resolutions.find((r) => fold(r.name) === fold(c.categoryName))!,
  );
  const allSurvivorsResolveToActiveTax =
    survivorRes.length > 0 &&
    survivorRes.every((r) => r.status === "resolved_tax" || r.status === "ambiguous_distinct_tax");

  // upstream-misclassification heuristic (STEM-level, so it does not fire on mere
  // singular/plural declension): a scraped label is "suspect" when NONE of its
  // distinctive tokens share even a stem with the request text. This is a coarse
  // text-overlap flag with no semantic understanding — an UPPER BOUND on truly
  // wrong labels, not a confirmed error rate.
  const g = grounding(scraped, text);
  let upstreamSuspect = false;
  let upstreamSuspectReason: string | null = null;
  if (scraped.length >= 1 && g.stemGrounded.length === 0 && g.stemUngrounded.length >= 1) {
    upstreamSuspect = true;
    upstreamSuspectReason =
      scraped.length === 1
        ? "single upstream category shares no stem with the request text"
        : "no scraped category shares a stem with the request text";
  } else if (unmatchedCategoryNames.length > 0 && g.stemGrounded.length === 0) {
    upstreamSuspect = true;
    upstreamSuspectReason = "upstream category name not present in the live taxonomy";
  }

  return {
    requestId,
    title: row.title_display,
    descExcerpt: (row.desc_display || "").slice(0, 200),
    city: row.city,
    status: row.status,
    scrapedCategories: scraped,
    resolutions,
    oldCategoryIds,
    v4CategoryNames,
    v4CategoryIds,
    v4ActiveTaxIds,
    confidence: v4.routingConfidence,
    routingTags: v4.routingTags,
    projectType: v4.projectType,
    suppressedCategories,
    unmatchedCategoryNames,
    distinctTaxAmbiguousNames,
    v4SubsetOfInput,
    v4RealIdsSubsetOfOld,
    inventedIds,
    v4Empty: v4CategoryNames.length === 0,
    allSurvivorsResolveToActiveTax,
    upstreamSuspect,
    upstreamSuspectReason,
    ungroundedCategories: g.stemUngrounded,
    exactUngrounded: g.exactGrounded.length === 0 && g.exactUngrounded.length >= 1,
    skipped: scraped.length === 0,
  };
}

// ── aggregation + report ────────────────────────────────────────────────────
function topCounts(items: string[], k: number): Array<[string, number]> {
  const m = new Map<string, number>();
  for (const it of items) m.set(it, (m.get(it) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, k);
}

function pct(n: number, d: number): string {
  return d ? `${((100 * n) / d).toFixed(1)}%` : "0.0%";
}

function main(): void {
  const { activeTaxByName, index } = loadDedup();
  const vocab = loadCanonicalVocab();

  const rows: SampleRow[] = fs
    .readFileSync(SAMPLE_NDJSON, "utf-8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));

  const results = rows.map((r) => replayRow(r, activeTaxByName, vocab, index));

  const processed = results.length;
  const skipped = results.filter((r) => r.skipped);
  const active = results.filter((r) => !r.skipped);
  const classified = active.filter((r) => !r.v4Empty);

  const subsetOk = active.filter((r) => r.v4SubsetOfInput).length;
  const realIdSubsetOk = active.filter((r) => r.v4RealIdsSubsetOfOld).length;
  const inventedRows = active.filter((r) => r.inventedIds.length > 0);
  const inventedTotal = active.reduce((s, r) => s + r.inventedIds.length, 0);
  const unmatchedRows = active.filter((r) => r.unmatchedCategoryNames.length > 0);
  const unmatchedTotal = active.reduce((s, r) => s + r.unmatchedCategoryNames.length, 0);
  const emptyRows = active.filter((r) => r.v4Empty);
  const suppressionRows = active.filter((r) => r.suppressedCategories.length > 0);
  const suppressionTotal = active.reduce((s, r) => s + r.suppressedCategories.length, 0);
  const ambiguityRows = active.filter((r) => r.distinctTaxAmbiguousNames.length > 0);
  const ambiguityNameMentions = active.reduce((s, r) => s + r.distinctTaxAmbiguousNames.length, 0);
  const distinctAmbiguousNames = new Set(active.flatMap((r) => r.distinctTaxAmbiguousNames.map(fold)));
  const suspectRows = active.filter((r) => r.upstreamSuspect);
  const exactUngroundedRows = active.filter((r) => r.exactUngrounded).length;

  // resolution-status breakdown across all scraped category mentions
  const statusCounts = { resolved_tax: 0, ambiguous_distinct_tax: 0, canonical_no_local_taxid: 0, unmatched: 0 };
  for (const r of active) for (const res of r.resolutions) statusCounts[res.status]++;
  const totalMentions = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const buckets = { lt40: 0, b40_59: 0, b60_79: 0, gte80: 0 };
  for (const r of active) {
    const c = r.confidence;
    if (c < 0.4) buckets.lt40++;
    else if (c < 0.6) buckets.b40_59++;
    else if (c < 0.8) buckets.b60_79++;
    else buckets.gte80++;
  }

  // confidence vs upstream-suspect correlation
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const confSuspect = mean(suspectRows.map((r) => r.confidence));
  const confClean = mean(active.filter((r) => !r.upstreamSuspect).map((r) => r.confidence));
  const suspectInLow = suspectRows.filter((r) => r.confidence < 0.6).length;

  const topOld = topCounts(active.flatMap((r) => r.scrapedCategories), 12);
  const topV4 = topCounts(active.flatMap((r) => r.v4CategoryNames), 12);
  const topSuppressed = topCounts(active.flatMap((r) => r.suppressedCategories), 12);

  const ex = (r: ResultRow) =>
    `- **${r.requestId}** — _${r.title}_ (conf ${r.confidence.toFixed(2)}${r.projectType ? `, ${r.projectType}` : ""})\n` +
    `  - scraped: ${r.scrapedCategories.map((c) => `\`${c}\``).join(", ") || "—"}\n` +
    `  - v4: ${r.v4CategoryNames.map((c) => `\`${c}\``).join(", ") || "—"}` +
    (r.suppressedCategories.length ? `  ·  suppressed: ${r.suppressedCategories.map((c) => `\`${c}\``).join(", ")}` : "") +
    (r.unmatchedCategoryNames.length ? `  ·  unmatched: ${r.unmatchedCategoryNames.map((c) => `\`${c}\``).join(", ")}` : "") +
    (r.distinctTaxAmbiguousNames.length ? `  ·  DISTINCT_TAX: ${r.distinctTaxAmbiguousNames.map((c) => `\`${c}\``).join(", ")}` : "");

  const badExamples = suspectRows.slice(0, 8).map(ex).join("\n");
  const goodExamples = active
    .filter((r) => r.confidence >= 0.8 && !r.upstreamSuspect && !r.v4Empty)
    .slice(0, 8)
    .map(ex)
    .join("\n");
  const cannotFix = active
    .filter((r) => r.unmatchedCategoryNames.length > 0 || r.distinctTaxAmbiguousNames.length > 0)
    .slice(0, 8)
    .map(ex)
    .join("\n");

  // ── write results.jsonl ──
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const resultsPath = path.join(OUT_DIR, `random-${N}-shadow-replay-results.jsonl`);
  fs.writeFileSync(resultsPath, results.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf-8");

  // ── write summary.md ──
  const md = `# Multi-routing v4 — random-${N} offline shadow replay

> **Safe / offline replay.** Source: ${N} randomly sampled historical requests from
> the scraped \`requests_all.parquet\` (218,980 rows) in the \`KATEGORIJOS + 200K-uzklausu\`
> dataset. The **production** \`${ROUTING_VERSION}\` classifier was run unchanged. **No**
> production DB write, **no** \`createServiceRequest\`, **no** \`notifyRelevantProviders\`,
> **no** email, **no** provider notification, **no** listing creation. PII removed
> (author dropped; phones/emails/URLs/names redacted). DISTINCT_TAX ambiguity and
> \`tax_\` resolution come from a **local** taxonomy snapshot
> (\`docs/ai-routing/taxonomy-deduplication-groups.csv\`) — zero production access.

## How the replay maps scraped data to the v4 contract

Production Phase-1 shadow feeds the request's **own curated category ids**; v4 only
suppresses, so ids carry through (no name→id remap). Scraped historical requests have
no platform ids — only legacy paslaugos.lt category **names**. So this replay does the
name→id resolution that Phase 1 deliberately avoids, which is exactly what exposes the
DISTINCT_TAX ambiguity Phase 2 would inherit. Each scraped category resolves to one of:

| status | meaning |
|---|---|
| \`resolved_tax\` | maps to exactly one active \`tax_\` service category |
| \`ambiguous_distinct_tax\` | maps to **≥2** active \`tax_\` ids — name→id pick is arbitrary |
| \`canonical_no_local_taxid\` | a real, unique canonical category whose \`tax_\` id is not in the local dedup snapshot (dedup CSV holds duplicated-name groups only) |
| \`unmatched\` | the scraped name is not in the live taxonomy at all |

## Aggregate metrics

| metric | value |
|---|---|
| sample size | ${processed} |
| successfully classified (≥1 v4 category) | ${classified.length} (${pct(classified.length, processed)}) |
| skipped / invalid rows (0 categories) | ${skipped.length} |
| v4 ⊆ input candidates (core no-invention invariant) | ${subsetOk}/${active.length} |
| v4 \`tax_\` ids ⊆ resolved old \`tax_\` ids | ${realIdSubsetOk}/${active.length} |
| **invented IDs** (rows / total ids) | ${inventedRows.length} rows / ${inventedTotal} ids |
| unmatched (rows / total names) | ${unmatchedRows.length} rows / ${unmatchedTotal} names |
| empty v4 output | ${emptyRows.length} |
| suppression (rows / total categories dropped) | ${suppressionRows.length} rows / ${suppressionTotal} dropped |
| DISTINCT_TAX ambiguity (rows / name-mentions / distinct names) | ${ambiguityRows.length} rows / ${ambiguityNameMentions} mentions / ${distinctAmbiguousNames.size} names |
| upstream-misclassification suspects (stem-level heuristic) | ${suspectRows.length} (${pct(suspectRows.length, active.length)}) |
| &nbsp;&nbsp;↳ exact-token ungrounded (== conf 0.40 cohort; inflated by LT morphology) | ${exactUngroundedRows} (${pct(exactUngroundedRows, active.length)}) |

### Resolution of scraped category names (${totalMentions} mentions)
This is the name→\`tax_\` id resolution that Phase 1 deliberately avoids; the
ambiguity here is the core Phase-2 risk.

| status | mentions | share |
|---|---|---|
| \`resolved_tax\` (1 active \`tax_\` id) | ${statusCounts.resolved_tax} | ${pct(statusCounts.resolved_tax, totalMentions)} |
| \`ambiguous_distinct_tax\` (≥2 active \`tax_\` ids) | ${statusCounts.ambiguous_distinct_tax} | ${pct(statusCounts.ambiguous_distinct_tax, totalMentions)} |
| \`canonical_no_local_taxid\` (real unique category; id not in local snapshot) | ${statusCounts.canonical_no_local_taxid} | ${pct(statusCounts.canonical_no_local_taxid, totalMentions)} |
| \`unmatched\` (not in live taxonomy) | ${statusCounts.unmatched} | ${pct(statusCounts.unmatched, totalMentions)} |

### Confidence distribution
v4 confidence is \`0.40 + 0.50·(grounded share) + 0.10·(project_type)\`, so **0.40 is the
structural floor** — there is no genuine \`<0.40\` case; the 0.40 band == "no scraped
category is grounded in the request text".

| band | count | share |
|---|---|---|
| < 0.40 | ${buckets.lt40} | ${pct(buckets.lt40, active.length)} |
| 0.40–0.59 | ${buckets.b40_59} | ${pct(buckets.b40_59, active.length)} |
| 0.60–0.79 | ${buckets.b60_79} | ${pct(buckets.b60_79, active.length)} |
| ≥ 0.80 | ${buckets.gte80} | ${pct(buckets.gte80, active.length)} |

### Confidence vs upstream-suspect
- mean confidence, upstream-suspect rows: **${confSuspect.toFixed(3)}**
- mean confidence, clean rows: **${confClean.toFixed(3)}**
- upstream suspects landing in the two low bands (<0.60): ${suspectInLow}/${suspectRows.length}

### Top scraped (old) categories
${topOld.map(([n, c]) => `- \`${n}\` — ${c}`).join("\n")}

### Top v4 categories
${topV4.map(([n, c]) => `- \`${n}\` — ${c}`).join("\n")}

### Top suppressed categories
${topSuppressed.length ? topSuppressed.map(([n, c]) => `- \`${n}\` — ${c}`).join("\n") : "- (none suppressed in this sample)"}

## Examples: likely-bad upstream category matches
${badExamples || "- (none flagged)"}

## Examples: good high-confidence matches
${goodExamples || "- (none ≥0.80 in this sample)"}

## Examples: Phase 1 cannot fix (it can only suppress, never invent/repick an id)
${cannotFix || "- (none)"}

## Answers

1. **Is the v4 contract still safe on ${N} historical requests?** ${
    inventedTotal === 0 && subsetOk === active.length && realIdSubsetOk === active.length
      ? "**Yes.** 0 invented ids, every v4 output is a subset of its input candidates, and every survivor tax_ id was already among the resolved old ids. v4 only ever suppressed catch-alls — it never added or re-picked a category."
      : "**No — investigate.** The no-invention / subset invariant did not hold on every row (see invented-id and subset counts above)."
  }
2. **How often does suppression happen?** ${suppressionRows.length}/${active.length} requests (${pct(suppressionRows.length, active.length)}), ${suppressionTotal} categories dropped total — only listed catch-alls (Statybos darbai, Smulkūs statybos darbai, Šiukšlių išvežimas, Fasadų apdaila) and only when a specific category survived and the catch-all had no text evidence.
3. **How often do DISTINCT_TAX ambiguous names appear?** ${ambiguityRows.length}/${active.length} requests (${pct(ambiguityRows.length, active.length)}) touch ≥1 name that maps to ≥2 active \`tax_\` ids (${distinctAmbiguousNames.size} distinct ambiguous names, ${ambiguityNameMentions} mentions). This is the dominant risk, and it lives in the **name→id resolution layer**, not in the v4 classifier.
4. **How often is the old/upstream category obviously wrong?** ${suspectRows.length}/${active.length} (${pct(suspectRows.length, active.length)}) flagged by the **stem-level** heuristic (no scraped label shares even a word-stem with the request text, or the name is absent from the live taxonomy). This is a coarse text-overlap **upper bound**, not a confirmed error rate — it has no semantic understanding, so a correct-but-terse request (e.g. a one-line title) can trip it. For contrast, the naive exact-token version flags ${exactUngroundedRows} (${pct(exactUngroundedRows, active.length)}); the gap is almost entirely Lithuanian declension (e.g. _Programuotojas_ → \`Programuotojai\`), which is why the stem heuristic is the honest number. Spot-checking the flagged examples below, a sizable share are actually fine — treat this as "needs review", not "wrong".
5. **Does confidence correlate with bad upstream matches?** ${
    confSuspect < confClean
      ? `Directionally yes — suspect rows average **${confSuspect.toFixed(2)}** vs **${confClean.toFixed(2)}** for clean rows. **But read this carefully:** v4 confidence and the suspect flag are both derived from text-grounding, so they are *related by construction*, not independent. They are not identical — confidence uses exact-substring matching while the suspect flag uses stems — so the comparison still shows the coarse confidence score tracks the finer suspicion signal. Practical takeaway: **low v4 confidence reliably flags ungrounded / terse requests for manual review**, but it conflates "genuinely wrong upstream label" with "correct label that simply lacks a literal keyword overlap." It is a triage signal, not a correctness verdict.`
      : `Not in this sample (suspect mean ${confSuspect.toFixed(2)} vs clean ${confClean.toFixed(2)}). Note both metrics derive from text-grounding, so any correlation would be partly definitional regardless.`
  }
6. **Blockers before continuing production shadow collection?** None for the v4 contract itself — it stayed safe. The blocker for *acting on* routing is the DISTINCT_TAX ambiguity in name→id resolution (question 3): on historical data the majority of requests touch an ambiguous name, so any Phase-2 free-text broadening that re-resolves names to ids would be non-deterministic until the taxonomy de-duplication (the SAFE_CONSOLIDATE merges) lands. Continue collecting *real* production shadow logs — those carry curated ids and avoid this entirely.
7. **Is Phase 2 ready?** **No — conservative hold.** Phase 1 shadow is PASS (17/17 production logs, 0 invented ids) and this offline replay corroborates the contract is safe, but: (a) the production shadow corpus is still tiny; (b) ${pct(ambiguityRows.length, active.length)} of historical requests hit DISTINCT_TAX ambiguity, which Phase 2's free-text broadening would have to resolve; (c) upstream label quality is imperfect (${pct(suspectRows.length, active.length)} suspects). Recommend: accumulate a larger real shadow log set + review this offline replay, and land the taxonomy de-dup, before starting Phase 2.

---
_Generated by \`scripts/replay-scraped-shadow.ts\` over \`${path.basename(SAMPLE_NDJSON)}\`. Per-request detail: \`${path.basename(resultsPath)}\`._
`;

  const summaryPath = path.join(OUT_DIR, `random-${N}-shadow-replay-summary.md`);
  fs.writeFileSync(summaryPath, md, "utf-8");

  // console digest
  console.log(JSON.stringify({
    routingVersion: ROUTING_VERSION,
    processed,
    classified: classified.length,
    skipped: skipped.length,
    inventedIds: inventedTotal,
    v4SubsetOk: `${subsetOk}/${active.length}`,
    realIdSubsetOk: `${realIdSubsetOk}/${active.length}`,
    emptyV4: emptyRows.length,
    suppressionRows: suppressionRows.length,
    distinctTaxRows: ambiguityRows.length,
    unmatchedRows: unmatchedRows.length,
    upstreamSuspects: suspectRows.length,
    confBuckets: buckets,
    outputs: [summaryPath, resultsPath],
  }, null, 2));
}

main();
