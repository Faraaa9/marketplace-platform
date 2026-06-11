/**
 * Golden eval replay — multi-routing v4 over the human-labeled golden set
 * (data/routing/eval/golden_eval_300_labeled.jsonl).
 *
 * Feeds each request's SUGGESTED categories (the bot's curated set — the same
 * candidate source the offline v4 consumes) through the real classifier and
 * measures agreement with the human gold labels. Deterministic: no DB, no
 * network, no LLM.
 *
 * Hard invariants (FAIL the run):
 *   - v4 output is always a subset of its candidates (Phase 1 never invents)
 *   - candidate ids are carried through untouched
 *   - confidence stays within [0, 1]
 *   - harmful suppression (v4 drops a category the human KEPT) stays within
 *     the locked regression bound
 *
 * Everything else is reported as metrics, not asserted — gold labels include
 * judgment calls v4 was never designed to reproduce (e.g. trimming a valid
 * category the human deemed secondary noise).
 *
 * Run:  pnpm routing:eval-golden
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  classifyMultiRouting,
  fold,
  type RoutingCandidate,
} from "../src/lib/routing/multi-routing-v4";

interface GoldenRecord {
  request_id: number;
  title: string;
  description: string;
  status: string;
  is_active: number;
  suggested_primary_category: string;
  suggested_secondary_categories: string[];
  gold_primary_category: string;
  gold_secondary_categories: string[];
  gold_tags: string[];
  gold_is_ambiguous: boolean;
  labeled: boolean;
}

// Locked at the v4.1 observed floor. The 5 residual harmful drops are beyond
// text evidence by construction: 3601992 + 3409111 (evidence only in request
// attachments/context), 4041708 + 2762303 + 4042312 (human inferred "small
// job"/"facade adjacency" semantics with no matching words in the text) —
// these are the Category Intelligence review signal's job, not rule fixes.
// A regression that newly drops human-kept categories must trip this bound.
const MAX_HARMFUL_DROPS = 5;

const EVAL_PATH = path.join(
  __dirname,
  "..",
  "data",
  "routing",
  "eval",
  "golden_eval_300_labeled.jsonl",
);

function readGolden(): GoldenRecord[] {
  const lines = fs.readFileSync(EVAL_PATH, "utf8").split("\n").filter((l) => l.trim());
  return lines.map((l) => JSON.parse(l) as GoldenRecord);
}

function foldedSet(names: string[]): Set<string> {
  return new Set(names.map((n) => fold(n)).filter((n) => n.length > 0));
}

function setEq(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function pct(n: number, d: number): string {
  return d === 0 ? "n/a" : `${((100 * n) / d).toFixed(1)}%`;
}

const records = readGolden().filter((r) => r.labeled);
assert.ok(records.length >= 250, `expected the 300-record golden set, got ${records.length}`);

let invariantFailures = 0;

// agreement (clean records only)
let clean = 0;
let exactV4 = 0;
let exactBaseline = 0;
let tpV4 = 0, fpV4 = 0, fnV4 = 0;
let tpBase = 0, fpBase = 0, fnBase = 0;
let goldOutsideCandidates = 0; // recall ceiling: v4 can filter, never add

// suppression decisions (all records)
let dropsTotal = 0;
let dropsCorrect = 0; // human also excluded the dropped category
let dropsHarmful = 0; // human KEPT the dropped category
const harmfulExamples: string[] = [];
const dropsByName = new Map<string, { correct: number; harmful: number }>();

// tag agreement: reikia_kelių_specialistų (all records)
let tagBoth = 0, tagOnlyV4 = 0, tagOnlyGold = 0, tagNeither = 0;

// confidence calibration (clean records)
let confMatchSum = 0, confMatchN = 0;
let confMissSum = 0, confMissN = 0;
let confAmbigSum = 0, confAmbigN = 0;

for (const rec of records) {
  const candidateNames = [
    rec.suggested_primary_category,
    ...(rec.suggested_secondary_categories ?? []),
  ].filter((n) => n && n.trim());

  const candidates: RoutingCandidate[] = candidateNames.map((name, i) => ({
    categoryId: `golden_${rec.request_id}_${i}`,
    categoryName: name,
  }));

  const result = classifyMultiRouting({
    title: rec.title,
    description: rec.description,
    candidates,
    status: rec.status,
    isActive: rec.is_active === 1,
  });

  const candSet = foldedSet(candidateNames);
  const v4Set = foldedSet(result.routingCategories.map((c) => c.categoryName));
  const goldSet = foldedSet([
    rec.gold_primary_category,
    ...(rec.gold_secondary_categories ?? []),
  ]);

  // ── hard invariants ──
  try {
    for (const c of result.routingCategories) {
      assert.ok(candSet.has(fold(c.categoryName)), `output '${c.categoryName}' not in candidates`);
      assert.ok(
        c.categoryId.startsWith(`golden_${rec.request_id}_`),
        `id was re-resolved: ${c.categoryId}`,
      );
    }
    assert.ok(
      result.routingConfidence >= 0 && result.routingConfidence <= 1,
      `confidence out of bounds: ${result.routingConfidence}`,
    );
  } catch (e) {
    invariantFailures += 1;
    console.error(`  ✗ invariant broken on request ${rec.request_id}: ${(e as Error).message}`);
  }

  // ── suppression decisions ──
  for (const dropped of candSet) {
    if (v4Set.has(dropped)) continue;
    dropsTotal += 1;
    const entry = dropsByName.get(dropped) ?? { correct: 0, harmful: 0 };
    if (goldSet.has(dropped)) {
      dropsHarmful += 1;
      entry.harmful += 1;
      if (harmfulExamples.length < 5) {
        harmfulExamples.push(`request ${rec.request_id}: dropped '${dropped}' (gold kept it)`);
      }
    } else {
      dropsCorrect += 1;
      entry.correct += 1;
    }
    dropsByName.set(dropped, entry);
  }

  // ── tag agreement ──
  const v4Multi = result.routingTags.includes("reikia_kelių_specialistų");
  const goldMulti = (rec.gold_tags ?? []).includes("reikia_kelių_specialistų");
  if (v4Multi && goldMulti) tagBoth += 1;
  else if (v4Multi) tagOnlyV4 += 1;
  else if (goldMulti) tagOnlyGold += 1;
  else tagNeither += 1;

  // ── agreement metrics on clean (non-ambiguous, labeled) records ──
  if (rec.gold_is_ambiguous || goldSet.size === 0) {
    confAmbigSum += result.routingConfidence;
    confAmbigN += 1;
    continue;
  }
  clean += 1;

  for (const g of goldSet) if (!candSet.has(g)) goldOutsideCandidates += 1;

  const matched = setEq(v4Set, goldSet);
  if (matched) exactV4 += 1;
  if (setEq(candSet, goldSet)) exactBaseline += 1;

  for (const x of v4Set) (goldSet.has(x) ? (tpV4 += 1) : (fpV4 += 1));
  for (const g of goldSet) if (!v4Set.has(g)) fnV4 += 1;
  for (const x of candSet) (goldSet.has(x) ? (tpBase += 1) : (fpBase += 1));
  for (const g of goldSet) if (!candSet.has(g)) fnBase += 1;

  if (matched) {
    confMatchSum += result.routingConfidence;
    confMatchN += 1;
  } else {
    confMissSum += result.routingConfidence;
    confMissN += 1;
  }
}

const ambiguous = records.length - clean;

console.log("──────────────────────────────────────────────────────────");
console.log("Golden eval replay — multi-routing v4");
console.log(`  records          : ${records.length} (clean: ${clean}, ambiguous/unlabeled-gold: ${ambiguous})`);
console.log(`  invariants       : ${invariantFailures === 0 ? "all hold (subset, identity, confidence bounds)" : `${invariantFailures} BROKEN`}`);
console.log("");
console.log("Agreement vs gold (clean records):");
console.log(`  exact set match  : v4 ${exactV4}/${clean} (${pct(exactV4, clean)})   baseline(no-suppression) ${exactBaseline}/${clean} (${pct(exactBaseline, clean)})`);
console.log(`  micro precision  : v4 ${pct(tpV4, tpV4 + fpV4)}   baseline ${pct(tpBase, tpBase + fpBase)}`);
console.log(`  micro recall     : v4 ${pct(tpV4, tpV4 + fnV4)}   baseline ${pct(tpBase, tpBase + fnBase)}`);
console.log(`  recall ceiling   : ${goldOutsideCandidates} gold labels missing from candidates (v4 cannot add — Phase 2 scope)`);
console.log("");
console.log("Suppression decisions (all records):");
console.log(`  drops            : ${dropsTotal} total — correct ${dropsCorrect}, harmful ${dropsHarmful} (bound: ≤${MAX_HARMFUL_DROPS})`);
for (const [name, s] of [...dropsByName.entries()].sort((a, b) => b[1].harmful - a[1].harmful)) {
  console.log(`    · '${name}': correct ${s.correct}, harmful ${s.harmful}`);
}
for (const ex of harmfulExamples) console.log(`    · ${ex}`);
console.log("");
console.log("Tag 'reikia_kelių_specialistų' (all records):");
console.log(`  both ${tagBoth} · only-v4 ${tagOnlyV4} · only-gold ${tagOnlyGold} · neither ${tagNeither}`);
console.log("");
console.log("Confidence calibration:");
console.log(`  mean on exact-match  : ${confMatchN ? (confMatchSum / confMatchN).toFixed(3) : "n/a"} (n=${confMatchN})`);
console.log(`  mean on mismatch     : ${confMissN ? (confMissSum / confMissN).toFixed(3) : "n/a"} (n=${confMissN})`);
console.log(`  mean on ambiguous    : ${confAmbigN ? (confAmbigSum / confAmbigN).toFixed(3) : "n/a"} (n=${confAmbigN})`);
console.log("──────────────────────────────────────────────────────────");

const pass = invariantFailures === 0 && dropsHarmful <= MAX_HARMFUL_DROPS;
console.log(pass ? "RESULT: PASS" : "RESULT: FAIL");
process.exit(pass ? 0 : 1);
