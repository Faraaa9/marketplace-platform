#!/usr/bin/env node
/**
 * backfill-category-aliases.js
 *
 * Phase 3.5: registers the 12 legacy SERVICE_CATEGORIES codes as CategoryAlias
 * rows so old `?category=<code>` URLs — indexed by search engines from the
 * pre-Phase-3 sitemap (/uzklausos?category=...&location=...) — still resolve
 * to a curated category. `resolveCategoryParam` (src/lib/service-categories.ts)
 * reads these.
 *
 * Idempotent: dedup by (aliasSlug, source).
 * Reversible: delete CategoryAlias rows where source = "legacy-service-category".
 *
 * Usage:
 *   node scripts/backfill-category-aliases.js --dry-run
 *   node scripts/backfill-category-aliases.js
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");
const { resolveCategoryMap } = require("./phase3-category-map");

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");
const SOURCE = "legacy-service-category";

// Legacy SERVICE_CATEGORIES display labels (were in src/lib/constants.ts,
// removed in Phase 3) — used as the human-readable CategoryAlias name.
const OLD_LABELS = {
  statyba: "Statyba ir remontas",
  santechnika: "Santechnika",
  elektra: "Elektros darbai",
  valymas: "Valymo paslaugos",
  transportas: "Transportas ir perkraustymas",
  sodas: "Sodo ir aplinkos tvarkymas",
  it: "IT paslaugos",
  dizainas: "Dizainas ir interjeras",
  teise: "Teisinės paslaugos",
  buhalterija: "Buhalterija",
  svietimas: "Švietimas ir korepetitoriai",
  kita: "Kita",
};

async function main() {
  console.log(`=== Backfill Category Aliases ${DRY_RUN ? "(DRY RUN — no writes)" : ""} ===\n`);

  const { resolved, errors } = await resolveCategoryMap(prisma);
  if (errors.length) {
    console.error("Mapping resolution errors:");
    errors.forEach((e) => console.error(`  ! ${e}`));
    throw new Error("Aborting — fix the mapping before backfilling.");
  }

  let created = 0;
  let skipped = 0;
  let noTarget = 0;
  for (const [code, target] of resolved) {
    if (!target) {
      noTarget++;
      console.log(`  · "${code}" — no curated category, no alias created`);
      continue;
    }
    const existing = await prisma.categoryAlias.findFirst({
      where: { aliasSlug: code, source: SOURCE },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }
    console.log(`  → "${code}" → ${target.label} [${target.categoryId}]`);
    if (!DRY_RUN) {
      await prisma.categoryAlias.create({
        data: {
          categoryId: target.categoryId,
          aliasName: OLD_LABELS[code] || code,
          aliasSlug: code,
          source: SOURCE,
        },
      });
    }
    created++;
  }

  console.log(`\nCreated: ${created}, skipped (already exist): ${skipped}, no target: ${noTarget}`);
  console.log(DRY_RUN ? "\nDry run complete — no changes written." : "\nDone.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
