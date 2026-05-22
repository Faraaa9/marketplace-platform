#!/usr/bin/env node
/**
 * backfill-provider-categories.js
 *
 * Phase 3.2b: creates ProviderProfileCategory rows from a registered
 * provider's legacy `specializations[]`, via the phase3 old->curated mapping.
 * Capped at 6 categories per provider.
 *
 * Scope: registered providers only (sourceType="self_created"). Imported
 * providers are remapped later (Phase 3 decision D1 — deferred; their
 * specializations array is empty anyway).
 *
 * Idempotent: createMany skipDuplicates + @@unique(providerProfileId,categoryId).
 * Additive: the legacy `specializations` array is left untouched.
 * Reversible: delete ProviderProfileCategory rows.
 *
 * Usage:
 *   node scripts/backfill-provider-categories.js --dry-run   # audit + preview
 *   node scripts/backfill-provider-categories.js             # apply
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");
const { resolveCategoryMap } = require("./phase3-category-map");

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");
const MAX_CATEGORIES = 6;

async function main() {
  console.log(`=== Backfill Provider Categories ${DRY_RUN ? "(DRY RUN — no writes)" : ""} ===\n`);

  const { resolved, errors } = await resolveCategoryMap(prisma);
  if (errors.length) {
    console.error("Mapping resolution errors:");
    errors.forEach((e) => console.error(`  ! ${e}`));
    throw new Error("Aborting — fix the mapping before backfilling.");
  }

  const providers = await prisma.providerProfile.findMany({
    where: { sourceType: "self_created" },
    select: { id: true, displayName: true, specializations: true },
  });
  console.log(`Registered providers (sourceType="self_created"): ${providers.length}`);

  // Audit: specialization value frequencies.
  const tally = new Map();
  for (const p of providers) {
    for (const s of p.specializations) tally.set(s, (tally.get(s) || 0) + 1);
  }
  console.log("\nspecializations values:");
  for (const [val, n] of [...tally].sort((a, b) => b[1] - a[1])) {
    const t = resolved.has(val) ? resolved.get(val) : undefined;
    if (t === undefined) console.log(`  ⚠ "${val}" ×${n} — NOT in mapping (skipped)`);
    else if (t === null) console.log(`  · "${val}" ×${n} — no category (kita)`);
    else console.log(`  → "${val}" ×${n} → ${t.label}`);
  }

  // Build the ProviderProfileCategory rows (deduped, capped at MAX_CATEGORIES).
  const rows = [];
  let cappedCount = 0;
  for (const p of providers) {
    const seen = new Set();
    const ids = [];
    for (const s of p.specializations) {
      const t = resolved.has(s) ? resolved.get(s) : undefined;
      if (!t) continue; // unmapped or kita
      if (seen.has(t.categoryId)) continue;
      seen.add(t.categoryId);
      ids.push(t.categoryId);
    }
    if (ids.length > MAX_CATEGORIES) {
      cappedCount++;
      ids.length = MAX_CATEGORIES;
    }
    ids.forEach((categoryId, i) => {
      rows.push({ providerProfileId: p.id, categoryId, sortOrder: i });
    });
  }
  console.log(`\n${rows.length} ProviderProfileCategory row(s) to create across ${providers.length} provider(s).`);
  if (cappedCount) console.log(`${cappedCount} provider(s) capped at ${MAX_CATEGORIES} categories.`);

  if (!DRY_RUN) {
    const res = await prisma.providerProfileCategory.createMany({
      data: rows,
      skipDuplicates: true,
    });
    const total = await prisma.providerProfileCategory.count();
    console.log(`\nCreated ${res.count} row(s) (${rows.length - res.count} already existed).`);
    console.log(`ProviderProfileCategory total: ${total}`);
  }
  console.log(DRY_RUN ? "\nDry run complete — no changes written." : "\nDone.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
