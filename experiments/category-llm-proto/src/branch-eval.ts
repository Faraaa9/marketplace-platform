/**
 * Branch-level recall: instead of "is the leaf correct", measure top-1 recall at
 * three taxonomy levels — root-branch (depth 0, e.g. "Statybos"), 2nd-level branch
 * (depth 1, e.g. "Elektros darbai") and the leaf (depth 2, current metric).
 * Question: is branch hit dramatically higher than leaf? -> hierarchical UX.
 * Read-only. GOLD-SEG (83 gold-phrase jobs) + FULL (15 colloquial). Model = flash
 * (matches the live v2 demo). Writes out/branch-eval.md + out/branch-eval.json.
 */
import fs from "node:fs";
import path from "node:path";
import { Candidate, denseTopK, embed, fold, pool, prisma } from "./clients";
import { rerank, runFull, type FullJob } from "./pipeline";

const FLASH = "google/gemini-2.5-flash";
const K = 50;
const DATA = path.join(__dirname, "../data");
const OUT = path.join(__dirname, "../out");

interface GJob { phrase: string; category: string }
interface GRec { id: number; request: string; jobs: GJob[] }
const load = (f: string): GRec[] =>
  fs.existsSync(path.join(DATA, f))
    ? fs.readFileSync(path.join(DATA, f), "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l))
    : [];

interface Cat { id: string; name: string; depth: number; parentId: string | null; rootId: string | null }

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const cats = await prisma.$queryRawUnsafe<Cat[]>(
    `select id, name, depth, "parentId", "rootId" from categories`,
  );
  const byId = new Map(cats.map((c) => [c.id, c])); // ALL cats (for ancestor walk)
  // gold names must resolve in the SAME universe as predictions (embedded leaves),
  // otherwise a duplicate name maps to a different id and ids never match.
  const embCats = await prisma.$queryRawUnsafe<{ id: string; name: string }[]>(
    `select c.id, c.name from category_embedding e join categories c on c.id = e.category_id`,
  );
  const idByName = new Map<string, string>();
  for (const c of embCats) { const f = fold(c.name); if (!idByName.has(f)) idByName.set(f, c.id); }

  const root = (id: string | null): string | null => (id ? byId.get(id)?.rootId ?? null : null);
  const level1 = (id: string | null): string | null => {
    if (!id) return null;
    const c = byId.get(id);
    if (!c) return null;
    return c.depth <= 1 ? c.id : c.parentId; // depth-1 ancestor
  };
  const candId = (cands: Candidate[], name: string): string | null =>
    cands.find((c) => fold(c.name) === fold(name))?.categoryId ?? null;

  // ---- score a list of (predictedTop1Id, goldId) pairs at 3 levels ----
  function score(pairs: { pred: string | null; gold: string | null }[]) {
    const resolvable = pairs.filter((p) => p.gold);
    const n = resolvable.length;
    const leaf = resolvable.filter((p) => p.pred && p.pred === p.gold).length;
    const lvl2 = resolvable.filter((p) => p.pred && level1(p.pred) && level1(p.pred) === level1(p.gold)).length;
    const rt = resolvable.filter((p) => p.pred && root(p.pred) && root(p.pred) === root(p.gold)).length;
    const pct = (x: number) => +(100 * x / n).toFixed(1);
    return { n, leaf: pct(leaf), lvl2: pct(lvl2), root: pct(rt) };
  }

  // ===== GOLD-SEG: 83 gold-phrase jobs (1:1) =====
  const golden = load("multilabel_golden.jsonl");
  const flat: { reqIdx: number; phrase: string; gold: string }[] = [];
  golden.forEach((r, ri) => r.jobs.forEach((j) => flat.push({ reqIdx: ri, phrase: j.phrase, gold: j.category })));
  console.log(`GOLD-SEG ${flat.length} jobs: embed + denseTopK@${K} + rerank (flash)...`);
  const vecs = await embed(flat.map((f) => f.phrase));
  const cands: Candidate[][] = await pool(vecs, 6, (v) => denseTopK(v, K));
  const byReq = new Map<number, number[]>();
  flat.forEach((f, gi) => { const a = byReq.get(f.reqIdx) ?? []; a.push(gi); byReq.set(f.reqIdx, a); });
  const top1: (string | null)[] = new Array(flat.length);
  await pool([...byReq.entries()], 5, async ([, gis]) => {
    const picks = await rerank(gis.map((gi) => ({ phrase: flat[gi].phrase, candidates: cands[gi].map((c) => c.name) })), { model: FLASH, fewshot: true });
    gis.forEach((gi, local) => {
      const p = picks[local]?.[0]?.category;
      top1[gi] = p ? candId(cands[gi], p) : null;
    });
  });
  const goldSegPairs = flat.map((f, gi) => ({ pred: top1[gi], gold: idByName.get(fold(f.gold)) ?? null }));
  const goldSeg = score(goldSegPairs);

  // ===== FULL: 15 colloquial (set coverage per gold job) =====
  const hard = load("hard_queries.jsonl");
  console.log(`FULL ${hard.length} hard queries: runFull (flash)...`);
  const hardRecs = await pool(hard, 4, async (r) => {
    let jobs: FullJob[];
    try { jobs = await runFull(r.request, { k: K, fewshot: true, model: FLASH }); } catch { jobs = []; }
    const predIds = jobs.map((j) => (j.picks[0] ? candId(j.candidates, j.picks[0].category) : null)).filter(Boolean) as string[];
    return { gold: r.jobs.map((j) => idByName.get(fold(j.category)) ?? null), predIds };
  });
  // per gold job: does ANY predicted top-1 match at each level?
  const hardPairs: { pred: string | null; gold: string | null; lvl2: boolean; root: boolean }[] = [];
  for (const rec of hardRecs) {
    const predRoots = new Set(rec.predIds.map((id) => root(id)));
    const predLvl2 = new Set(rec.predIds.map((id) => level1(id)));
    const predLeaf = new Set(rec.predIds);
    for (const g of rec.gold) {
      hardPairs.push({
        pred: g && predLeaf.has(g) ? g : null,           // leaf covered
        gold: g,
        lvl2: !!g && predLvl2.has(level1(g)),
        root: !!g && predRoots.has(root(g)),
      });
    }
  }
  const hn = hardPairs.filter((p) => p.gold).length;
  const hpct = (x: number) => +(100 * x / hn).toFixed(1);
  const hardScore = {
    n: hn,
    leaf: hpct(hardPairs.filter((p) => p.pred).length),
    lvl2: hpct(hardPairs.filter((p) => p.gold && p.lvl2).length),
    root: hpct(hardPairs.filter((p) => p.gold && p.root).length),
  };

  const out = { goldSeg, hard: hardScore };
  fs.writeFileSync(path.join(OUT, "branch-eval.json"), JSON.stringify(out, null, 2));
  const md = [
    `# Branch-level recall (top-1) — root vs 2nd-level vs leaf\n`,
    `Model: flash (live v2). k=${K}. Read-only.\n`,
    `| set | jobs | root-branch | 2nd-level | leaf |`,
    `|---|---|---|---|---|`,
    `| GOLD-SEG (golden) | ${goldSeg.n} | **${goldSeg.root}%** | **${goldSeg.lvl2}%** | ${goldSeg.leaf}% |`,
    `| FULL (colloquial) | ${hardScore.n} | **${hardScore.root}%** | **${hardScore.lvl2}%** | ${hardScore.leaf}% |`,
    `\nroot-branch = depth-0 ancestor (e.g. „Statybos“); 2nd-level = depth-1 (e.g. „Elektros darbai“); leaf = exact category.`,
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "branch-eval.md"), md);

  console.log("\n==== BRANCH RECALL (top-1) ====");
  console.log(`GOLD-SEG (${goldSeg.n}):  root ${goldSeg.root}%  | 2nd-level ${goldSeg.lvl2}%  | leaf ${goldSeg.leaf}%`);
  console.log(`FULL hard (${hardScore.n}): root ${hardScore.root}%  | 2nd-level ${hardScore.lvl2}%  | leaf ${hardScore.leaf}%`);
  await prisma.$disconnect();
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
