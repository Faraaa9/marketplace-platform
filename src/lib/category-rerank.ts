/**
 * Phase 3 LLM rerank (Phase A scaffolding). retrieve-then-LLM-rerank: given each
 * job's dense candidate category NAMES, one LLM call picks the 1-2 LOGICALLY
 * fitting categories per job (meaning, not word-similarity — fixes "kondicionieriaus
 * montavimas" -> "durų montavimas" embedding noise). Strict JSON; falls back to
 * dense top-2 per job on any failure. INVARIANT: picks must be among the supplied
 * candidates (caller maps names back to live category ids; non-matches dropped).
 *
 * Measured (multi-label golden, 83 jobs): gold-in-1-2-picks 67.5% vs dense
 * recall@2 54.2% (+13pp same selectivity) — the win is clean/logical suggestions.
 */
export const RERANK_MODEL = "google/gemini-2.5-flash";

const RERANK_SYSTEM =
  "Tu parenki paslaugų kategorijas. Duoti DARBAI, kiekvienam — kandidatų kategorijų sąrašas. " +
  "Kiekvienam darbui parink 1-2 LOGIŠKAI tinkančias kategorijas TIK iš TO darbo kandidatų (pažodžiui). " +
  "Žiūrėk PRASMĘ, ne žodžių panašumą (pvz. 'kondicionieriaus montavimas' NĖRA 'durų montavimas'). " +
  'Grąžink TIK JSON: {"0":["kategorija",...],"1":[...]} kur raktas = darbo numeris.';

export interface JobCandidates {
  phrase: string;
  /** dense candidate category NAMES (top-K), in rank order */
  candidates: string[];
}

/** Returns, per input job index, the chosen 1-2 category NAMES (subset of candidates). */
export async function rerankJobs(jobs: JobCandidates[]): Promise<string[][]> {
  const fallback = () => jobs.map((j) => j.candidates.slice(0, 2));
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || jobs.length === 0) return fallback();

  const user = jobs
    .map((j, i) => `Darbas ${i}: "${j.phrase}"\n  Kandidatai: ${j.candidates.join("; ")}`)
    .join("\n");
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: RERANK_MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: RERANK_SYSTEM },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) return fallback();
    const d = (await res.json()) as { choices: { message: { content: string } }[] };
    const raw = d.choices[0].message.content.trim().replace(/```json|```/g, "").trim();
    const obj = JSON.parse(raw) as Record<string, string[]>;
    return jobs.map((j, i) => {
      const picks = Array.isArray(obj[i]) ? obj[i] : Array.isArray(obj[String(i)]) ? obj[String(i)] : [];
      // keep only picks that are actually among this job's candidates (invariant)
      const allowed = new Set(j.candidates);
      const valid = picks.map((p) => p.trim()).filter((p) => allowed.has(p));
      return valid.length ? valid.slice(0, 2) : j.candidates.slice(0, 2);
    });
  } catch {
    return fallback();
  }
}

// ---------------------------------------------------------------------------
// v2 (categorizationV2Enabled): same retrieve-then-rerank, but the LLM also
// returns a 0..1 CONFIDENCE per pick and is taught with few-shot examples
// (meaning over word-similarity). The caller pre-selects picks above a
// confidence threshold ("auto"), leaving the rest tappable. json_object +
// bounded max_tokens so the reasoning model can't truncate the JSON.
// ---------------------------------------------------------------------------
export interface ScoredPick {
  name: string;
  confidence: number;
}

const RERANK_FEWSHOT =
  "\n\nPAVYZDŽIAI (žiūrėk PRASMĘ, ne žodžių panašumą):\n" +
  "- 'nupjauti žolę' -> Žolės pjovimas (NE 'žoliapjovių remontas')\n" +
  "- 'iškasti tvenkinį' -> Tvenkinių, prūdų kasimas (NE 'šulinių valymas')\n" +
  "- 'nuplauti mašiną' -> Automobilių plovyklos (NE 'langų plovimas')\n" +
  "- 'pajungti klozetą' -> Klozeto pajungimas\n" +
  "- 'kondicionieriaus montavimas' -> Kondicionierių montavimas (NIEKADA 'durų montavimas')\n" +
  "- jei nei vienas kandidatas tikrai netinka, grąžink tuščią masyvą tam darbui.";

const RERANK_SCORED_SYSTEM =
  "Tu parenki paslaugų kategorijas. Duoti DARBAI; kiekvienam — kandidatų sąrašas. " +
  "Kiekvienam darbui parink 1-2 LOGIŠKAI tinkančias kategorijas TIK iš TO darbo kandidatų (pažodžiui, tiksliai tas pats pavadinimas). " +
  "Pirma — tinkamiausia. Kiekvienai priskirk confidence 0..1 (kiek tikras, kad ši kategorija teisinga šiam darbui). " +
  'Grąžink TIK JSON: {"0":[{"category":"...","confidence":0.0}], "1":[...]} kur raktas = darbo numeris (nuo 0).' +
  RERANK_FEWSHOT;

/** Like rerankJobs but returns, per job, the chosen picks WITH a 0..1 confidence. */
export async function rerankJobsScored(jobs: JobCandidates[]): Promise<ScoredPick[][]> {
  const fallback = (): ScoredPick[][] =>
    jobs.map((j) => j.candidates.slice(0, 2).map((name) => ({ name, confidence: 0.5 })));
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || jobs.length === 0) return fallback();

  const user = jobs
    .map((j, i) => `Darbas ${i}: "${j.phrase}"\n  Kandidatai: ${j.candidates.join("; ")}`)
    .join("\n");
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: RERANK_MODEL,
        temperature: 0,
        max_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: RERANK_SCORED_SYSTEM },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) return fallback();
    const d = (await res.json()) as { choices: { message: { content: string } }[] };
    const raw = d.choices[0].message.content.trim().replace(/```json|```/g, "").trim();
    const obj = JSON.parse(raw) as Record<string, { category?: unknown; confidence?: unknown }[]>;
    return jobs.map((j, i) => {
      const arr = Array.isArray(obj[i]) ? obj[i] : Array.isArray(obj[String(i)]) ? obj[String(i)] : [];
      const allowed = new Set(j.candidates);
      const valid: ScoredPick[] = [];
      for (const p of arr) {
        const name = String(p?.category ?? "").trim();
        if (!allowed.has(name)) continue; // invariant: candidate-only
        const confidence = Math.max(0, Math.min(1, Number(p?.confidence ?? 0.5)));
        valid.push({ name, confidence });
      }
      return valid.length ? valid.slice(0, 2) : j.candidates.slice(0, 2).map((name) => ({ name, confidence: 0.5 }));
    });
  } catch {
    return fallback();
  }
}
