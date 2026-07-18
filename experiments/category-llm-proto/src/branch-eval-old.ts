/**
 * Same branch-level recall test, but on the OLD categorization engine
 * (suggestCategories — deterministic token scoring, NO embeddings; this is what
 * prod effectively ran before the prototype, AI rerank forced OFF for a clean
 * reproducible baseline). GOLD-SEG (83 gold phrases, top-1) + colloquial (15,
 * top-8 set coverage). Read-only. Writes out/branch-eval-old.md.
 */
import { config } from "dotenv";
import path from "node:path";
import fs from "node:fs";

const ROOT = path.resolve(__dirname, "../../..");
config({ path: path.join(ROOT, ".env.local") });
config({ path: path.join(ROOT, ".env") });
// Old system as it effectively ran in prod: deterministic only (no AI rerank).
delete process.env.OPENROUTER_API_KEY;
delete process.env.OPENROUTER_MODEL;

const DIA: Record<string, string> = { ą:"a", č:"c", ę:"e", ė:"e", į:"i", š:"s", ų:"u", ū:"u", ž:"z" };
const fold = (s: unknown) => (s == null ? "" : String(s)).trim().toLowerCase().replace(/[ąčęėįšųūž]/g, (c) => DIA[c] ?? c);
const DATA = path.join(__dirname, "../data");

interface GJob { phrase: string; category: string }
interface GRec { id: number; request: string; jobs: GJob[] }
const load = (f: string): GRec[] =>
  fs.existsSync(path.join(DATA, f))
    ? fs.readFileSync(path.join(DATA, f), "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l))
    : [];

interface Cat { id: string; name: string; depth: number; parentId: string | null; rootId: string | null }

async function main() {
  const { suggestCategories } = require("@/lib/category-suggestions") as typeof import("@/lib/category-suggestions");
  const { prisma } = require("@/lib/prisma") as typeof import("@/lib/prisma");

  const cats = await prisma.$queryRawUnsafe<Cat[]>(`select id, name, depth, "parentId", "rootId" from categories`);
  const byId = new Map(cats.map((c) => [c.id, c]));
  const embCats = await prisma.$queryRawUnsafe<{ id: string; name: string }[]>(
    `select c.id, c.name from category_embedding e join categories c on c.id = e.category_id`,
  );
  const idByName = new Map<string, string>();
  for (const c of embCats) { const f = fold(c.name); if (!idByName.has(f)) idByName.set(f, c.id); }

  const root = (id: string | null) => (id ? byId.get(id)?.rootId ?? null : null);
  const level1 = (id: string | null) => {
    if (!id) return null;
    const c = byId.get(id);
    if (!c) return null;
    return c.depth <= 1 ? c.id : c.parentId;
  };

  function score(pairs: { pred: string | null; gold: string | null }[]) {
    const r = pairs.filter((p) => p.gold);
    const n = r.length;
    const pct = (x: number) => +(100 * x / n).toFixed(1);
    return {
      n,
      leaf: pct(r.filter((p) => p.pred && p.pred === p.gold).length),
      lvl2: pct(r.filter((p) => p.pred && level1(p.pred) && level1(p.pred) === level1(p.gold)).length),
      root: pct(r.filter((p) => p.pred && root(p.pred) && root(p.pred) === root(p.gold)).length),
    };
  }

  // GOLD-SEG: per gold phrase -> old system top-1
  const golden = load("multilabel_golden.jsonl");
  const flat: { phrase: string; gold: string }[] = [];
  golden.forEach((r) => r.jobs.forEach((j) => flat.push({ phrase: j.phrase, gold: j.category })));
  console.log(`OLD GOLD-SEG ${flat.length} jobs (deterministic suggestCategories)...`);
  const gsPairs: { pred: string | null; gold: string | null }[] = [];
  for (const f of flat) {
    const res = await suggestCategories({ mode: "request", text: f.phrase, limit: 5 });
    gsPairs.push({ pred: res.suggestions[0]?.id ?? null, gold: idByName.get(fold(f.gold)) ?? null });
  }
  const goldSeg = score(gsPairs);

  // colloquial: whole request -> top-8, set coverage per gold job
  const hard = load("hard_queries.jsonl");
  console.log(`OLD colloquial ${hard.length} requests (top-8 coverage)...`);
  let hn = 0, hLeaf = 0, hLvl2 = 0, hRoot = 0;
  for (const r of hard) {
    const res = await suggestCategories({ mode: "request", text: r.request, limit: 8 });
    const ids = res.suggestions.map((s) => s.id);
    const predLeaf = new Set(ids), predLvl2 = new Set(ids.map(level1)), predRoot = new Set(ids.map(root));
    for (const j of r.jobs) {
      const g = idByName.get(fold(j.category)) ?? null;
      if (!g) continue;
      hn++;
      if (predLeaf.has(g)) hLeaf++;
      if (predLvl2.has(level1(g))) hLvl2++;
      if (predRoot.has(root(g))) hRoot++;
    }
  }
  const hpct = (x: number) => +(100 * x / hn).toFixed(1);
  const hardScore = { n: hn, leaf: hpct(hLeaf), lvl2: hpct(hLvl2), root: hpct(hRoot) };

  const md = [
    `# Branch-level recall — OLD engine (deterministic suggestCategories)\n`,
    `| set | jobs | root-branch | 2nd-level | leaf |`,
    `|---|---|---|---|---|`,
    `| GOLD-SEG (golden) | ${goldSeg.n} | ${goldSeg.root}% | ${goldSeg.lvl2}% | ${goldSeg.leaf}% |`,
    `| colloquial (top-8) | ${hardScore.n} | ${hardScore.root}% | ${hardScore.lvl2}% | ${hardScore.leaf}% |`,
  ].join("\n");
  fs.writeFileSync(path.join(__dirname, "../out/branch-eval-old.md"), md);

  console.log("\n==== OLD ENGINE branch recall (top-1, deterministic) ====");
  console.log(`GOLD-SEG (${goldSeg.n}):  root ${goldSeg.root}%  | 2nd-level ${goldSeg.lvl2}%  | leaf ${goldSeg.leaf}%`);
  console.log(`colloquial (${hardScore.n}, top-8): root ${hardScore.root}%  | 2nd-level ${hardScore.lvl2}%  | leaf ${hardScore.leaf}%`);
  await prisma.$disconnect();
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
