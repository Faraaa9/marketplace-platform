import { NextResponse } from "next/server";
import categories from "../../demo-multilabel/categories.json";

// PHASE 0 vertical-slice demo ONLY (feature branch, not main). End-to-end:
// segmentation -> per-job embed (text-embedding-3-large @ dimensions:1536) ->
// dense top-15 candidates -> LLM rerank (one call, picks 1-2 logical cats/job).
// No DB/pgvector.

const KEY = process.env.OPENROUTER_API_KEY;
const SEG_PROMPT =
  "Tu skaidai paslaugų užklausas į ATSKIRUS darbus. Grąžink TIK JSON masyvą trumpų darbų frazių. " +
  "Numanomus darbus irgi išskirk (pvz. 'pilna vonios renovacija' -> griovimas + plytelės + santechnika). " +
  'Pvz.: "Sienų dažymas, plytelių klojimas ir kriauklės" -> ["sienų dažymas","plytelių klojimas","kriauklės keitimas"]';
const RR_PROMPT =
  "Tu parenki paslaugų kategorijas. Duoti DARBAI, kiekvienam — kandidatų kategorijų sąrašas. " +
  "Kiekvienam darbui parink 1-2 LOGIŠKAI tinkančias kategorijas TIK iš TO darbo kandidatų (pažodžiui). " +
  "Žiūrėk PRASMĘ, ne žodžių panašumą (pvz. 'kondicionieriaus montavimas' NĖRA 'durų montavimas'). " +
  'Grąžink TIK JSON: {"0":["kategorija",...],"1":[...]} kur raktas = darbo numeris.';

const CAND = 15;
type Cat = { name: string; slug: string; vec: number[] };
const CATS = categories as Cat[];

function unit(v: number[]): number[] {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  return v.map((x) => x / n);
}
const CAT_UNIT = CATS.map((c) => unit(c.vec));
const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
const fold = (s: string) =>
  s.trim().toLowerCase().replace(/[ąčęėįšųūž]/g, (c) => "a c e e i s u u z"["ąčęėįšųūž".indexOf(c) * 2]);
const bySlug = new Map(CATS.map((c) => [c.slug, c]));
const byFold = new Map(CATS.map((c) => [fold(c.name), c]));

async function or<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`https://openrouter.ai/api/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenRouter ${path} ${res.status}`);
  return (await res.json()) as T;
}
function parseJson(raw: string): unknown {
  return JSON.parse(raw.trim().replace(/```json|```/g, "").trim());
}

async function segment(text: string): Promise<string[]> {
  const d = await or<{ choices: { message: { content: string } }[] }>("chat/completions", {
    model: "google/gemini-2.5-flash",
    temperature: 0,
    messages: [
      { role: "system", content: SEG_PROMPT },
      { role: "user", content: text },
    ],
  });
  try {
    return (parseJson(d.choices[0].message.content) as unknown[]).map((x) => String(x).trim()).filter(Boolean);
  } catch {
    return [text];
  }
}
async function embed(texts: string[]): Promise<number[][]> {
  const d = await or<{ data: { embedding: number[]; index: number }[] }>("embeddings", {
    model: "openai/text-embedding-3-large",
    input: texts,
    dimensions: 1536,
  });
  return d.data.sort((a, b) => a.index - b.index).map((r) => unit(r.embedding));
}
async function rerank(jobsCands: { phrase: string; cands: string[] }[]): Promise<Record<number, string[]>> {
  const lines = jobsCands
    .map((j, i) => `Darbas ${i}: "${j.phrase}"\n  Kandidatai: ${j.cands.join("; ")}`)
    .join("\n");
  const d = await or<{ choices: { message: { content: string } }[] }>("chat/completions", {
    model: "google/gemini-2.5-flash",
    temperature: 0,
    messages: [
      { role: "system", content: RR_PROMPT },
      { role: "user", content: lines },
    ],
  });
  const obj = parseJson(d.choices[0].message.content) as Record<string, string[]>;
  const out: Record<number, string[]> = {};
  for (const [k, v] of Object.entries(obj)) out[Number(k)] = Array.isArray(v) ? v : [];
  return out;
}

export async function POST(req: Request) {
  if (!KEY) return NextResponse.json({ error: "no OPENROUTER_API_KEY" }, { status: 500 });
  try {
    const { text } = (await req.json()) as { text?: string };
    if (!text || text.trim().length < 5) return NextResponse.json({ error: "tuščias tekstas" }, { status: 400 });

    const phrases = await segment(text);
    const vecs = await embed(phrases);
    // dense top-CAND candidates per job
    const dense = phrases.map((_phrase, i) => {
      const q = vecs[i];
      return CATS.map((c, ci) => ({ name: c.name, slug: c.slug, score: dot(q, CAT_UNIT[ci]) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, CAND);
    });
    // one LLM call: pick 1-2 logical per job from its candidates
    let chosen: Record<number, string[]> = {};
    try {
      chosen = await rerank(phrases.map((phrase, i) => ({ phrase, cands: dense[i].map((d) => d.name) })));
    } catch {
      chosen = {}; // fall back to dense top-2 below
    }

    const jobs = phrases.map((phrase, i) => {
      const picks = (chosen[i] ?? [])
        .map((n) => byFold.get(fold(n)))
        .filter((c): c is Cat => !!c);
      const suggestions = (picks.length ? picks : dense[i].slice(0, 2)).map((c) => ({ name: c.name, slug: c.slug }));
      // "daugiau" = the broader dense list minus what's already suggested
      const taken = new Set(suggestions.map((s) => s.slug));
      const more = dense[i].filter((d) => !taken.has(d.slug)).slice(0, 5).map((d) => ({ name: d.name, slug: d.slug }));
      return { phrase, suggestions, more };
    });
    return NextResponse.json({ jobs });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
