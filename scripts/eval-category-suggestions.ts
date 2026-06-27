/**
 * Phase-0 eval harness for suggestCategories({ mode: "request" }).
 *
 * MEASUREMENT ONLY. Does not touch production code. Feeds every labeled golden
 * record (data/routing/eval/golden_eval_300_labeled.jsonl) through the live
 * deterministic Stage-1 suggester and reports the baseline metrics that the
 * next phase will diff against:
 *
 *   1. precision@1   — top suggestion name == gold_primary (fold-normalized)
 *   2. recall@3      — gold_primary in first-3 suggestion names
 *   3. multi-need F1 — micro P/R/F1 of suggestion-name set vs gold {primary} ∪ secondary
 *   4. ambiguity-gate recall — over gold_is_ambiguous records, fraction where the
 *      pipeline "hedges" (clarificationQuestion present OR top confidence < threshold);
 *      plus the false-alarm rate on non-ambiguous records
 *   5. recall ceiling — how many gold_primary names are even resolvable in the live
 *      taxonomy (suggestCategories can only ever return live names)
 *
 * The official baseline is DETERMINISTIC: the AI rerank is disabled in-process
 * (OPENROUTER_API_KEY deleted before the suggester is imported) so the gate is
 * reproducible and free. `EVAL_AI=1` runs the AI path on a small sample for a
 * sanity note only — it never blocks and is not the headline number.
 *
 * Run (deterministic baseline — the regression gate):
 *   npx ts-node --transpile-only -r ./scripts/_register-paths.js \
 *     --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' \
 *     scripts/eval-category-suggestions.ts
 */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

// Deterministic baseline: kill the AI rerank before any prisma-backed module
// loads. suggestCategories.aiRerank() short-circuits when the key is absent.
const RUN_AI = process.env.EVAL_AI === "1";
const AI_SAMPLE = 20;
const savedKey = process.env.OPENROUTER_API_KEY;
const savedModel = process.env.OPENROUTER_MODEL;
delete process.env.OPENROUTER_API_KEY;
delete process.env.OPENROUTER_MODEL;

// Hedge threshold for the ambiguity gate: matches the request-side confidence
// floor the pipeline itself treats as "weak" (top.score < 4 → ~0.3..0.55 band
// via confidenceFor). 0.6 sits just above that band, so a low-evidence pick
// counts as a hedge even without a clarificationQuestion.
const HEDGE_CONF_THRESHOLD = 0.6;

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fold } from "../src/lib/routing/multi-routing-v4";

interface GoldenRecord {
  request_id: number;
  title: string;
  description: string;
  status: string;
  is_active: number;
  gold_primary_category?: string;
  gold_secondary_categories?: string[];
  gold_is_ambiguous?: boolean;
  labeled?: boolean;
}

const EVAL_PATH = path.join(
  __dirname,
  "..",
  "data",
  "routing",
  "eval",
  "golden_eval_300_labeled.jsonl",
);

function readGolden(): GoldenRecord[] {
  const lines = fs
    .readFileSync(EVAL_PATH, "utf8")
    .split("\n")
    .filter((l) => l.trim());
  return lines.map((l) => JSON.parse(l) as GoldenRecord);
}

function foldedSet(names: string[]): Set<string> {
  return new Set(names.map((n) => fold(n)).filter((n) => n.length > 0));
}

function pct(n: number, d: number): string {
  return d === 0 ? "n/a" : `${((100 * n) / d).toFixed(1)}%`;
}

function f1(p: number, r: number): number {
  return p + r === 0 ? 0 : (2 * p * r) / (p + r);
}

type SuggestFn = typeof import("../src/lib/category-suggestions").suggestCategories;
type SuggestResult = Awaited<ReturnType<SuggestFn>>;

async function loadLiveCategoryNames(): Promise<Set<string>> {
  const { prisma } = await import("../src/lib/prisma");
  const { SERVICE_CATEGORY_WHERE } = await import("../src/lib/service-categories");
  const rows = await prisma.category.findMany({
    where: SERVICE_CATEGORY_WHERE,
    select: { name: true },
  });
  return foldedSet(rows.map((r) => r.name));
}

async function main() {
  const records = readGolden().filter((r) => r.labeled !== false);
  assert.ok(
    records.length >= 250,
    `expected the 300-record golden set, got ${records.length}`,
  );

  // Neutralize the per-call audit INSERT (recordAiRun -> prisma.aiRun.create).
  // SELECT-only safety: the harness must not write 254+ rows into the live
  // audit log. We share the same prisma singleton the suggester imports.
  const { prisma } = await import("../src/lib/prisma");
  let auditWritesSuppressed = 0;
  (prisma as unknown as { aiRun: { create: (...a: unknown[]) => Promise<unknown> } }).aiRun.create =
    async () => {
      auditWritesSuppressed += 1;
      return { id: "noop" };
    };

  const { suggestCategories } = await import("../src/lib/category-suggestions");

  // Recall ceiling — which gold_primary names exist as live category names.
  const liveNames = await loadLiveCategoryNames();
  let resolvableGoldPrimary = 0;
  let goldPrimaryDenom = 0;
  const unresolvable: string[] = [];
  const seenUnresolvable = new Set<string>();
  for (const rec of records) {
    if (!rec.gold_primary_category) continue;
    goldPrimaryDenom += 1;
    const folded = fold(rec.gold_primary_category);
    if (liveNames.has(folded)) {
      resolvableGoldPrimary += 1;
    } else if (!seenUnresolvable.has(folded)) {
      seenUnresolvable.add(folded);
      unresolvable.push(rec.gold_primary_category);
    }
  }

  // Sanity: a plain query must return non-empty suggestions (DB connected).
  const sanity = await suggestCategories({
    mode: "request",
    text: "Reikia pakeisti maišytuvą vonioje, laša vanduo",
    title: "Santechnikos darbai",
    limit: 5,
  });
  assert.ok(
    sanity.suggestions.length > 0,
    "sanity query returned no suggestions — DB likely unreachable",
  );

  let p1Num = 0;
  let p1Denom = 0; // records with gold_primary
  let r3Num = 0;

  // multi-need micro counters
  let microTP = 0;
  let microFP = 0;
  let microFN = 0;
  let multiDenom = 0; // records with any gold label

  // ambiguity gate
  let ambigTotal = 0;
  let ambigHedged = 0;
  let nonAmbigTotal = 0;
  let nonAmbigHedged = 0;

  const failExamples: string[] = [];

  function hedged(res: SuggestResult): boolean {
    if (res.clarificationQuestion && res.clarificationQuestion.length > 0) return true;
    const top = res.suggestions[0];
    if (!top) return true; // no suggestion at all is the strongest hedge
    return top.confidence < HEDGE_CONF_THRESHOLD;
  }

  for (const rec of records) {
    const res = await suggestCategories({
      mode: "request",
      text: rec.description ?? "",
      title: rec.title,
      limit: 5,
    });
    const predNames = res.suggestions.map((s) => s.name);
    const predSet = foldedSet(predNames);
    const top3 = foldedSet(predNames.slice(0, 3));

    if (rec.gold_primary_category) {
      p1Denom += 1;
      const goldP = fold(rec.gold_primary_category);
      const topFold = predNames[0] ? fold(predNames[0]) : "";
      if (topFold === goldP) p1Num += 1;
      else if (failExamples.length < 12 && liveNames.has(goldP)) {
        // only surface failures where the gold IS reachable (a real miss, not
        // an unlabelable-in-taxonomy case)
        failExamples.push(
          `req ${rec.request_id} | "${(rec.title ?? "").slice(0, 60)}" → top="${predNames[0] ?? "(none)"}" vs gold="${rec.gold_primary_category}"`,
        );
      }
      if (top3.has(goldP)) r3Num += 1;
    }

    // multi-need F1
    const goldSet = foldedSet([
      ...(rec.gold_primary_category ? [rec.gold_primary_category] : []),
      ...(rec.gold_secondary_categories ?? []),
    ]);
    if (goldSet.size > 0) {
      multiDenom += 1;
      for (const x of predSet) (goldSet.has(x) ? (microTP += 1) : (microFP += 1));
      for (const g of goldSet) if (!predSet.has(g)) microFN += 1;
    }

    // ambiguity gate
    const isHedge = hedged(res);
    if (rec.gold_is_ambiguous) {
      ambigTotal += 1;
      if (isHedge) ambigHedged += 1;
    } else {
      nonAmbigTotal += 1;
      if (isHedge) nonAmbigHedged += 1;
    }
  }

  const microP = microTP / Math.max(microTP + microFP, 1);
  const microR = microTP / Math.max(microTP + microFN, 1);
  const microF1 = f1(microP, microR);

  // Optional AI sanity pass on a small sample (precision@1 only).
  let aiNote = "AI variant: not run (set EVAL_AI=1 to sanity-sample).";
  if (RUN_AI && savedKey) {
    process.env.OPENROUTER_API_KEY = savedKey;
    if (savedModel) process.env.OPENROUTER_MODEL = savedModel;
    const sample = records
      .filter((r) => r.gold_primary_category)
      .slice(0, AI_SAMPLE);
    let aiP1 = 0;
    for (const rec of sample) {
      const res = await suggestCategories({
        mode: "request",
        text: rec.description ?? "",
        title: rec.title,
        limit: 5,
      });
      const topFold = res.suggestions[0] ? fold(res.suggestions[0].name) : "";
      if (topFold === fold(rec.gold_primary_category!)) aiP1 += 1;
    }
    aiNote = `AI variant (n=${sample.length}, model=${savedModel || "default"}): precision@1 ${pct(aiP1, sample.length)} (deterministic on same slice not separately computed — see headline).`;
  }

  const baseline = {
    generatedAt: new Date().toISOString(),
    mode: "request",
    aiRerank: "disabled (deterministic Stage-1)",
    hedgeConfThreshold: HEDGE_CONF_THRESHOLD,
    records: records.length,
    precisionAt1: { num: p1Num, denom: p1Denom, value: p1Denom ? p1Num / p1Denom : 0 },
    recallAt3: { num: r3Num, denom: p1Denom, value: p1Denom ? r3Num / p1Denom : 0 },
    multiNeed: {
      denom: multiDenom,
      tp: microTP,
      fp: microFP,
      fn: microFN,
      microPrecision: microP,
      microRecall: microR,
      microF1,
    },
    ambiguityGate: {
      recall: { num: ambigHedged, denom: ambigTotal, value: ambigTotal ? ambigHedged / ambigTotal : 0 },
      falseAlarm: {
        num: nonAmbigHedged,
        denom: nonAmbigTotal,
        value: nonAmbigTotal ? nonAmbigHedged / nonAmbigTotal : 0,
      },
    },
    recallCeiling: {
      resolvableGoldPrimary,
      goldPrimaryDenom,
      value: goldPrimaryDenom ? resolvableGoldPrimary / goldPrimaryDenom : 0,
      unresolvableUniqueNames: unresolvable.length,
    },
  };

  console.log("──────────────────────────────────────────────────────────");
  console.log("Phase-0 baseline — suggestCategories({ mode: 'request' })");
  console.log(`  AI rerank        : DISABLED (deterministic Stage-1, free + reproducible)`);
  console.log(`  records          : ${records.length}  (audit writes suppressed: ${auditWritesSuppressed})`);
  console.log("");
  console.log("Single-need:");
  console.log(`  precision@1      : ${p1Num}/${p1Denom} (${pct(p1Num, p1Denom)})`);
  console.log(`  recall@3         : ${r3Num}/${p1Denom} (${pct(r3Num, p1Denom)})`);
  console.log("");
  console.log("Multi-need (micro over records with any gold label):");
  console.log(`  records          : ${multiDenom}`);
  console.log(`  precision        : ${(microP * 100).toFixed(1)}%   recall ${(microR * 100).toFixed(1)}%   F1 ${(microF1 * 100).toFixed(1)}%`);
  console.log(`  tp/fp/fn         : ${microTP}/${microFP}/${microFN}`);
  console.log("");
  console.log(`Ambiguity gate (hedge = clarificationQuestion OR top conf < ${HEDGE_CONF_THRESHOLD}):`);
  console.log(`  recall (ambiguous hedged) : ${ambigHedged}/${ambigTotal} (${pct(ambigHedged, ambigTotal)})`);
  console.log(`  false-alarm (non-ambig hedged) : ${nonAmbigHedged}/${nonAmbigTotal} (${pct(nonAmbigHedged, nonAmbigTotal)})`);
  console.log("");
  console.log("Recall ceiling (gold_primary resolvable in live taxonomy):");
  console.log(`  resolvable       : ${resolvableGoldPrimary}/${goldPrimaryDenom} (${pct(resolvableGoldPrimary, goldPrimaryDenom)})`);
  console.log(`  unresolvable uniq names: ${unresolvable.length}`);
  if (unresolvable.length > 0) {
    for (const n of unresolvable.slice(0, 10)) console.log(`    · ${n}`);
    if (unresolvable.length > 10) console.log(`    · … +${unresolvable.length - 10} more`);
  }
  console.log("");
  console.log("Sample precision@1 misses (gold reachable in taxonomy):");
  for (const ex of failExamples.slice(0, 8)) console.log(`    · ${ex}`);
  console.log("");
  console.log(`  ${aiNote}`);
  console.log("──────────────────────────────────────────────────────────");

  const outPath = path.join(__dirname, ".eval-baseline.json");
  fs.writeFileSync(outPath, JSON.stringify(baseline, null, 2) + "\n");
  console.log(`baseline written → ${outPath}`);

  // Disconnect so ts-node exits cleanly.
  await prisma.$disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
