/**
 * OFFLINE isotonic calibration fitter for category-suggestion confidence.
 *
 * Replays suggestCategories({mode:"request"}) over golden_eval_300_labeled.jsonl
 * with CATEGORY_CALIB_RAW=1 (so suggestions[0].confidence == the raw margin),
 * collects (margin, was_top1_correct) pairs, fits a monotonic non-decreasing
 * map margin -> P(correct) via pool-adjacent-violators (PAV), and prints a
 * compact piecewise-constant BREAKPOINTS table to paste into
 * src/lib/category-confidence-calibration.ts.
 *
 * Also reports how ambiguous vs non-ambiguous gold records distribute across
 * the calibrated confidence, to pick the CLARIFY threshold.
 *
 * DETERMINISTIC + SELECT-only: AI rerank disabled, audit writes stubbed.
 *
 * Run:
 *   CATEGORY_CALIB_RAW=1 npx ts-node --transpile-only -r ./scripts/_register-paths.js \
 *     --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' \
 *     scripts/fit-confidence-calibration.ts
 */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

delete process.env.OPENROUTER_API_KEY;
delete process.env.OPENROUTER_MODEL;
process.env.CATEGORY_CALIB_RAW = "1";

import fs from "node:fs";
import path from "node:path";
import { fold } from "../src/lib/routing/multi-routing-v4";

interface GoldenRecord {
  request_id: number;
  title: string;
  description: string;
  gold_primary_category?: string;
  gold_is_ambiguous?: boolean;
  labeled?: boolean;
}

const EVAL_PATH = path.join(__dirname, "..", "data", "routing", "eval", "golden_eval_300_labeled.jsonl");

function readGolden(): GoldenRecord[] {
  return fs.readFileSync(EVAL_PATH, "utf8").split("\n").filter((l) => l.trim())
    .map((l) => JSON.parse(l) as GoldenRecord)
    .filter((r) => r.labeled !== false);
}

/** Pool-Adjacent-Violators: returns fitted ŷ (monotone non-decreasing) for
 *  points already sorted by x ascending. Weights default 1. */
function pav(points: Array<{ x: number; y: number }>): Array<{ x: number; yhat: number }> {
  // blocks: {sum, w, yhat, xs[]}
  type Block = { sum: number; w: number; yhat: number; xmin: number };
  const blocks: Block[] = [];
  for (const p of points) {
    let b: Block = { sum: p.y, w: 1, yhat: p.y, xmin: p.x };
    blocks.push(b);
    // merge while previous block mean > current (violates non-decreasing)
    while (blocks.length >= 2 && blocks[blocks.length - 2].yhat > blocks[blocks.length - 1].yhat) {
      const cur = blocks.pop()!;
      const prev = blocks.pop()!;
      const merged: Block = {
        sum: prev.sum + cur.sum,
        w: prev.w + cur.w,
        yhat: (prev.sum + cur.sum) / (prev.w + cur.w),
        xmin: prev.xmin,
      };
      blocks.push(merged);
    }
  }
  // expand back to per-point yhat
  const out: Array<{ x: number; yhat: number }> = [];
  let bi = 0;
  let consumed = 0;
  // rebuild block sizes by scanning points again with the merged structure:
  // easier: assign by matching xmin boundaries
  // Build block list with cumulative widths
  const widths = blocks.map((b) => b.w);
  let idx = 0;
  for (let k = 0; k < blocks.length; k++) {
    for (let j = 0; j < widths[k]; j++) {
      out.push({ x: points[idx].x, yhat: blocks[k].yhat });
      idx++;
    }
  }
  void bi; void consumed;
  return out;
}

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  (prisma as unknown as { aiRun: { create: (...a: unknown[]) => Promise<unknown> } }).aiRun.create =
    async () => ({ id: "noop" });
  const { suggestCategories } = await import("../src/lib/category-suggestions");

  const records = readGolden();
  const pairs: Array<{ margin: number; correct: number; ambiguous: boolean }> = [];

  for (const rec of records) {
    if (!rec.gold_primary_category) continue;
    const res = await suggestCategories({
      mode: "request",
      text: rec.description ?? "",
      title: rec.title,
      limit: 5,
    });
    const top = res.suggestions[0];
    const margin = top ? top.confidence : 0; // CATEGORY_CALIB_RAW makes this the raw margin
    const correct = top && fold(top.name) === fold(rec.gold_primary_category) ? 1 : 0;
    pairs.push({ margin, correct, ambiguous: Boolean(rec.gold_is_ambiguous) });
  }

  console.log(`collected ${pairs.length} (margin, correct) pairs`);

  // Sort by margin asc, fit PAV
  const sorted = [...pairs].sort((a, b) => a.margin - b.margin);
  const fitted = pav(sorted.map((p) => ({ x: p.margin, y: p.correct })));

  // Compress fitted step function into breakpoints: a new breakpoint each time
  // yhat changes. Breakpoint.m = the margin at which that yhat level begins.
  const bps: Array<{ m: number; p: number }> = [];
  let lastP = -1;
  for (const f of fitted) {
    const pRounded = Math.round(f.yhat * 1000) / 1000;
    if (pRounded !== lastP) {
      bps.push({ m: Math.round(f.x * 1000) / 1000, p: pRounded });
      lastP = pRounded;
    }
  }
  // ensure starts at m=0
  if (bps.length === 0 || bps[0].m > 0) bps.unshift({ m: 0, p: bps[0]?.p ?? 0 });

  console.log("\n// fitted BREAKPOINTS (paste into category-confidence-calibration.ts):");
  console.log("export const BREAKPOINTS: CalibrationPoint[] = [");
  for (const b of bps) console.log(`  { m: ${b.m}, p: ${b.p} },`);
  console.log("];");

  // Apply fitted table to compute calibrated conf for each pair, then report
  // distribution of ambiguous vs non-ambiguous by calibrated confidence band.
  function calib(m: number): number {
    let p = bps[0].p;
    for (const b of bps) { if (m >= b.m) p = b.p; else break; }
    return p;
  }
  const bands = [0, 0.2, 0.3, 0.4, 0.5, 0.6, 0.8, 1.01];
  console.log("\nband(conf)   ambiguous   non-ambiguous   accuracy");
  for (let i = 0; i < bands.length - 1; i++) {
    const lo = bands[i], hi = bands[i + 1];
    const inBand = pairs.filter((p) => { const c = calib(p.margin); return c >= lo && c < hi; });
    const amb = inBand.filter((p) => p.ambiguous).length;
    const namb = inBand.length - amb;
    const acc = inBand.length ? (inBand.filter((p) => p.correct).length / inBand.length) : 0;
    console.log(`  [${lo}-${hi})    ${amb}\t\t${namb}\t\t${(acc * 100).toFixed(0)}%`);
  }

  // For a few candidate CLARIFY cuts, show ambiguity recall vs false-alarm (hedge = conf < cut)
  const ambTotal = pairs.filter((p) => p.ambiguous).length;
  const nambTotal = pairs.length - ambTotal;
  console.log(`\nCLARIFY-cut sweep (hedge = calibrated conf < cut):  ambiguous=${ambTotal} non-ambig=${nambTotal}`);
  for (const cut of [0.2, 0.3, 0.4, 0.5, 0.6]) {
    const ambHedged = pairs.filter((p) => p.ambiguous && calib(p.margin) < cut).length;
    const nambHedged = pairs.filter((p) => !p.ambiguous && calib(p.margin) < cut).length;
    console.log(`  cut ${cut}:  amb-recall ${ambHedged}/${ambTotal} (${(100 * ambHedged / ambTotal).toFixed(0)}%)   false-alarm ${nambHedged}/${nambTotal} (${(100 * nambHedged / nambTotal).toFixed(0)}%)`);
  }

  await prisma.$disconnect();
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
