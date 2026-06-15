/**
 * eval-category-selection — BASELINE measurement for suggestCategories.
 *
 * MEASUREMENT ONLY. No production code is modified. Two safety measures:
 *  - the ai_runs audit write (recordAiRun) is STUBBED so running the set does NOT
 *    insert ~260 rows into the live ai_runs table;
 *  - the AI rerank is FORCED OFF (OPENROUTER_API_KEY cleared) for the deterministic
 *    pass. It runs the AI pass + reports the delta ONLY when EVAL_WITH_AI=1 (paid
 *    OpenRouter calls — opt-in).
 * The taxonomy READ is live (suggestCategories loads candidates from the DB).
 *
 * Run (deterministic):
 *   npx ts-node --transpile-only -r ./scripts/_register-paths.js \
 *     --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' \
 *     scripts/eval-category-selection.ts
 * Add EVAL_WITH_AI=1 to also run the AI rerank pass and print the delta.
 */
import { config } from "dotenv";
import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";

// Load env BEFORE prisma is imported (prisma.ts reads DATABASE_URL at module eval).
config({ path: path.resolve(__dirname, "../.env.local") });
config({ path: path.resolve(__dirname, "../.env") });

const WITH_AI = process.env.EVAL_WITH_AI === "1";
const FIXTURE = path.resolve(__dirname, "../data/routing/eval/category-selection-baseline.jsonl");
const REPORT = path.resolve(__dirname, "../data/routing/eval/category-selection-baseline-report.md");
// Optional human-curated overlay: query -> [acceptable category ids]. A pick counts
// as correct if it equals expected.id OR is in this set. Empty/missing => exact-id.
const ACCEPTABLE = path.resolve(__dirname, "../data/routing/eval/category-selection-acceptable-sets.json");
// Per-query engine output dump (used to build the hand-audit table).
const RESULTS = path.resolve(__dirname, "../data/routing/eval/category-selection-results.json");

interface Expected {
  id: string;
  slug: string;
  name: string;
  rootId: string;
  rootName: string;
  breadcrumb: string[];
}
interface EvalRow {
  query: string;
  expected: Expected;
  difficulty: string;
  rationale?: string;
}
interface Suggestion {
  id: string;
  name: string;
}
interface RunResult {
  row: EvalRow;
  top: Suggestion[];
  abstain: boolean;
}

function loadFixture(): EvalRow[] {
  return readFileSync(FIXTURE, "utf8")
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l) as EvalRow);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Metrics {
  n: number;
  top1: number;
  top3: number;
  root: number;
  abstain: number;
}

function pct(n: number, d: number): string {
  return d === 0 ? "—" : `${((100 * n) / d).toFixed(1)}%`;
}

async function run(rows: EvalRow[], suggest: (q: string) => Promise<Suggestion[]>): Promise<RunResult[]> {
  const out: RunResult[] = [];
  let i = 0;
  for (const row of rows) {
    const top = await suggest(row.query);
    out.push({ row, top, abstain: top.length === 0 });
    if (++i % 25 === 0) console.log(`  …${i}/${rows.length}`);
  }
  return out;
}

function score(
  results: RunResult[],
  rootOf: Map<string, string>,
  accepted: Map<string, Set<string>>,
): Metrics {
  const m: Metrics = { n: results.length, top1: 0, top3: 0, root: 0, abstain: 0 };
  for (const { row, top, abstain } of results) {
    if (abstain) m.abstain++;
    const acc = accepted.get(row.query);
    const ok = (s?: Suggestion) => !!s && (s.id === row.expected.id || (acc?.has(s.id) ?? false));
    if (ok(top[0])) m.top1++;
    if (top.slice(0, 3).some((s) => ok(s))) m.top3++;
    const top1Root = top[0] ? rootOf.get(top[0].id) ?? top[0].id : null;
    if (top1Root && top1Root === row.expected.rootId) m.root++;
  }
  return m;
}

async function main(): Promise<void> {
  const rows = loadFixture();

  // Optional acceptable-set overlay (query -> [acceptable ids]); empty/missing => exact-id.
  const accepted = new Map<string, Set<string>>();
  try {
    const rawAcc = JSON.parse(readFileSync(ACCEPTABLE, "utf8")) as Record<string, string[]>;
    for (const [q, ids] of Object.entries(rawAcc)) {
      if (Array.isArray(ids) && ids.length > 0) accepted.set(q, new Set(ids));
    }
  } catch {
    /* no overlay file yet — pure exact-id scoring */
  }
  const acceptedCount = accepted.size;

  // ── 15 random {query, expected} samples — eyeball label quality FIRST ──
  console.log("\n================= 15 RANDOM LABEL SAMPLES (eyeball before trusting any number) =================");
  for (const r of shuffle(rows).slice(0, 15)) {
    console.log(`  [${r.difficulty.padEnd(9)}] "${r.query}"  ->  ${r.expected.rootName} › ${r.expected.name}`);
  }
  console.log("================================================================================================\n");

  // Stub the audit write so we don't pollute ai_runs, BEFORE importing suggestCategories.
  const audit = require("@/lib/ai/audit") as { recordAiRun: (...a: unknown[]) => Promise<void> };
  audit.recordAiRun = async () => {};

  const origKey = process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_API_KEY; // deterministic pass: no AI

  const { prisma } = require("@/lib/prisma") as typeof import("@/lib/prisma");
  const { suggestCategories } = require("@/lib/category-suggestions") as typeof import("@/lib/category-suggestions");

  // id -> rootId (root rows have rootId null -> map to own id).
  const cats = await prisma.category.findMany({
    where: { pageType: "service", isActive: true },
    select: { id: true, rootId: true },
  });
  const rootOf = new Map<string, string>(cats.map((c) => [c.id, c.rootId ?? c.id]));

  const suggestDet = async (q: string): Promise<Suggestion[]> => {
    const r = await suggestCategories({ mode: "request", text: q, limit: 5 });
    return r.suggestions.map((s) => ({ id: s.id, name: s.name }));
  };

  console.log(`Running DETERMINISTIC pass over ${rows.length} queries (AI off)…`);
  const det = await run(rows, suggestDet);
  const detM = score(det, rootOf, accepted);

  // Per-query engine dump (raw exact-id correctness + rootMatch) for the hand-audit table.
  writeFileSync(
    RESULTS,
    JSON.stringify(
      det.map(({ row, top, abstain }) => ({
        query: row.query,
        difficulty: row.difficulty,
        expected: {
          id: row.expected.id,
          name: row.expected.name,
          rootName: row.expected.rootName,
          rootId: row.expected.rootId,
        },
        top: top.slice(0, 3),
        rawTop1Correct: top[0]?.id === row.expected.id,
        rootMatch: top[0] ? (rootOf.get(top[0].id) ?? top[0].id) === row.expected.rootId : false,
        abstain,
      })),
      null,
      0,
    ),
    "utf8",
  );

  // ── per-branch table ──
  const byBranch = new Map<string, RunResult[]>();
  for (const r of det) {
    const k = r.row.expected.rootName;
    (byBranch.get(k) ?? byBranch.set(k, []).get(k)!).push(r);
  }
  interface BranchRow {
    branch: string;
    n: number;
    top1: number;
    top3: number;
    root: number;
    abstain: number;
    wrong: string;
  }
  const branchRows: BranchRow[] = [];
  for (const [branch, rs] of [...byBranch.entries()].sort((a, b) => a[0].localeCompare(b[0], "lt"))) {
    const m = score(rs, rootOf, accepted);
    const wrongTally = new Map<string, number>();
    for (const r of rs) {
      if (r.abstain) continue;
      if (r.top[0]?.id !== r.row.expected.id) {
        const w = r.top[0]?.name ?? "(none)";
        wrongTally.set(w, (wrongTally.get(w) ?? 0) + 1);
      }
    }
    const wrong = [...wrongTally.entries()].sort((a, b) => b[1] - a[1])[0];
    branchRows.push({
      branch,
      n: m.n,
      top1: m.top1,
      top3: m.top3,
      root: m.root,
      abstain: m.abstain,
      wrong: wrong ? `${wrong[0]} (×${wrong[1]})` : "—",
    });
  }

  // ── difficulty breakdown (bonus) ──
  const byDiff = new Map<string, RunResult[]>();
  for (const r of det) {
    const k = r.row.difficulty;
    (byDiff.get(k) ?? byDiff.set(k, []).get(k)!).push(r);
  }

  // ── optional AI pass ──
  let aiM: Metrics | null = null;
  if (WITH_AI && origKey) {
    process.env.OPENROUTER_API_KEY = origKey;
    console.log(`\nRunning AI-RERANK pass over ${rows.length} queries (paid OpenRouter calls)…`);
    const ai = await run(rows, suggestDet); // same call; key now present -> rerank kicks in
    aiM = score(ai, rootOf, accepted);
  }

  // ── build markdown report ──
  const lines: string[] = [];
  lines.push(`# Category selection — baseline measurement\n`);
  lines.push(`Set: \`data/routing/eval/category-selection-baseline.jsonl\` — ${rows.length} labeled Lithuanian queries across ${byBranch.size} root branches.`);
  lines.push(`Mode: deterministic \`suggestCategories\` (AI rerank OFF). Audit writes stubbed; taxonomy read live. Measurement only — no production changes.`);
  lines.push(`Acceptable-set overlay: ${acceptedCount}/${rows.length} queries have a non-empty acceptable set (a pick counts for top-1/top-3 if it is in the set; 0 = pure exact-id).\n`);
  lines.push(`> CAVEAT: every number is only as good as the labels. The script prints 15 random {query, expected} pairs at the top of its stdout — eyeball those first.\n`);
  lines.push(`## Aggregate (deterministic)\n`);
  lines.push(`| metric | value |`);
  lines.push(`|---|---|`);
  lines.push(`| top-1 accuracy (exact specific category) | ${pct(detM.top1, detM.n)} (${detM.top1}/${detM.n}) |`);
  lines.push(`| top-3 accuracy | ${pct(detM.top3, detM.n)} (${detM.top3}/${detM.n}) |`);
  lines.push(`| root-branch accuracy (right branch, any leaf) | ${pct(detM.root, detM.n)} (${detM.root}/${detM.n}) |`);
  lines.push(`| abstain rate (returned nothing) | ${pct(detM.abstain, detM.n)} (${detM.abstain}/${detM.n}) |`);
  lines.push(``);
  if (aiM) {
    lines.push(`## AI rerank delta (vs deterministic)\n`);
    lines.push(`| metric | deterministic | with AI | delta |`);
    lines.push(`|---|---|---|---|`);
    const d = (a: number, b: number) => `${b - a >= 0 ? "+" : ""}${(((b - a) / detM.n) * 100).toFixed(1)} pp`;
    lines.push(`| top-1 | ${pct(detM.top1, detM.n)} | ${pct(aiM.top1, aiM.n)} | ${d(detM.top1, aiM.top1)} |`);
    lines.push(`| top-3 | ${pct(detM.top3, detM.n)} | ${pct(aiM.top3, aiM.n)} | ${d(detM.top3, aiM.top3)} |`);
    lines.push(`| root | ${pct(detM.root, detM.n)} | ${pct(aiM.root, aiM.n)} | ${d(detM.root, aiM.root)} |`);
    lines.push(`| abstain | ${pct(detM.abstain, detM.n)} | ${pct(aiM.abstain, aiM.n)} | ${d(detM.abstain, aiM.abstain)} |`);
    lines.push(``);
  } else {
    lines.push(`## AI rerank delta\n`);
    lines.push(`_Not run (deterministic baseline only). Re-run with \`EVAL_WITH_AI=1\` to add the AI pass — note it makes one paid OpenRouter call per query._\n`);
  }
  lines.push(`## Per-branch (the point — uneven coverage made visible)\n`);
  lines.push(`| branch | n | top-1 | top-3 | root | abstain | most common wrong top-1 |`);
  lines.push(`|---|--:|--:|--:|--:|--:|---|`);
  for (const b of branchRows) {
    lines.push(
      `| ${b.branch} | ${b.n} | ${pct(b.top1, b.n)} | ${pct(b.top3, b.n)} | ${pct(b.root, b.n)} | ${pct(b.abstain, b.n)} | ${b.wrong} |`,
    );
  }
  lines.push(``);
  lines.push(`## By difficulty (deterministic top-1)\n`);
  lines.push(`| difficulty | n | top-1 | top-3 | abstain |`);
  lines.push(`|---|--:|--:|--:|--:|`);
  for (const [diff, rs] of [...byDiff.entries()].sort()) {
    const m = score(rs, rootOf, accepted);
    lines.push(`| ${diff} | ${m.n} | ${pct(m.top1, m.n)} | ${pct(m.top3, m.n)} | ${pct(m.abstain, m.n)} |`);
  }
  lines.push(``);

  const md = lines.join("\n");
  writeFileSync(REPORT, md, "utf8");

  // ── console summary ──
  console.log(`\n===== AGGREGATE (deterministic) =====`);
  console.log(`top-1: ${pct(detM.top1, detM.n)}   top-3: ${pct(detM.top3, detM.n)}   root: ${pct(detM.root, detM.n)}   abstain: ${pct(detM.abstain, detM.n)}   (n=${detM.n})`);
  console.log(`\n===== PER-BRANCH =====`);
  for (const b of branchRows) {
    console.log(`  ${b.branch.padEnd(42)} n=${String(b.n).padStart(3)}  top1=${pct(b.top1, b.n).padStart(6)}  top3=${pct(b.top3, b.n).padStart(6)}  root=${pct(b.root, b.n).padStart(6)}  abstain=${pct(b.abstain, b.n).padStart(5)}  wrong: ${b.wrong}`);
  }
  if (aiM) {
    console.log(`\n===== AI delta =====`);
    console.log(`top-1 ${pct(detM.top1, detM.n)} -> ${pct(aiM.top1, aiM.n)}   top-3 ${pct(detM.top3, detM.n)} -> ${pct(aiM.top3, aiM.n)}   root ${pct(detM.root, detM.n)} -> ${pct(aiM.root, aiM.n)}`);
  }
  console.log(`\nReport written: ${REPORT}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("eval-category-selection failed:", e);
  process.exit(1);
});
