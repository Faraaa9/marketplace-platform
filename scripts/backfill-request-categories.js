#!/usr/bin/env node
/**
 * backfill-request-categories.js
 *
 * Phase 3.2a: sets ServiceRequest.categoryId from the legacy `category`
 * string, via the phase3 old->curated mapping.
 *
 * Idempotent: per-code updateMany — re-running sets the same value.
 * Additive: the legacy `category` string column is left untouched.
 * Reversible: clear ServiceRequest.categoryId.
 *
 * Usage:
 *   node scripts/backfill-request-categories.js --dry-run   # audit + preview
 *   node scripts/backfill-request-categories.js             # apply
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");
const { resolveCategoryMap } = require("./phase3-category-map");

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log(`=== Backfill Request Categories ${DRY_RUN ? "(DRY RUN — no writes)" : ""} ===\n`);

  const { resolved, errors } = await resolveCategoryMap(prisma);
  if (errors.length) {
    console.error("Mapping resolution errors:");
    errors.forEach((e) => console.error(`  ! ${e}`));
    throw new Error("Aborting — fix the mapping before backfilling.");
  }

  // Audit: distinct ServiceRequest.category values.
  const groups = await prisma.serviceRequest.groupBy({
    by: ["category"],
    _count: { _all: true },
  });
  console.log("ServiceRequest.category values:");
  let mappable = 0;
  let unmapped = 0;
  for (const g of groups.sort((a, b) => b._count._all - a._count._all)) {
    const target = resolved.has(g.category) ? resolved.get(g.category) : undefined;
    if (target === undefined) {
      console.log(`  ⚠ "${g.category}" ×${g._count._all} — NOT in mapping (skipped)`);
      unmapped += g._count._all;
    } else if (target === null) {
      console.log(`  · "${g.category}" ×${g._count._all} — no category (kita; categoryId stays null)`);
    } else {
      console.log(`  → "${g.category}" ×${g._count._all} → ${target.label} [${target.categoryId}]`);
      mappable += g._count._all;
    }
  }
  console.log(`\n${mappable} request(s) to set, ${unmapped} left unmapped.\n`);

  if (!DRY_RUN) {
    let updated = 0;
    for (const [code, target] of resolved) {
      if (!target) continue;
      const res = await prisma.serviceRequest.updateMany({
        where: { category: code },
        data: { categoryId: target.categoryId },
      });
      updated += res.count;
    }
    const withId = await prisma.serviceRequest.count({ where: { categoryId: { not: null } } });
    const total = await prisma.serviceRequest.count();
    console.log(`Updated ${updated} ServiceRequest row(s).`);
    console.log(`ServiceRequest.categoryId set: ${withId}/${total}`);
  }
  console.log(DRY_RUN ? "\nDry run complete — no changes written." : "\nDone.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
