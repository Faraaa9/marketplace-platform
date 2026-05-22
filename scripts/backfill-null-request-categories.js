#!/usr/bin/env node
/**
 * backfill-null-request-categories.js
 *
 * One-time cleanup: assigns a curated categoryId to specific legacy requests
 * that were created via the not-yet-deployed old form without one.
 *
 * Only the curated `categoryId` is set — the legacy `category` string column
 * is left untouched so the not-yet-deployed old production code is unaffected.
 *
 * Idempotent: only requests still missing `categoryId` are updated.
 *
 * Usage:
 *   node scripts/backfill-null-request-categories.js --dry-run   # preview
 *   node scripts/backfill-null-request-categories.js             # apply
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

// Each legacy request (matched by a distinctive title fragment) -> curated slug.
// Only requests with a clear, unambiguous category are listed here.
const MAPPINGS = [
  { titleContains: "Rūsio patalpos", categorySlug: "kapitalinis-ir-patalpu-remontas" },
  { titleContains: "Masažisto paslaugos", categorySlug: "sveikata-ir-gydymas" },
  { titleContains: "IKEA baldų surinkimas", categorySlug: "smulkus-meistrai-i-namus" },
];

async function main() {
  console.log(`=== Backfill null request categories ${DRY_RUN ? "(DRY RUN — no writes)" : ""} ===\n`);

  let updated = 0;
  let skipped = 0;
  for (const m of MAPPINGS) {
    const category = await prisma.category.findUnique({
      where: { slug: m.categorySlug },
      select: { id: true, name: true },
    });
    if (!category) {
      console.log(`  ! category slug not found: ${m.categorySlug} — skipped`);
      continue;
    }
    const request = await prisma.serviceRequest.findFirst({
      where: { title: { contains: m.titleContains }, categoryId: null },
      select: { id: true, title: true },
    });
    if (!request) {
      console.log(`  · "${m.titleContains}" — no uncategorized match (already done?) — skipped`);
      skipped++;
      continue;
    }
    console.log(`  → "${request.title}"  ->  ${category.name}`);
    if (!DRY_RUN) {
      await prisma.serviceRequest.update({
        where: { id: request.id },
        data: { categoryId: category.id },
      });
    }
    updated++;
  }

  console.log(`\n${updated} request(s) ${DRY_RUN ? "would be" : ""} categorized, ${skipped} skipped.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
