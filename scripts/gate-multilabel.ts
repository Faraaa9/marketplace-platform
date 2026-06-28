/**
 * Phase A end-to-end gate on the REAL prod pipeline (pgvector + LLM rerank).
 * Runs the 36-req/83-job multi-label golden through: embed -> denseTopK(20) from
 * category_embedding -> LLM rerank pick 1-2. Reports retrieval recall@20 and
 * gold-in-1-2, to compare with the offline demo numbers (74.7% / 67.5%).
 */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { embedTexts, denseTopK } from "../src/lib/category-dense";
import { rerankJobs } from "../src/lib/category-rerank";

const DIA: Record<string, string> = { ą:"a", č:"c", ę:"e", ė:"e", į:"i", š:"s", ų:"u", ū:"u", ž:"z" };
const fold = (s: string) => (s || "").trim().toLowerCase().replace(/[ąčęėįšųūž]/g, (c) => DIA[c] ?? c);

interface Job { phrase: string; category: string }
interface Rec { jobs: Job[] }

async function main() {
  const recs: Rec[] = fs
    .readFileSync(path.join(__dirname, "multilabel_golden.jsonl"), "utf8")
    .split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));

  // verify backfill coverage
  const [{ count }] = await prisma.$queryRaw<{ count: bigint }[]>`select count(*)::bigint as count from category_embedding`;
  console.log(`category_embedding rows: ${count}`);

  const flatPhrases: string[] = [];
  const idx: number[][] = [];
  for (const r of recs) { idx.push(r.jobs.map((j) => { flatPhrases.push(j.phrase); return flatPhrases.length - 1; })); }

  console.log(`embedding ${flatPhrases.length} job phrases + pgvector topK...`);
  const vecs = await embedTexts(flatPhrases);
  const top20: string[][] = [];        // folded candidate names per job
  const top20names: string[][] = [];   // raw names (for rerank input)
  for (const v of vecs) {
    const cands = await denseTopK(v, 20);
    top20.push(cands.map((c) => fold(c.name)));
    top20names.push(cands.map((c) => c.name));
  }

  // retrieval recall@20
  let r20 = 0, tot = 0;
  for (let ri = 0; ri < recs.length; ri++) {
    for (let jl = 0; jl < recs[ri].jobs.length; jl++) {
      tot++;
      const g = fold(recs[ri].jobs[jl].category);
      if (top20[idx[ri][jl]].includes(g)) r20++;
    }
  }

  // LLM rerank per request -> gold in 1-2
  let inPick = 0;
  for (let ri = 0; ri < recs.length; ri++) {
    const jobs = recs[ri].jobs.map((j, jl) => ({ phrase: j.phrase, candidates: top20names[idx[ri][jl]] }));
    const picks = await rerankJobs(jobs);
    for (let jl = 0; jl < recs[ri].jobs.length; jl++) {
      const g = fold(recs[ri].jobs[jl].category);
      const chosen = (picks[jl] || []).map(fold);
      if (chosen.includes(g)) inPick++;
    }
  }

  console.log("\n==================== PHASE A GATE (REAL prod pgvector) ====================");
  console.log(`jobs: ${tot}   categories in pgvector: ${count}`);
  console.log(`retrieval recall@20  : ${r20}/${tot} (${(100 * r20 / tot).toFixed(1)}%)   [offline demo: 74.7%]`);
  console.log(`gold-in-1-2 (rerank) : ${inPick}/${tot} (${(100 * inPick / tot).toFixed(1)}%)   [offline demo: 67.5%]`);
  console.log("==========================================================================");
  await prisma.$disconnect();
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
