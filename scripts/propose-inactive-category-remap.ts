/**
 * READ-ONLY dry run: OPEN requests whose categories are outside the canonical
 * service taxonomy (legacy `svc-*`, paslaugos.lt, dedup-deactivated copies) match
 * no provider. For each such category this proposes an active canonical twin:
 *
 *   1. alias   — a CategoryAlias (name or slug) on a canonical category
 *   2. name    — exact normalized name match (how the 2026-06 dedup picked twins)
 *   3. guess   — best token overlap with a canonical name (≥0.5; needs a human look)
 *   4. parent  — 1/2 applied to the nearest ancestor (coarse: usually a root)
 *
 * Writes NOTHING. Applying the proposal is a separate, approved manual migration.
 *
 * Run:
 *   npx ts-node --transpile-only -r ./scripts/_register-paths.js \
 *     --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' \
 *     scripts/propose-inactive-category-remap.ts
 */
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(__dirname, "../.env.local") });
config({ path: path.resolve(__dirname, "../.env") });

const norm = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
// Generic words every other category name shares; overlapping on them is noise.
const STOP = new Set(["paslaugos", "darbai", "kiti", "kitos", "ir"]);
const tokens = (s: string) => new Set(norm(s).split(" ").filter((t) => t.length > 2 && !STOP.has(t)));

async function main(): Promise<void> {
  const { prisma } = require("@/lib/prisma") as typeof import("@/lib/prisma");
  const { SERVICE_CATEGORY_WHERE } =
    require("@/lib/service-categories") as typeof import("@/lib/service-categories");

  const canonical = await prisma.category.findMany({
    where: SERVICE_CATEGORY_WHERE,
    select: { id: true, name: true, path: true, aliases: { select: { aliasName: true, aliasSlug: true } } },
  });
  const canonicalIds = new Set(canonical.map((c) => c.id));
  const byName = new Map<string, (typeof canonical)[number]>();
  const byAlias = new Map<string, (typeof canonical)[number]>();
  for (const c of canonical) {
    if (!byName.has(norm(c.name))) byName.set(norm(c.name), c);
    for (const a of c.aliases) {
      byAlias.set(norm(a.aliasName), c);
      if (a.aliasSlug) byAlias.set(norm(a.aliasSlug), c);
    }
  }

  const requests = await prisma.serviceRequest.findMany({
    where: { status: "OPEN" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      moderationStatus: true,
      categoryId: true,
      categories: { select: { categoryId: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const affected = requests
    .map((r) => {
      const ids = [...new Set([r.categoryId, ...r.categories.map((c) => c.categoryId)].filter((x): x is string => !!x))];
      return { ...r, ids, bad: ids.filter((id) => !canonicalIds.has(id)) };
    })
    .filter((r) => r.bad.length > 0 && !r.ids.some((id) => canonicalIds.has(id)));

  const badIds = [...new Set(affected.flatMap((r) => r.bad))];
  const all = await prisma.category.findMany({ select: { id: true, name: true, slug: true, parentId: true } });
  const catById = new Map(all.map((c) => [c.id, c]));

  function direct(c: { name: string; slug: string }) {
    const alias = byAlias.get(norm(c.name)) ?? byAlias.get(norm(c.slug));
    if (alias) return { via: "alias", target: alias };
    const named = byName.get(norm(c.name));
    if (named) return { via: "name", target: named };
    return null;
  }

  function propose(id: string) {
    const cat = catById.get(id);
    if (!cat) return { name: "(missing row)", via: "none", target: null as null | (typeof canonical)[number], score: 0 };
    const hit = direct(cat);
    if (hit) return { name: cat.name, ...hit, score: 1 };
    const want = tokens(cat.name);
    let best: { target: (typeof canonical)[number]; score: number } | null = null;
    for (const c of canonical) {
      const have = tokens(c.name);
      const overlap = [...want].filter((t) => have.has(t)).length;
      const score = overlap / Math.max(1, new Set([...want, ...have]).size);
      if (score > (best?.score ?? 0)) best = { target: c, score };
    }
    if (best && best.score >= 0.5) return { name: cat.name, via: "guess", target: best.target, score: best.score };
    for (let p = cat.parentId ? catById.get(cat.parentId) : undefined; p; p = p.parentId ? catById.get(p.parentId) : undefined) {
      const up = direct(p);
      if (up) return { name: cat.name, via: `parent (${p.name})`, target: up.target, score: 1 };
    }
    return { name: cat.name, via: "none", target: null, score: 0 };
  }

  const proposals = new Map(badIds.map((id) => [id, propose(id)]));

  console.log(`OPEN requests with ONLY inactive/non-canonical categories: ${affected.length}`);
  console.log(`Distinct inactive categories: ${badIds.length}\n`);
  console.log("| inactive id | name | via | proposed canonical | path | requests |");
  console.log("|---|---|---|---|---|---|");
  for (const id of badIds) {
    const p = proposals.get(id)!;
    const n = affected.filter((r) => r.bad.includes(id)).length;
    const conf = p.via === "guess" ? ` (${p.score.toFixed(2)})` : "";
    console.log(`| ${id} | ${p.name} | ${p.via}${conf} | ${p.target ? `${p.target.id} ${p.target.name}` : "—"} | ${p.target?.path ?? ""} | ${n} |`);
  }
  console.log("\n| request | created | moderation | title | inactive → proposed |");
  console.log("|---|---|---|---|---|");
  for (const r of affected) {
    const map = r.bad.map((id) => `${proposals.get(id)!.name} → ${proposals.get(id)!.target?.name ?? "—"}`).join("; ");
    console.log(`| ${r.id} | ${r.createdAt.toISOString().slice(0, 10)} | ${r.moderationStatus} | ${r.title.slice(0, 60)} | ${map} |`);
  }
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
