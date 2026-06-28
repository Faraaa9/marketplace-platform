/**
 * Phase 3 / Phase A backfill (SCAFFOLDING — run AFTER migration.sql is applied).
 * Embeds every active service category with the ENRICHED text recipe and upserts
 * into category_embedding.
 *
 * Recipe (test-chosen — recall@20 72.3% names-only -> 74.7% enriched; breadcrumb/
 * aliases neutral, kept only to disambiguate same-named leaves):
 *   name + breadcrumb + aliases + 3-5 LLM-generated typical customer phrases.
 *
 * Steps: load SERVICE_CATEGORY_WHERE cats -> generate typical phrases (batched
 * LLM) -> build enriched text -> embed (text-embedding-3-large @ 1536) -> upsert.
 * SELECT-only on existing tables; writes ONLY category_embedding.
 *
 *   npx ts-node --transpile-only -r ./scripts/_register-paths.js \
 *     --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' \
 *     scripts/backfill-category-embeddings.ts
 */
require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

import { prisma } from "../src/lib/prisma";
import { SERVICE_CATEGORY_WHERE } from "../src/lib/service-categories";
import { embedTexts, DENSE_EMB_MODEL } from "../src/lib/category-dense";

const SEG_MODEL = "google/gemini-2.5-flash";
const TEXT_VERSION = "name-typ-v1";
const GEN_BATCH = 40;
const EMB_BATCH = 96;

const GEN_SYS =
  "Tau duodamas paslaugų kategorijų sąrašas (su keliu). Kiekvienai kategorijai sugalvok 3-5 TIPINES " +
  "frazes, kuriomis KLIENTAS realiai aprašytų šį darbą (sinonimai, buitinė kalba). Trumpos, lietuviškai. " +
  'Grąžink TIK JSON: {"slug":["frazė",...], ...} su tais pačiais slug.';

async function chat(system: string, user: string): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: SEG_MODEL,
      temperature: 0.3,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`chat ${res.status}`);
  const d = (await res.json()) as { choices: { message: { content: string } }[] };
  return d.choices[0].message.content.trim().replace(/```json|```/g, "").trim();
}

async function main() {
  const rows = await prisma.category.findMany({
    where: SERVICE_CATEGORY_WHERE,
    select: { id: true, name: true, slug: true, depth: true, parentId: true, aliases: { select: { aliasName: true } } },
    orderBy: [{ depth: "asc" }, { sortOrder: "asc" }],
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const leaves = rows.filter((r) => (r.depth ?? 0) > 0);
  const breadcrumb = (r: (typeof rows)[number]): string[] => {
    const out: string[] = [];
    let cur: (typeof rows)[number] | undefined = r;
    while (cur) { out.unshift(cur.name); cur = cur.parentId ? byId.get(cur.parentId) : undefined; }
    return out;
  };

  // 1. typical phrases per category (batched). Reuse a precomputed file if present
  // (scripts/typical_jobs.json {slug:[...]}) to skip regeneration and match the
  // measured recipe exactly; generate only for slugs the file misses.
  const typical = new Map<string, string[]>();
  try {
    const pre = JSON.parse(require("fs").readFileSync(__dirname + "/typical_jobs.json", "utf8")) as Record<string, string[]>;
    for (const c of leaves) if (Array.isArray(pre[c.slug])) typical.set(c.slug, pre[c.slug].slice(0, 5));
    console.log(`  reused ${typical.size}/${leaves.length} typical phrases from file`);
  } catch { /* no precomputed file — generate all */ }
  const need = leaves.filter((c) => !typical.has(c.slug));
  for (let i = 0; i < need.length; i += GEN_BATCH) {
    const batch = need.slice(i, i + GEN_BATCH);
    const listing = batch.map((c) => `${c.slug} = ${[c.name, breadcrumb(c).join(" > ")].join(". ")}`).join("\n");
    try {
      const obj = JSON.parse(await chat(GEN_SYS, listing)) as Record<string, string[]>;
      for (const c of batch) typical.set(c.slug, (Array.isArray(obj[c.slug]) ? obj[c.slug] : []).slice(0, 5));
    } catch {
      for (const c of batch) typical.set(c.slug, []);
    }
    if (i % (GEN_BATCH * 5) === 0) console.log(`  typical phrases ${Math.min(i + GEN_BATCH, leaves.length)}/${leaves.length}`);
  }

  // 2. enriched text + embed + upsert
  let done = 0;
  for (let i = 0; i < leaves.length; i += EMB_BATCH) {
    const batch = leaves.slice(i, i + EMB_BATCH);
    const texts = batch.map((c) => {
      // Recipe: name + 3-5 typical job phrases. Measured best for recall@20 (74.7%);
      // breadcrumb + aliases are neutral-to-negative (dilute the leaf vector), so dropped.
      const extra = (typical.get(c.slug) ?? []).join(". ");
      return [c.name, extra].filter(Boolean).join(". ");
    });
    const vecs = await embedTexts(texts);
    for (let j = 0; j < batch.length; j++) {
      const vec = `[${vecs[j].join(",")}]`;
      await prisma.$executeRaw`
        insert into category_embedding (category_id, embedding, model, text_version, updated_at)
        values (${batch[j].id}, ${vec}::vector, ${DENSE_EMB_MODEL}, ${TEXT_VERSION}, now())
        on conflict (category_id) do update
          set embedding = excluded.embedding, model = excluded.model,
              text_version = excluded.text_version, updated_at = now()
      `;
    }
    done += batch.length;
    console.log(`  embedded ${done}/${leaves.length}`);
  }
  console.log(`DONE: ${done} category embeddings (${TEXT_VERSION}, ${DENSE_EMB_MODEL} @1536).`);
  await prisma.$disconnect();
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
