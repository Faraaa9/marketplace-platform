/**
 * The LLM-centric prototype pipeline:
 *   1. segmentAndClassify: ONE LLM call splits the request into jobs + a draft
 *      category guess per job (the "classify in head" step).
 *   2. retrieve: per job, dense top-K from category_embedding (the WIDE candidate
 *      trap — k=50 catches the right category more often than k=20).
 *   3. rerank: ONE LLM call picks 1-2 logical categories per job FROM candidates,
 *      with a 0..1 confidence each (few-shot taught). High confidence -> auto.
 *
 * Embeddings as trap, LLM as decider. All picks are constrained to live candidates.
 */
import { Candidate, chatJSON, denseTopK, embed, fold } from "./clients";

export const DEFAULT_DECIDER = process.env.PROTO_DECIDER_MODEL || "anthropic/claude-sonnet-4.5";

// ---------- 1. segment + classify ----------
const SEG_SYSTEM =
  "Tu skaidai lietuviškas paslaugų užklausas į ATSKIRUS darbus ir kiekvienam pasiūlai kategorijos spėjimą. " +
  "Numanomus darbus irgi išskirk (pvz. 'pilna vonios renovacija' -> griovimas + plytelės + santechnika). " +
  "Šnekamąją kalbą versk į darbą (pvz. 'nupjauti žolę' -> žolės pjovimas). " +
  'Grąžink TIK JSON: {"jobs":[{"phrase":"trumpas darbas","draft":"spėjama kategorija"}]}. ' +
  "phrase = aiški darbo frazė; draft = tavo geriausias kategorijos pavadinimo spėjimas (laisvas tekstas).";

export interface SegJob { phrase: string; draft: string }

export async function segmentAndClassify(request: string, model = DEFAULT_DECIDER): Promise<SegJob[]> {
  const raw = await chatJSON({ model, system: SEG_SYSTEM, user: request, maxTokens: 2000, timeoutMs: 60_000 });
  try {
    const obj = JSON.parse(raw) as { jobs?: { phrase?: unknown; draft?: unknown }[] };
    return (obj.jobs ?? [])
      .map((j) => ({ phrase: String(j.phrase ?? "").trim(), draft: String(j.draft ?? "").trim() }))
      .filter((j) => j.phrase)
      .slice(0, 8);
  } catch {
    return [];
  }
}

// ---------- 2. retrieve (live pgvector) ----------
export async function retrieveLive(phrases: string[], k: number): Promise<Candidate[][]> {
  const vecs = await embed(phrases);
  const out: Candidate[][] = [];
  for (const v of vecs) out.push(await denseTopK(v, k));
  return out;
}

// ---------- 3. rerank with few-shot + confidence ----------
const FEWSHOT =
  "\n\nPAVYZDŽIAI (kaip mąstyti — žiūrėk PRASMĘ, ne žodžių panašumą):\n" +
  "- darbas 'nupjauti žolę' -> Vejos pjovimas (NE 'žoliapjovių remontas')\n" +
  "- darbas 'iškasti tvenkinį' -> Žemės kasimo darbai / Kiemo kasimas (NE 'šulinių valymas')\n" +
  "- darbas 'nuplauti mašiną' -> Automobilių plovimas (NE 'langų plovimas')\n" +
  "- darbas 'pajungti klozetą' -> Klozeto pajungimas / Santechnikos darbai\n" +
  "- darbas 'kondicionieriaus montavimas' -> Kondicionierių montavimas (NIEKADA 'durų montavimas', net jei žodis panašus)\n" +
  "- darbas 'pakeisti laminatą' -> Laminato klojimas\n" +
  "- jei nei vienas kandidatas tikrai netinka, grąžink tuščią masyvą tam darbui.";

function rerankSystem(fewshot: boolean): string {
  return (
    "Tu parenki paslaugų kategorijas. Duoti DARBAI; kiekvienam — kandidatų kategorijų sąrašas. " +
    "Kiekvienam darbui parink 1-2 LOGIŠKAI tinkančias kategorijas TIK iš TO darbo kandidatų (pažodžiui, tiksliai tas pats pavadinimas). " +
    "Pirma — tinkamiausia. Kiekvienai priskirk confidence 0..1 (kiek esi tikras, kad ši kategorija teisinga šiam darbui). " +
    'Grąžink TIK JSON: {"0":[{"category":"...","confidence":0.0}], "1":[...]} kur raktas = darbo numeris (nuo 0).' +
    (fewshot ? FEWSHOT : "")
  );
}

export interface Pick { category: string; confidence: number }

export async function rerank(
  jobs: { phrase: string; draft?: string; candidates: string[] }[],
  opts: { model?: string; fewshot: boolean },
): Promise<Pick[][]> {
  const model = opts.model ?? DEFAULT_DECIDER;
  if (jobs.length === 0) return [];
  const user = jobs
    .map((j, i) =>
      `Darbas ${i}: "${j.phrase}"${j.draft ? ` (spėjimas: ${j.draft})` : ""}\n  Kandidatai: ${j.candidates.join("; ")}`,
    )
    .join("\n");
  const raw = await chatJSON({ model, system: rerankSystem(opts.fewshot), user, maxTokens: 2000, timeoutMs: 90_000 });
  let obj: Record<string, { category?: unknown; confidence?: unknown }[]> = {};
  try {
    obj = JSON.parse(raw);
  } catch {
    // fall back to dense top-2 with neutral confidence
    return jobs.map((j) => j.candidates.slice(0, 2).map((c) => ({ category: c, confidence: 0.5 })));
  }
  return jobs.map((j, i) => {
    const arr = Array.isArray(obj[i]) ? obj[i] : Array.isArray(obj[String(i)]) ? obj[String(i)] : [];
    const allowed = new Map(j.candidates.map((c) => [fold(c), c]));
    const picks: Pick[] = [];
    for (const p of arr) {
      const name = allowed.get(fold(String(p?.category ?? ""))); // enforce candidate-only (folded match)
      if (!name) continue;
      const conf = Math.max(0, Math.min(1, Number(p?.confidence ?? 0.5)));
      picks.push({ category: name, confidence: conf });
    }
    return picks.slice(0, 2);
  });
}

// ---------- full pipeline (demo / FULL eval) ----------
export interface FullJob { phrase: string; draft: string; picks: Pick[]; candidates: Candidate[] }

export async function runFull(
  request: string,
  opts: { k: number; fewshot: boolean; model?: string },
): Promise<FullJob[]> {
  const segs = await segmentAndClassify(request, opts.model);
  if (segs.length === 0) return [];
  const cands = await retrieveLive(segs.map((s) => s.phrase), opts.k);
  const picks = await rerank(
    segs.map((s, i) => ({ phrase: s.phrase, draft: s.draft, candidates: cands[i].map((c) => c.name) })),
    { model: opts.model, fewshot: opts.fewshot },
  );
  return segs.map((s, i) => ({ phrase: s.phrase, draft: s.draft, picks: picks[i] ?? [], candidates: cands[i] }));
}
