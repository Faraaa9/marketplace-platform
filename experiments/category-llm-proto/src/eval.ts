/**
 * Variant-matrix evaluation. Two modes:
 *  - GOLD-SEG: feed gold phrases (perfect segmentation) -> retrieve -> rerank.
 *    Apples-to-apples vs the prod Phase-A gate (recall@20 74.7%, gold-in-1-2 67.5%).
 *  - FULL: feed raw request -> our segmentation -> retrieve -> rerank, then
 *    set-coverage vs gold + segmentation/retrieval/rerank miss attribution.
 *
 * Writes out/results.json, out/results.md, out/misses.md. All read-only on prod.
 */
import fs from "node:fs";
import path from "node:path";
import { Candidate, denseTopK, embed, flushEmbCache, fold, pool, prisma } from "./clients";
import { rerank, runFull, DEFAULT_DECIDER } from "./pipeline";
import { buildNamesStore, namesTopK } from "./names-store";

const FLASH = "google/gemini-2.5-flash";
const DECIDER = DEFAULT_DECIDER;
const DATA = path.join(__dirname, "../data");
const OUT = path.join(__dirname, "../out");

interface GJob { phrase: string; category: string }
interface GRec { id: number; request: string; jobs: GJob[] }

function loadGolden(file: string): GRec[] {
  const p = path.join(DATA, file);
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
}

type Store = "live" | "names";
interface Config { key: string; store: Store; k: number; fewshot: boolean; model: string; label: string }

const CONFIGS: Config[] = [
  { key: "baseline_prod",   store: "live",  k: 20, fewshot: false, model: FLASH,   label: "PROD baseline (k20, flash, no few-shot)" },
  { key: "live_k20_fs",     store: "live",  k: 20, fewshot: true,  model: DECIDER, label: "k20 + few-shot + strong" },
  { key: "live_k50_nofs",   store: "live",  k: 50, fewshot: false, model: DECIDER, label: "k50, no few-shot, strong" },
  { key: "live_k50_fs",     store: "live",  k: 50, fewshot: true,  model: DECIDER, label: "k50 + few-shot + strong  (BEST)" },
  { key: "live_k50_fs_fl",  store: "live",  k: 50, fewshot: true,  model: FLASH,   label: "k50 + few-shot, FLASH (model delta)" },
  { key: "names_k50_fs",    store: "names", k: 50, fewshot: true,  model: DECIDER, label: "k50 + few-shot, NAMES-ONLY store" },
];

const THRESHOLDS = [0.9, 0.8];

interface JobRec {
  reqId: number; phrase: string; gold: string;
  cands: string[];            // folded candidate names at this config's k
  picks: { category: string; confidence: number }[];
  recall: boolean; auto1: boolean; in12: boolean;
  miss: "" | "retrieval" | "rerank";
}

async function goldSeg(golden: GRec[]) {
  // global job index + per-job gold-phrase candidates from both stores @50
  const flat: { reqIdx: number; jobIdx: number; phrase: string; gold: string }[] = [];
  golden.forEach((r, ri) => r.jobs.forEach((j, ji) => flat.push({ reqIdx: ri, jobIdx: ji, phrase: j.phrase, gold: j.category })));

  console.log(`GOLD-SEG: ${golden.length} requests / ${flat.length} jobs. Embedding + retrieving @50 (live + names)...`);
  const vecs = await embed(flat.map((f) => f.phrase));
  const liveCands: Candidate[][] = await pool(vecs, 6, (v) => denseTopK(v, 50));
  await buildNamesStore();
  const namesCands: Candidate[][] = vecs.map((v) => namesTopK(v, 50));
  const candsByStore: Record<Store, Candidate[][]> = { live: liveCands, names: namesCands };

  const results: Record<string, { metrics: Record<string, number>; jobs: JobRec[] }> = {};

  for (const cfg of CONFIGS) {
    const store = candsByStore[cfg.store];
    // rerank per request (group jobs of the same request into one call, like prod)
    const byReq = new Map<number, number[]>();
    flat.forEach((f, gi) => { const a = byReq.get(f.reqIdx) ?? []; a.push(gi); byReq.set(f.reqIdx, a); });

    const jobRecs: JobRec[] = new Array(flat.length);
    await pool([...byReq.entries()], 5, async ([reqIdx, gis]) => {
      const jobs = gis.map((gi) => ({ phrase: flat[gi].phrase, candidates: store[gi].slice(0, cfg.k).map((c) => c.name) }));
      const picks = await rerank(jobs, { model: cfg.model, fewshot: cfg.fewshot });
      gis.forEach((gi, local) => {
        const g = fold(flat[gi].gold);
        const cands = store[gi].slice(0, cfg.k).map((c) => fold(c.name));
        const p = picks[local] ?? [];
        const pickFold = p.map((x) => fold(x.category));
        const recall = cands.includes(g);
        const auto1 = pickFold[0] === g;
        const in12 = pickFold.includes(g);
        jobRecs[gi] = {
          reqId: golden[reqIdx].id, phrase: flat[gi].phrase, gold: flat[gi].gold,
          cands, picks: p, recall, auto1, in12,
          miss: in12 ? "" : recall ? "rerank" : "retrieval",
        };
      });
    });

    const n = jobRecs.length;
    const m: Record<string, number> = {
      jobs: n,
      recall_at_k: +(100 * jobRecs.filter((j) => j.recall).length / n).toFixed(1),
      auto_at_1: +(100 * jobRecs.filter((j) => j.auto1).length / n).toFixed(1),
      gold_in_1_2: +(100 * jobRecs.filter((j) => j.in12).length / n).toFixed(1),
      miss_retrieval: jobRecs.filter((j) => j.miss === "retrieval").length,
      miss_rerank: jobRecs.filter((j) => j.miss === "rerank").length,
    };
    // all-jobs-correct@1 per request
    const reqIds = [...new Set(jobRecs.map((j) => j.reqId))];
    const allCorrect = reqIds.filter((id) => jobRecs.filter((j) => j.reqId === id).every((j) => j.auto1)).length;
    m.all_jobs_correct_pct = +(100 * allCorrect / reqIds.length).toFixed(1);
    // confidence buckets on top-1
    for (const thr of THRESHOLDS) {
      const hi = jobRecs.filter((j) => (j.picks[0]?.confidence ?? 0) >= thr);
      const hiCorrect = hi.filter((j) => j.auto1).length;
      m[`auto_cov_${thr}`] = +(100 * hi.length / n).toFixed(1);                    // % jobs the LLM is confident on
      m[`auto_prec_${thr}`] = hi.length ? +(100 * hiCorrect / hi.length).toFixed(1) : 0; // accuracy within that bucket
      m[`auto_yield_${thr}`] = +(100 * hiCorrect / n).toFixed(1);                  // % of ALL jobs safely auto + correct
    }
    results[cfg.key] = { metrics: m, jobs: jobRecs };
    console.log(`  ${cfg.key.padEnd(16)} recall@${cfg.k}=${m.recall_at_k}  auto@1=${m.auto_at_1}  in1-2=${m.gold_in_1_2}  allCorrect=${m.all_jobs_correct_pct}%`);
  }
  return results;
}

interface FullRec {
  reqId: number; request: string;
  gold: string[];                  // gold category names (folded)
  predTop1: string[]; predAll: string[];
  segs: { phrase: string; draft: string; top1?: string; conf: number }[];
  perGold: { gold: string; coveredTop1: boolean; coveredAll: boolean; miss: "" | "retrieval" | "segmentation" | "rerank" }[];
}

async function fullMode(golden: GRec[], goldSegLive: JobRec[], tag: string): Promise<{ recs: FullRec[]; metrics: Record<string, number> }> {
  console.log(`FULL (${tag}): ${golden.length} requests through full pipeline (k50 + few-shot + strong)...`);
  // gold-phrase retrievability @50 (live), keyed by folded gold name per request
  const retrievable = new Map<string, Set<string>>(); // reqId -> set of folded gold names that ARE retrievable from their own phrase
  for (const jr of goldSegLive) {
    const s = retrievable.get(String(jr.reqId)) ?? new Set<string>();
    if (jr.recall) s.add(fold(jr.gold));
    retrievable.set(String(jr.reqId), s);
  }

  const recsRaw: (FullRec | null)[] = await pool(golden, 4, async (r) => {
   try {
    // FULL runs on FLASH: GOLD-SEG showed flash == sonnet on rerank, and it keeps
    // the end-to-end pass cheap. Swap to DECIDER via PROTO_DECIDER_MODEL if wanted.
    const jobs = await runFull(r.request, { k: 50, fewshot: true, model: FLASH });
    const predTop1 = jobs.map((j) => j.picks[0]).filter(Boolean).map((p) => fold(p.category));
    const predAll = jobs.flatMap((j) => j.picks.map((p) => fold(p.category)));
    const myCandFold = new Set(jobs.flatMap((j) => j.candidates.map((c) => fold(c.name))));
    const gold = r.jobs.map((j) => fold(j.category));
    const retr = retrievable.get(String(r.id)) ?? new Set<string>();
    const perGold = r.jobs.map((j) => {
      const g = fold(j.category);
      const coveredTop1 = predTop1.includes(g);
      const coveredAll = predAll.includes(g);
      let miss: FullRec["perGold"][number]["miss"] = "";
      if (!coveredTop1) {
        if (!retr.has(g)) miss = "retrieval";        // not even retrievable from its own gold phrase
        else if (!myCandFold.has(g)) miss = "segmentation"; // retrievable, but our segments never surfaced it
        else miss = "rerank";                         // in our candidates, not picked top-1
      }
      return { gold: j.category, coveredTop1, coveredAll, miss };
    });
    return {
      reqId: r.id, request: r.request, gold,
      predTop1, predAll,
      segs: jobs.map((j) => ({ phrase: j.phrase, draft: j.draft, top1: j.picks[0] ? j.picks[0].category : undefined, conf: j.picks[0]?.confidence ?? 0 })),
      perGold,
    };
   } catch (e) {
    console.log(`  ! dropped req ${r.id}: ${(e as Error).message}`);
    return null;
   }
  });
  const recs: FullRec[] = recsRaw.filter((r): r is FullRec => r !== null);
  if (recs.length < golden.length) console.log(`  (${golden.length - recs.length} requests dropped from metrics)`);

  const allGold = recs.flatMap((r) => r.perGold);
  const ng = allGold.length;
  const allCorrect = recs.filter((r) => r.perGold.every((g) => g.coveredTop1)).length;
  const metrics: Record<string, number> = {
    requests: recs.length, gold_jobs: ng,
    covered_top1: +(100 * allGold.filter((g) => g.coveredTop1).length / ng).toFixed(1),
    covered_in_1_2: +(100 * allGold.filter((g) => g.coveredAll).length / ng).toFixed(1),
    all_jobs_correct_pct: +(100 * allCorrect / recs.length).toFixed(1),
    miss_retrieval: allGold.filter((g) => g.miss === "retrieval").length,
    miss_segmentation: allGold.filter((g) => g.miss === "segmentation").length,
    miss_rerank: allGold.filter((g) => g.miss === "rerank").length,
  };
  for (const thr of THRESHOLDS) {
    const hiHits = recs.flatMap((r) => r.segs).filter((s) => s.conf >= thr);
    const hiCorrect = recs.flatMap((r) => r.perGold.filter((g) => g.coveredTop1)).length; // proxy below
    // auto over gold jobs: gold covered by a top1 pick whose conf>=thr
    let autoYield = 0;
    for (const r of recs) {
      const hiTop1 = new Set(r.segs.filter((s) => s.conf >= thr && s.top1).map((s) => fold(s.top1!)));
      autoYield += r.perGold.filter((g) => hiTop1.has(fold(g.gold))).length;
    }
    metrics[`auto_cov_${thr}`] = +(100 * hiHits.length / recs.flatMap((r) => r.segs).length).toFixed(1);
    metrics[`auto_yield_${thr}`] = +(100 * autoYield / ng).toFixed(1);
    void hiCorrect;
  }
  console.log(`  covered@1=${metrics.covered_top1}  in1-2=${metrics.covered_in_1_2}  allCorrect=${metrics.all_jobs_correct_pct}%  misses seg/retr/rerank=${metrics.miss_segmentation}/${metrics.miss_retrieval}/${metrics.miss_rerank}`);
  return { recs, metrics };
}

function mdTable(results: Record<string, { metrics: Record<string, number> }>): string {
  const rows = CONFIGS.map((c) => {
    const m = results[c.key].metrics;
    return `| ${c.label} | ${m.recall_at_k}% | ${m.auto_at_1}% | ${m.gold_in_1_2}% | ${m.all_jobs_correct_pct}% | ${m["auto_cov_0.9"]}% / ${m["auto_prec_0.9"]}% | ${m["auto_yield_0.9"]}% |`;
  });
  return [
    "| config | recall@k | auto@1 | gold-in-1-2 | all-jobs✓ | conf≥.9 cov/prec | safe-auto yield |",
    "|---|---|---|---|---|---|---|",
    ...rows,
  ].join("\n");
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const golden = loadGolden("multilabel_golden.jsonl");
  const hard = loadGolden("hard_queries.jsonl");

  const gs = await goldSeg(golden);
  const best = gs["live_k50_fs"];
  const full = await fullMode(golden, best.jobs, "golden");
  const fullHard = hard.length ? await fullMode(hard, [], "hard-queries") : null;

  // ---- write outputs ----
  const out = {
    decider: DECIDER,
    gold_seg: Object.fromEntries(Object.entries(gs).map(([k, v]) => [k, v.metrics])),
    full_golden: full.metrics,
    full_hard: fullHard?.metrics ?? null,
  };
  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(out, null, 2));

  const md: string[] = [];
  md.push(`# Category LLM prototype — results\n`);
  md.push(`Decider model: \`${DECIDER}\`. Embeddings: \`text-embedding-3-large@1536\` (same as live table). Golden: ${golden.length} req / ${best.jobs.length} jobs.\n`);
  md.push(`## GOLD-SEG (perfect segmentation — apples-to-apples vs prod gate 74.7% / 67.5%)\n`);
  md.push(mdTable(gs));
  md.push(`\n_recall@k = gold among candidates; auto@1 = top pick correct, no user; gold-in-1-2 = gold among ≤2 picks; all-jobs✓ = every job in the request correct@1; conf≥.9 cov/prec = share of jobs the model is ≥0.9 sure on / accuracy within that bucket; safe-auto yield = share of ALL jobs that are both ≥0.9-confident AND correct._\n`);
  md.push(`\n## FULL pipeline (our own segmentation), golden\n`);
  md.push("```json\n" + JSON.stringify(full.metrics, null, 2) + "\n```\n");
  if (fullHard) {
    md.push(`## FULL pipeline, ${hard.length} hard colloquial queries\n`);
    md.push("```json\n" + JSON.stringify(fullHard.metrics, null, 2) + "\n```\n");
  }
  fs.writeFileSync(path.join(OUT, "results.md"), md.join("\n"));

  // ---- misses dump ----
  const miss: string[] = [];
  miss.push(`# Misses dump\n\n## GOLD-SEG best (live_k50_fs)\n`);
  for (const j of best.jobs.filter((x) => !x.in12)) {
    miss.push(`- [${j.miss}] req ${j.reqId} "${j.phrase}" → gold **${j.gold}**\n  picks: ${j.picks.map((p) => `${p.category}[${p.confidence}]`).join(" | ") || "(none)"}\n  cand(top8): ${j.cands.slice(0, 8).join("; ")}`);
  }
  miss.push(`\n## FULL golden misses\n`);
  for (const r of full.recs) {
    const ms = r.perGold.filter((g) => !g.coveredTop1);
    if (!ms.length) continue;
    miss.push(`- req ${r.reqId} "${r.request}"\n  my segs: ${r.segs.map((s) => `${s.phrase}→${s.top1 ?? "∅"}[${s.conf}]`).join(" | ")}\n  missed: ${ms.map((g) => `${g.gold} [${g.miss}]`).join("; ")}`);
  }
  if (fullHard) {
    miss.push(`\n## FULL hard-queries detail\n`);
    for (const r of fullHard.recs) {
      miss.push(`- req ${r.reqId} "${r.request}"\n  segs: ${r.segs.map((s) => `${s.phrase}→${s.top1 ?? "∅"}[${s.conf}]`).join(" | ")}\n  gold: ${r.gold.join("; ")} | covered@1: ${r.perGold.filter((g) => g.coveredTop1).length}/${r.perGold.length}`);
    }
  }
  fs.writeFileSync(path.join(OUT, "misses.md"), miss.join("\n"));

  flushEmbCache();
  await prisma.$disconnect();
  console.log(`\nWrote out/results.json, out/results.md, out/misses.md`);
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
