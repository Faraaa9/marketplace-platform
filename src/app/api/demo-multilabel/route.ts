import { NextResponse } from "next/server";
import categories from "../../demo-multilabel/categories.json";

// PHASE 0 vertical-slice demo ONLY (feature branch, not main). Minimal end-to-end:
// LLM segmentation -> per-job embed (text-embedding-3-large @ dimensions:1536) ->
// cosine vs ~15 hardcoded category vectors -> top-5 suggestions. No DB/pgvector.

const KEY = process.env.OPENROUTER_API_KEY;
const SEG_PROMPT =
  "Tu skaidai paslaugų užklausas į ATSKIRUS darbus. Grąžink TIK JSON masyvą trumpų darbų frazių. " +
  "Numanomus darbus irgi išskirk (pvz. 'pilna vonios renovacija' -> griovimas + plytelės + santechnika). " +
  'Pvz.: "Sienų dažymas, plytelių klojimas ir kriauklės" -> ["sienų dažymas","plytelių klojimas","kriauklės keitimas"]';

type Cat = { name: string; slug: string; vec: number[] };
const CATS = categories as Cat[];

function unit(v: number[]): number[] {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  return v.map((x) => x / n);
}
const CAT_UNIT = CATS.map((c) => unit(c.vec));
function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

async function or<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`https://openrouter.ai/api/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenRouter ${path} ${res.status}`);
  return (await res.json()) as T;
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
  const raw = d.choices[0].message.content.trim().replace(/```json|```/g, "").trim();
  try {
    const arr = JSON.parse(raw) as unknown[];
    return arr.map((x) => String(x).trim()).filter(Boolean);
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

export async function POST(req: Request) {
  if (!KEY) return NextResponse.json({ error: "no OPENROUTER_API_KEY" }, { status: 500 });
  try {
    const { text } = (await req.json()) as { text?: string };
    if (!text || text.trim().length < 5) {
      return NextResponse.json({ error: "tuščias tekstas" }, { status: 400 });
    }
    const jobs = await segment(text);
    const vecs = await embed(jobs);
    const result = jobs.map((phrase, i) => {
      const q = vecs[i];
      const scored = CATS.map((c, ci) => ({
        name: c.name,
        slug: c.slug,
        score: Math.round(dot(q, CAT_UNIT[ci]) * 1000) / 1000,
      }));
      scored.sort((a, b) => b.score - a.score);
      return { phrase, suggestions: scored.slice(0, 5) };
    });
    return NextResponse.json({ jobs: result });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
