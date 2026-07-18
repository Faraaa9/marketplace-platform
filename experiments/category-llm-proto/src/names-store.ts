/**
 * Names-only variant: embed every category NAME (no enriched typical-phrases) into
 * a LOCAL in-memory store, cosine top-K in JS. Compares against the live enriched
 * table (name + typical phrases). Read-only against prod (only reads the name list).
 * Vectors cached to cache/names-store.json so it's built once.
 */
import fs from "node:fs";
import path from "node:path";
import { Candidate, allEmbeddedCategories, embed } from "./clients";

const STORE_FILE = path.join(__dirname, "../cache/names-store.json");
interface Row { categoryId: string; slug: string; name: string; vec: number[] }
let store: Row[] | null = null;

export async function buildNamesStore(): Promise<number> {
  if (fs.existsSync(STORE_FILE)) {
    store = JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
    return store!.length;
  }
  const cats = await allEmbeddedCategories();
  const vecs = await embed(cats.map((c) => c.name));
  store = cats.map((c, i) => ({ categoryId: c.id, slug: c.slug, name: c.name, vec: vecs[i] }));
  fs.writeFileSync(STORE_FILE, JSON.stringify(store));
  return store.length;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export function namesTopK(queryVec: number[], k: number): Candidate[] {
  if (!store) throw new Error("names store not built");
  return store
    .map((r) => ({ r, s: cosine(queryVec, r.vec) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, k)
    .map(({ r }) => ({ categoryId: r.categoryId, slug: r.slug, name: r.name }));
}
