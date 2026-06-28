import { prisma } from "@/lib/prisma";

/**
 * Phase 3 dense retrieval (Phase A scaffolding — the `category_embedding` table
 * is NOT yet migrated; see docs/ai-routing/phase3-impl/migration.sql). Embeds a
 * job phrase with text-embedding-3-large @ dimensions:1536 (the test-confirmed
 * production dim) via the existing OpenRouter key, then pgvector cosine top-K.
 * INVARIANT: candidates come only from the live taxonomy — never fabricated.
 */
export const DENSE_EMB_MODEL = "openai/text-embedding-3-large";
export const DENSE_EMB_DIM = 1536;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY missing");
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: DENSE_EMB_MODEL, input: texts, dimensions: DENSE_EMB_DIM }),
  });
  if (!res.ok) throw new Error(`embeddings ${res.status}`);
  const d = (await res.json()) as { data: { embedding: number[]; index: number }[] };
  return d.data.sort((a, b) => a.index - b.index).map((r) => r.embedding);
}

export interface DenseCandidate {
  categoryId: string;
  slug: string;
  name: string;
}

/**
 * pgvector cosine top-K for one job-phrase embedding. Wide K (default 15) — this
 * is the candidate pool the LLM rerank selects from; recall@20 matters here, not
 * precision. Returns [] on any failure so the caller can fall back to lexical.
 */
export async function denseTopK(embedding: number[], k = 15): Promise<DenseCandidate[]> {
  try {
    const vec = `[${embedding.join(",")}]`;
    const rows = await prisma.$queryRaw<{ id: string; slug: string; name: string }[]>`
      select c.id, c.slug, c.name
      from category_embedding e
      join "Category" c on c.id = e.category_id
      order by e.embedding <=> ${vec}::vector
      limit ${k}
    `;
    return rows.map((r) => ({ categoryId: r.id, slug: r.slug, name: r.name }));
  } catch {
    return [];
  }
}
