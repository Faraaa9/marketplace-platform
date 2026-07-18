/**
 * (a) Relabel golden to "accept any reasonable" via an INDEPENDENT LLM judge that
 *     scores each candidate category blind (no gold marker, no pipeline pick), then
 *     re-measure auto@1 / all-jobs-correct on the k50 config (strict vs relabeled).
 * (b) Test alternative confidence signals (retrieval cosine, top1-top2 margin,
 *     dense∩rerank agreement) vs LLM self-report — find a gate with >=90% precision
 *     and report its coverage.
 *
 * Read-only on prod. Judge runs on FLASH (cheap); rerank picks reuse the cached
 * sonnet k50 results from eval.ts. Writes out/calibration.md + data/accept_sets.jsonl.
 */
import fs from "node:fs";
import path from "node:path";
import { chatJSON, denseTopKScored, embed, fold, pool, prisma } from "./clients";
import { rerank } from "./pipeline";

const DECIDER = process.env.PROTO_DECIDER_MODEL || "anthropic/claude-sonnet-4.5";
const JUDGE_MODEL = "google/gemini-2.5-flash";
const K = 50;
const DATA = path.join(__dirname, "../data");
const OUT = path.join(__dirname, "../out");

interface GJob { phrase: string; category: string }
interface GRec { id: number; request: string; jobs: GJob[] }
const golden: GRec[] = fs.readFileSync(path.join(DATA, "multilabel_golden.jsonl"), "utf8")
  .split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));

// LOOSE rubric (kept verbatim so the first run's cache is reused) — "any reasonable",
// allows broader same-domain umbrellas: upper bound.
const LOOSE_SYSTEM =
  "Tu vertini, ar paslaugų kategorija TINKA konkrečiam darbui. Duota darbo frazė ir kategorijų sąrašas. " +
  "Pažymėk kategoriją PRIIMTINA jei klientas/meistras sutiktų, kad tai teisinga vieta šiam darbui: " +
  "tikslus atitikmuo, sinonimas, tikslesnė tos pačios srities kategorija, arba pagrįstai bendresnė TOS PAČIOS srities. " +
  "NEpriimtina: kita sritis, klaidingas darbas, per platus umbrella iš svetimos srities. Būk GRIEŽTAS — geriau atmesk abejotiną. " +
  'Grąžink TIK JSON: {"accept":["kategorijos pavadinimas tiksliai", ...]} — tik priimtinų pavadinimai, pažodžiui iš sąrašo.';

// STRICT/auto-safe rubric — only the SAME job: exact, pure synonym, or a more-specific
// child that still IS this exact job. Reject umbrellas and same-domain-different-job.
const STRICT_SYSTEM =
  "Tu vertini, ar į šią kategoriją SAUGU automatiškai nukreipti konkretų darbą (be žmogaus patvirtinimo). " +
  "Duota darbo frazė ir kategorijų sąrašas. Pažymėk PRIIMTINA TIK jei tai TAS PATS darbas: tikslus atitikmuo, " +
  "grynas sinonimas, arba tikslesnis tos pačios paslaugos pavadinimas. " +
  "ATMESK: (1) platų umbrella ('Vidaus apdailos darbai', 'Statybos darbai', 'Interjero kūrimas') — per bendra automatiniam nukreipimui; " +
  "(2) kitą darbą toje pačioje srityje (pvz. 'Lubų dažymas' NĖRA 'Sienų dažymas'; 'Grindų klojimas' NĖRA plytelės); " +
  "(3) bet ką, dėl ko klientas nustebtų gavęs ne tos srities meistrą. Būk LABAI griežtas — kai abejoji, ATMESK. " +
  'Grąžink TIK JSON: {"accept":["pavadinimas tiksliai", ...]}.';

async function judgeAccept(phrase: string, candidates: string[], system: string): Promise<Set<string>> {
  const user = `Darbas: "${phrase}"\nKategorijos:\n${candidates.map((c, i) => `${i + 1}. ${c}`).join("\n")}`;
  const raw = await chatJSON({ model: JUDGE_MODEL, system, user, maxTokens: 1200, timeoutMs: 60_000 });
  const allowed = new Map(candidates.map((c) => [fold(c), c]));
  try {
    const obj = JSON.parse(raw) as { accept?: unknown[] };
    const out = new Set<string>();
    for (const a of obj.accept ?? []) { const n = allowed.get(fold(String(a))); if (n) out.add(fold(n)); }
    return out;
  } catch {
    return new Set();
  }
}

interface Job {
  reqId: number; phrase: string; gold: string;
  scored: { name: string; sim: number }[];
  top1?: string; top2?: string; llmConf: number;
  acceptLoose: Set<string>; acceptStrict: Set<string>;
  strictGoldHit: boolean; autoSafeHit: boolean; looseHit: boolean; autoSafeIn12: boolean;
  simTop1: number; margin: number; agree: boolean;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  // flatten jobs + per-job dense (scored) @50
  const flat: { reqIdx: number; phrase: string; gold: string }[] = [];
  golden.forEach((r, ri) => r.jobs.forEach((j) => flat.push({ reqIdx: ri, phrase: j.phrase, gold: j.category })));
  console.log(`calibrate: ${golden.length} req / ${flat.length} jobs. embedding + scored retrieval @${K}...`);
  const vecs = await embed(flat.map((f) => f.phrase));
  const scored = await pool(vecs, 6, (v) => denseTopKScored(v, K));

  // rerank per request (cached sonnet k50 few-shot = same as eval live_k50_fs)
  const byReq = new Map<number, number[]>();
  flat.forEach((f, gi) => { const a = byReq.get(f.reqIdx) ?? []; a.push(gi); byReq.set(f.reqIdx, a); });
  const picksByGi: { category: string; confidence: number }[][] = new Array(flat.length);
  await pool([...byReq.entries()], 5, async ([, gis]) => {
    const jobs = gis.map((gi) => ({ phrase: flat[gi].phrase, candidates: scored[gi].slice(0, K).map((c) => c.name) }));
    const picks = await rerank(jobs, { model: DECIDER, fewshot: true });
    gis.forEach((gi, local) => { picksByGi[gi] = picks[local] ?? []; });
  });

  // build judge candidate set per job = top-10 dense ∪ gold ∪ picks ; judge BLIND, twice
  console.log(`judging acceptability (flash x2 rubrics, ${flat.length} jobs)...`);
  const jobs: Job[] = await pool(flat, 5, async (f, gi) => {
    const picks = picksByGi[gi];
    const top1 = picks[0]?.category, top2 = picks[1]?.category;
    const cset = [...new Set([...scored[gi].slice(0, 10).map((c) => c.name), f.gold, top1, top2].filter(Boolean) as string[])];
    const loose = await judgeAccept(f.phrase, cset, LOOSE_SYSTEM);
    const strict = await judgeAccept(f.phrase, cset, STRICT_SYSTEM);
    loose.add(fold(f.gold)); strict.add(fold(f.gold)); // strict gold always acceptable
    const g = fold(f.gold);
    const p1 = top1 ? fold(top1) : "";
    const pickFold = picks.map((p) => fold(p.category));
    return {
      reqId: golden[f.reqIdx].id, phrase: f.phrase, gold: f.gold,
      scored: scored[gi].map((c) => ({ name: c.name, sim: c.sim })),
      top1, top2, llmConf: picks[0]?.confidence ?? 0,
      acceptLoose: loose, acceptStrict: strict,
      strictGoldHit: p1 === g,
      autoSafeHit: p1 !== "" && strict.has(p1),
      looseHit: p1 !== "" && loose.has(p1),
      autoSafeIn12: pickFold.some((x) => strict.has(x)),
      simTop1: scored[gi][0]?.sim ?? 0,
      margin: (scored[gi][0]?.sim ?? 0) - (scored[gi][1]?.sim ?? 0),
      agree: p1 !== "" && p1 === fold(scored[gi][0]?.name ?? ""),
    };
  });

  // ---- (a) re-score: strict gold | auto-safe (strict synonym) | any-reasonable (loose) ----
  const n = jobs.length;
  const reqIds = [...new Set(jobs.map((j) => j.reqId))];
  const pct = (x: number) => +(100 * x).toFixed(1);
  const autoOf = (hit: (j: Job) => boolean) => pct(jobs.filter(hit).length / n);
  const allOf = (hit: (j: Job) => boolean) =>
    pct(reqIds.filter((id) => jobs.filter((j) => j.reqId === id).every(hit)).length / reqIds.length);
  const sGoldAuto = autoOf((j) => j.strictGoldHit), sGoldAll = allOf((j) => j.strictGoldHit);
  const safeAuto = autoOf((j) => j.autoSafeHit), safeAll = allOf((j) => j.autoSafeHit);
  const looseAuto = autoOf((j) => j.looseHit), looseAll = allOf((j) => j.looseHit);
  const safeIn12 = autoOf((j) => j.autoSafeIn12);
  const avgLoose = (jobs.reduce((s, j) => s + j.acceptLoose.size, 0) / n).toFixed(1);
  const avgStrict = (jobs.reduce((s, j) => s + j.acceptStrict.size, 0) / n).toFixed(1);

  // ---- (b) gate analysis — correctness = AUTO-SAFE (the meaningful bar) ----
  const correct = jobs.map((j) => j.autoSafeHit);
  // best threshold (higher = more confident) maximizing coverage s.t. precision>=0.90
  function gateHigher(values: number[], label: string) {
    const cand = [...new Set(values)].sort((a, b) => a - b);
    let best: { t: number; cov: number; prec: number } | null = null;
    for (const t of cand) {
      const hiIdx = values.map((v, i) => (v >= t ? i : -1)).filter((i) => i >= 0);
      if (hiIdx.length === 0) continue;
      const prec = hiIdx.filter((i) => correct[i]).length / hiIdx.length;
      const cov = hiIdx.length / n;
      if (prec >= 0.9 && (!best || cov > best.cov)) best = { t: +t.toFixed(4), cov: pct(cov), prec: pct(prec) };
    }
    // also report a curve at a few quantile thresholds
    const curve = [0.5, 0.7, 0.8, 0.9].map((q) => {
      const t = cand[Math.floor(q * (cand.length - 1))];
      const hiIdx = values.map((v, i) => (v >= t ? i : -1)).filter((i) => i >= 0);
      const prec = hiIdx.length ? hiIdx.filter((i) => correct[i]).length / hiIdx.length : 0;
      return `t≥${t.toFixed(3)}: prec ${pct(prec)}% cov ${pct(hiIdx.length / n)}%`;
    });
    return { label, best, curve };
  }
  function gateBool(flags: boolean[], label: string) {
    const hiIdx = flags.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
    const prec = hiIdx.length ? hiIdx.filter((i) => correct[i]).length / hiIdx.length : 0;
    return { label, prec: pct(prec), cov: pct(hiIdx.length / n), meets90: prec >= 0.9 };
  }

  const gLlm = gateHigher(jobs.map((j) => j.llmConf), "LLM self-report conf");
  const gSim = gateHigher(jobs.map((j) => j.simTop1), "retrieval cosine (top-1 sim)");
  const gMargin = gateHigher(jobs.map((j) => j.margin), "top1-top2 margin");
  const gAgree = gateBool(jobs.map((j) => j.agree), "dense∩rerank agreement");
  // combined: agreement AND margin>=t
  const agreeMargin = jobs.map((j) => (j.agree ? j.margin : -1));
  const gAgreeMargin = gateHigher(agreeMargin, "agreement AND margin");
  // combined: agreement AND llmConf>=t
  const agreeConf = jobs.map((j) => (j.agree ? j.llmConf : -1));
  const gAgreeConf = gateHigher(agreeConf, "agreement AND LLM conf");

  // ---- write accept_sets artifact (both rubrics, for eyeballing) ----
  const accLines = golden.map((r) => {
    const rjobs = r.jobs.map((j) => {
      const jr = jobs.find((x) => x.reqId === r.id && x.phrase === j.phrase)!;
      const namesIn = (set: Set<string>) => [...new Set([j.category, ...jr.scored.filter((c) => set.has(fold(c.name))).map((c) => c.name)])];
      return { phrase: j.phrase, strict_gold: j.category, accept_auto_safe: namesIn(jr.acceptStrict), accept_loose: namesIn(jr.acceptLoose) };
    });
    return JSON.stringify({ id: r.id, request: r.request, jobs: rjobs });
  });
  fs.writeFileSync(path.join(DATA, "accept_sets.jsonl"), accLines.join("\n"));

  // ---- report ----
  const md: string[] = [];
  md.push(`# Calibration — relabeled scores + confidence gate\n`);
  md.push(`k50 config, decider \`${DECIDER}\`, judge \`${JUDGE_MODEL}\` (blind). Accept-set size: auto-safe ${avgStrict}, loose ${avgLoose} cats/job.\n`);
  md.push(`## (a) Three label strictnesses (83 jobs / 36 requests)\n`);
  md.push(`| metric | strict gold (1 name) | **auto-safe** (synonym/specific) | any-reasonable (incl. umbrella) |`);
  md.push(`|---|---|---|---|`);
  md.push(`| auto@1 | ${sGoldAuto}% | **${safeAuto}%** | ${looseAuto}% |`);
  md.push(`| all jobs correct | ${sGoldAll}% | **${safeAll}%** | ${looseAll}% |`);
  md.push(`\nauto-safe gold-in-1-2 = ${safeIn12}%. "auto-safe" = same job (exact/synonym/more-specific); rejects umbrellas + same-domain-different-job. This is the honest auto-assignment bar.\n`);
  md.push(`## (b) Confidence gate — does precision>=90% exist? (correctness = auto-safe)\n`);
  const line = (g: { label: string; best: { t: number; cov: number; prec: number } | null; curve: string[] }) =>
    `- **${g.label}**: ${g.best ? `gate t≥${g.best.t} → precision ${g.best.prec}%, coverage ${g.best.cov}%` : "NO threshold reaches 90% precision"}\n    curve: ${g.curve.join("  |  ")}`;
  md.push(line(gLlm));
  md.push(line(gSim));
  md.push(line(gMargin));
  md.push(`- **${gAgree.label}**: precision ${gAgree.prec}%, coverage ${gAgree.cov}% ${gAgree.meets90 ? "(meets 90%)" : "(below 90%)"}`);
  md.push(line(gAgreeMargin));
  md.push(line(gAgreeConf));
  md.push(`\n_Coverage = share of all 83 jobs the gate auto-assigns; precision = of those, share auto-safe-correct. Overall auto-safe precision (no gate) = ${safeAuto}%._`);
  fs.writeFileSync(path.join(OUT, "calibration.md"), md.join("\n"));

  console.log(`\nauto@1:  strict-gold ${sGoldAuto}%  →  AUTO-SAFE ${safeAuto}%  →  any-reasonable ${looseAuto}%`);
  console.log(`all-jobs✓: strict-gold ${sGoldAll}%  →  AUTO-SAFE ${safeAll}%  →  any-reasonable ${looseAll}%`);
  console.log(`accept-set avg: auto-safe ${avgStrict} | loose ${avgLoose} cats/job`);
  console.log(`gates @prec≥90% (auto-safe correctness): llmConf ${gLlm.best ? gLlm.best.cov + "%" : "NONE"} | sim ${gSim.best ? gSim.best.cov + "%" : "NONE"} | margin ${gMargin.best ? gMargin.best.cov + "%" : "NONE"} | agree ${gAgree.prec}%/${gAgree.cov}% | agree+margin ${gAgreeMargin.best ? gAgreeMargin.best.cov + "%" : "NONE"} | agree+conf ${gAgreeConf.best ? gAgreeConf.best.cov + "%" : "NONE"}`);
  console.log(`wrote out/calibration.md + data/accept_sets.jsonl`);
  await prisma.$disconnect();
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
