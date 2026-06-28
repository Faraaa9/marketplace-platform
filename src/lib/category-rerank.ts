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
