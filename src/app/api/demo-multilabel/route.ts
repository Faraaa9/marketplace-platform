import { NextResponse } from "next/server";
import { embedTexts, denseTopK } from "@/lib/category-dense";
import { rerankJobs } from "@/lib/category-rerank";

// PHASE A demo on REAL data: segmentation -> per-job embed (text-embedding-3-large
// @1536) -> pgvector denseTopK(20) over the full ~1916 category_embedding table ->
// LLM rerank picks 1-2 logical/job. Same production modules as the gate.

const KEY = process.env.OPENROUTER_API_KEY;
const SEG_PROMPT =
  "Tu skaidai paslaugų užklausas į ATSKIRUS darbus. Grąžink TIK JSON masyvą trumpų darbų frazių. " +
  "Numanomus darbus irgi išskirk (pvz. 'pilna vonios renovacija' -> griovimas + plytelės + santechnika). " +
  'Pvz.: "Sienų dažymas, plytelių klojimas ir kriauklės" -> ["sienų dažymas","plytelių klojimas","kriauklės keitimas"]';

async function segment(text: string): Promise<string[]> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      temperature: 0,
      messages: [
        { role: "system", content: SEG_PROMPT },
        { role: "user", content: text },
      ],
    }),
  });
  if (!res.ok) return [text];
  const d = (await res.json()) as { choices: { message: { content: string } }[] };
  const raw = d.choices[0].message.content.trim().replace(/```json|```/g, "").trim();
  try {
    return (JSON.parse(raw) as unknown[]).map((x) => String(x).trim()).filter(Boolean);
  } catch {
    return [text];
  }
}

export async function POST(req: Request) {
  if (!KEY) return NextResponse.json({ error: "no OPENROUTER_API_KEY" }, { status: 500 });
  try {
    const { text } = (await req.json()) as { text?: string };
    if (!text || text.trim().length < 5) return NextResponse.json({ error: "tuščias tekstas" }, { status: 400 });

    const phrases = await segment(text);
    const vecs = await embedTexts(phrases);
    // REAL pgvector: top-20 candidates per job from the full ~1916-category table.
    const dense = await Promise.all(vecs.map((v) => denseTopK(v, 20)));
    // LLM rerank: 1-2 logical picks per job from its candidates.
    const chosen = await rerankJobs(phrases.map((phrase, i) => ({ phrase, candidates: dense[i].map((c) => c.name) })));

    const jobs = phrases.map((phrase, i) => {
      const pickNames = new Set(chosen[i] ?? []);
      const picks = dense[i].filter((c) => pickNames.has(c.name));
      const suggestions = (picks.length ? picks : dense[i].slice(0, 2)).map((c) => ({ name: c.name, slug: c.slug }));
      const taken = new Set(suggestions.map((s) => s.slug));
      const more = dense[i].filter((c) => !taken.has(c.slug)).slice(0, 5).map((c) => ({ name: c.name, slug: c.slug }));
      return { phrase, suggestions, more };
    });
    return NextResponse.json({ jobs });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
