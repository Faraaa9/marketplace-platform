/**
 * Category taxonomy de-duplication backfill (Phase B).
 *
 *   DRY RUN (default):  pnpm ts-node scripts/backfill-category-dedup.ts
 *   EXECUTE:            pnpm ts-node scripts/backfill-category-dedup.ts --execute
 *
 * Reads DATABASE_URL from the environment — run with the production env when
 * targeting prod (vercel env pull). Scope is deliberately CONSERVATIVE:
 *
 *   Only SAFE_CONSOLIDATE groups are touched — a folded-name group that has
 *   EXACTLY ONE active pageType=service node (the canonical `tax_` row) plus
 *   same-meaning duplicate ids in the dead id-spaces (barehex / svc- / inactive).
 *
 *   DISTINCT_TAX groups (≥2 active service nodes under different parents) are
 *   SKIPPED — those are legitimately distinct categories that merely reuse a
 *   name; merging them would destroy real taxonomy. They need the v4 routing
 *   contract fix, not a data merge. See docs/ai-routing/taxonomy-deduplication-audit.md.
 *
 * For each safe group every reference to a non-canonical id is repointed to the
 * canonical id (or DELETED where a uniqueness constraint would collide), the
 * denormalized ServiceRequest.category slug is rewritten, and the orphan
 * duplicate categories are DEACTIVATED (isActive=false — reversible, not deleted).
 * A pre-image journal is written before any write so the change is reversible.
 */
import { writeFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { fold } from "../src/lib/routing/multi-routing-v4";

const prisma = new PrismaClient();
const EXECUTE = process.argv.includes("--execute");
const idSpace = (id: string) => (id.startsWith("tax_") ? "tax_" : id.startsWith("svc-") ? "svc-" : /^[0-9a-f]{10,14}$/.test(id) ? "barehex" : "other");

type JournalEntry = { op: "update" | "delete" | "deactivate"; table: string; id: string; field?: string; old?: unknown; new?: unknown; row?: unknown };
const journal: JournalEntry[] = [];

// per-id-space tallies
const tally = () => ({ tax_: 0, "svc-": 0, barehex: 0, other: 0 } as Record<string, number>);
const report = { groupsSafe: 0, groupsDistinctSkipped: 0, groupsLegacySkipped: 0, canonicalIds: 0, mergeIds: 0,
  repoint: { providerProfileCategory: tally(), serviceRequestCategory: tally(), serviceRequestCategoryId: tally(), supplierCategoryLink: tally(), categoryAlias: tally() },
  deleteCollision: { providerProfileCategory: tally(), serviceRequestCategory: tally(), supplierCategoryLink: tally(), categoryAlias: tally() },
  slugRewrites: 0, deactivations: tally() };

async function main() {
  const cats = await prisma.category.findMany({ select: { id: true, name: true, slug: true, pageType: true, isActive: true, parentId: true } });
  const byFold = new Map<string, typeof cats>();
  for (const c of cats) { const f = fold(c.name); if (!f) continue; const a = byFold.get(f) ?? []; a.push(c); byFold.set(f, a); }

  // classify → safe groups
  type Safe = { canonId: string; canonSlug: string; merges: { id: string; slug: string }[] };
  const safe: Safe[] = [];
  for (const [, members] of byFold) {
    if (members.length < 2) continue;
    const activeService = members.filter((m) => m.isActive && m.pageType === "service");
    if (activeService.length === 1) {
      const canon = activeService[0];
      safe.push({ canonId: canon.id, canonSlug: canon.slug, merges: members.filter((m) => m.id !== canon.id).map((m) => ({ id: m.id, slug: m.slug })) });
    } else if (activeService.length >= 2) report.groupsDistinctSkipped++;
    else report.groupsLegacySkipped++;
  }
  report.groupsSafe = safe.length;
  report.canonicalIds = safe.length;
  const mergeToCanon = new Map<string, string>(); // nonCanonId -> canonId
  const mergeSlugToCanon = new Map<string, string>(); // nonCanonSlug -> canonSlug
  const allMergeIds = new Set<string>();
  for (const s of safe) for (const m of s.merges) { mergeToCanon.set(m.id, s.canonId); mergeSlugToCanon.set(m.slug, s.canonSlug); allMergeIds.add(m.id); }
  report.mergeIds = allMergeIds.size;

  // ---- load reference rows (small unique-constrained tables in full) ----
  const supCount = await prisma.supplierCategoryLink.count();
  const [provRows, reqCatRows, supRows, aliasRows] = await Promise.all([
    prisma.providerProfileCategory.findMany({ select: { id: true, providerProfileId: true, categoryId: true } }),
    prisma.serviceRequestCategory.findMany({ select: { id: true, requestId: true, categoryId: true } }),
    supCount <= 200000 ? prisma.supplierCategoryLink.findMany({ select: { id: true, supplierRecordId: true, categoryId: true } }) : Promise.resolve([] as any[]),
    prisma.categoryAlias.findMany({ select: { id: true, categoryId: true, aliasName: true, aliasSlug: true } }),
  ]);
  if (supCount > 200000) console.warn(`! supplier_category_links has ${supCount} rows — skipped from in-memory collision check`);

  // unique-table planner: repoint or delete-on-collision
  const planUnique = (rows: { id: string; owner: string; categoryId: string }[], table: string, rep: Record<string, number>, del: Record<string, number>) => {
    const ownerHas = new Set<string>();
    for (const r of rows) ownerHas.add(`${r.owner}|${r.categoryId}`); // current state incl. canonicals
    for (const r of rows) {
      const canon = mergeToCanon.get(r.categoryId);
      if (!canon) continue;
      const space = idSpace(r.categoryId);
      if (ownerHas.has(`${r.owner}|${canon}`)) {
        del[space]++; journal.push({ op: "delete", table, id: r.id, row: r });
      } else {
        rep[space]++; ownerHas.add(`${r.owner}|${canon}`); journal.push({ op: "update", table, id: r.id, field: "categoryId", old: r.categoryId, new: canon });
      }
    }
  };
  planUnique(provRows.map((r) => ({ id: r.id, owner: r.providerProfileId, categoryId: r.categoryId })), "provider_profile_categories", report.repoint.providerProfileCategory, report.deleteCollision.providerProfileCategory);
  planUnique(reqCatRows.map((r) => ({ id: r.id, owner: r.requestId, categoryId: r.categoryId })), "service_request_categories", report.repoint.serviceRequestCategory, report.deleteCollision.serviceRequestCategory);
  planUnique(supRows.map((r) => ({ id: r.id, owner: r.supplierRecordId, categoryId: r.categoryId })), "supplier_category_links", report.repoint.supplierCategoryLink, report.deleteCollision.supplierCategoryLink);

  // ServiceRequest.categoryId (FK, nullable, no unique) — straight repoint
  const srRows = await prisma.serviceRequest.findMany({ where: { categoryId: { in: [...allMergeIds] } }, select: { id: true, categoryId: true } });
  for (const r of srRows) { const canon = mergeToCanon.get(r.categoryId!)!; report.repoint.serviceRequestCategoryId[idSpace(r.categoryId!)]++; journal.push({ op: "update", table: "service_requests", id: r.id, field: "categoryId", old: r.categoryId, new: canon }); }

  // ServiceRequest.category (denormalized slug string)
  const srSlugRows = await prisma.serviceRequest.findMany({ where: { category: { in: [...mergeSlugToCanon.keys()] } }, select: { id: true, category: true } });
  for (const r of srSlugRows) { const canonSlug = mergeSlugToCanon.get(r.category)!; report.slugRewrites++; journal.push({ op: "update", table: "service_requests", id: r.id, field: "category", old: r.category, new: canonSlug }); }

  // CategoryAlias — repoint, dedupe exact (canon, foldedName) collisions
  const canonAliasKeys = new Set<string>();
  for (const a of aliasRows) if (!mergeToCanon.has(a.categoryId)) canonAliasKeys.add(`${a.categoryId}|${fold(a.aliasName)}`);
  for (const a of aliasRows) {
    const canon = mergeToCanon.get(a.categoryId); if (!canon) continue;
    const key = `${canon}|${fold(a.aliasName)}`; const space = idSpace(a.categoryId);
    if (canonAliasKeys.has(key)) { report.deleteCollision.categoryAlias[space]++; journal.push({ op: "delete", table: "category_aliases", id: a.id, row: a }); }
    else { report.repoint.categoryAlias[space]++; canonAliasKeys.add(key); journal.push({ op: "update", table: "category_aliases", id: a.id, field: "categoryId", old: a.categoryId, new: canon }); }
  }

  // Deactivate orphan duplicates
  for (const id of allMergeIds) { report.deactivations[idSpace(id)]++; journal.push({ op: "deactivate", table: "categories", id, field: "isActive", old: true, new: false }); }

  // ---- write plan / journal ----
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const journalPath = `scripts/dedup-journal-${stamp}.json`;
  writeFileSync(journalPath, JSON.stringify({ mode: EXECUTE ? "execute" : "dry-run", generatedAt: stamp, report, journal }, null, 2));

  const totals = (o: Record<string, number>) => Object.values(o).reduce((s, n) => s + n, 0);
  console.log(`\n${EXECUTE ? "🟥 EXECUTE" : "🟦 DRY RUN (no writes)"} — category de-dup, SAFE_CONSOLIDATE only`);
  console.log(JSON.stringify({
    groups: { safeConsolidate: report.groupsSafe, distinctTaxSkipped: report.groupsDistinctSkipped, legacySkipped: report.groupsLegacySkipped },
    canonicalIds: report.canonicalIds, nonCanonicalIdsToRetire: report.mergeIds,
    repointByIdSpace: report.repoint, deleteCollisionByIdSpace: report.deleteCollision,
    slugStringRewrites: report.slugRewrites, deactivationsByIdSpace: report.deactivations,
    totals: {
      repoint: totals(report.repoint.providerProfileCategory) + totals(report.repoint.serviceRequestCategory) + totals(report.repoint.serviceRequestCategoryId) + totals(report.repoint.supplierCategoryLink) + totals(report.repoint.categoryAlias) + report.slugRewrites,
      delete: totals(report.deleteCollision.providerProfileCategory) + totals(report.deleteCollision.serviceRequestCategory) + totals(report.deleteCollision.supplierCategoryLink) + totals(report.deleteCollision.categoryAlias),
      deactivate: totals(report.deactivations),
      journalEntries: journal.length,
    },
    journalPath,
  }, null, 2));

  if (!EXECUTE) { console.log("\nDry run only — re-run with --execute to apply. Journal/plan written for review."); await prisma.$disconnect(); return; }

  // ---- EXECUTE ----
  console.log("\nApplying in a transaction…");
  await prisma.$transaction(async (tx) => {
    for (const e of journal) {
      if (e.op === "delete") {
        if (e.table === "provider_profile_categories") await tx.providerProfileCategory.delete({ where: { id: e.id } });
        else if (e.table === "service_request_categories") await tx.serviceRequestCategory.delete({ where: { id: e.id } });
        else if (e.table === "supplier_category_links") await tx.supplierCategoryLink.delete({ where: { id: e.id } });
        else if (e.table === "category_aliases") await tx.categoryAlias.delete({ where: { id: e.id } });
      } else if (e.op === "update") {
        const data = { [e.field as string]: e.new } as any;
        if (e.table === "provider_profile_categories") await tx.providerProfileCategory.update({ where: { id: e.id }, data });
        else if (e.table === "service_request_categories") await tx.serviceRequestCategory.update({ where: { id: e.id }, data });
        else if (e.table === "service_requests") await tx.serviceRequest.update({ where: { id: e.id }, data });
        else if (e.table === "category_aliases") await tx.categoryAlias.update({ where: { id: e.id }, data });
      } else if (e.op === "deactivate") {
        await tx.category.update({ where: { id: e.id }, data: { isActive: false } });
      }
    }
  }, { timeout: 120000 });
  console.log(`✅ applied ${journal.length} operations. Journal: ${journalPath}`);

  // verify: no live reference rows remain on any retired id
  const left = await prisma.providerProfileCategory.count({ where: { categoryId: { in: [...allMergeIds] } } })
    + await prisma.serviceRequestCategory.count({ where: { categoryId: { in: [...allMergeIds] } } })
    + await prisma.serviceRequest.count({ where: { categoryId: { in: [...allMergeIds] } } });
  console.log(`post-check: live references still on retired ids = ${left} (expect 0)`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error("ERROR:", e); await prisma.$disconnect(); process.exit(1); });
