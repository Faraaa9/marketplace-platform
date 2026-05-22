#!/usr/bin/env node
/**
 * backfill-imported-providers.js
 *
 * Phase 2.2: creates a ProviderProfile row for every imported SupplierRecord,
 * so ProviderProfile becomes the single provider entity.
 *
 *   - Unclaimed supplier -> new ProviderProfile (userId=null, status="unclaimed",
 *     sourceType="imported", isActive=false — not surfaced in the live flow).
 *   - Claimed supplier   -> catalog data merged into the claimer's existing
 *     ProviderProfile (only fills BLANK fields, never overwrites owner edits).
 *
 * Idempotent: dedup by externalSourceUrl — re-running skips already-backfilled.
 * Additive: SupplierRecord rows are NOT modified or deleted (Phase 5 cleanup).
 * Reversible: delete ProviderProfile rows where sourceType="imported".
 *
 * Usage:
 *   node scripts/backfill-imported-providers.js --dry-run
 *   node scripts/backfill-imported-providers.js
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes("--dry-run");

function parseGallery(raw) {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v.filter((s) => typeof s === "string");
  } catch {}
  return raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
}

function uniqueSlug(base, takenSlugs) {
  if (!base) return null;
  let slug = base;
  let n = 2;
  while (takenSlugs.has(slug)) {
    slug = `${base}-${n}`;
    n++;
  }
  takenSlugs.add(slug);
  return slug;
}

async function main() {
  console.log(`=== Backfill Imported Providers ${DRY_RUN ? "(DRY RUN — no writes)" : ""} ===`);

  const suppliers = await prisma.supplierRecord.findMany({
    include: {
      identities: {
        where: { ownershipStatus: { in: ["owner", "manager"] } },
        select: { userId: true },
        take: 1,
      },
    },
  });
  console.log(`Imported SupplierRecords: ${suppliers.length}`);

  // Idempotency + collision safety: load existing ProviderProfile keys.
  const existing = await prisma.providerProfile.findMany({
    select: { externalSourceUrl: true, slug: true },
  });
  const backfilled = new Set(existing.map((p) => p.externalSourceUrl).filter(Boolean));
  const takenSlugs = new Set(existing.map((p) => p.slug).filter(Boolean));

  let created = 0, merged = 0, skipped = 0, noKey = 0;

  for (const s of suppliers) {
    if (!s.externalSourceUrl) {
      noKey++;
      console.warn(`  ! no externalSourceUrl: "${s.displayName}" — skipped`);
      continue;
    }
    if (backfilled.has(s.externalSourceUrl)) {
      skipped++;
      continue;
    }

    const ownerUserId = s.identities[0]?.userId || null;
    const data = {
      displayName: s.displayName,
      description: s.description,
      shortSummary: s.shortSummary,
      location: s.city,
      phone: s.phonePublic,
      publicEmail: s.emailPublic,
      website: s.websiteUrl,
      companyCode: s.companyCode,
      isVerified: s.isVerified,
      heroImageUrl: s.heroImageUrl,
      images: parseGallery(s.galleryUrls),
      rating: s.rating,
      reviewCount: s.reviewCount,
      externalSource: s.externalSource || "paslaugos.lt",
      externalSourceUrl: s.externalSourceUrl,
      enrichedAt: s.enrichedAt,
      metadataJson: s.metadataJson,
      sourceType: "imported",
    };

    if (ownerUserId) {
      // Case A — claimed: enrich the claimer's existing ProviderProfile.
      const existingProfile = await prisma.providerProfile.findUnique({
        where: { userId: ownerUserId },
      });
      if (existingProfile) {
        const fill = {};
        for (const [k, v] of Object.entries(data)) {
          const cur = existingProfile[k];
          const isBlank =
            cur === null || cur === undefined || cur === "" ||
            (Array.isArray(cur) && cur.length === 0);
          if (isBlank && v !== null && v !== undefined && v !== "") fill[k] = v;
        }
        fill.externalSourceUrl = s.externalSourceUrl; // dedup key, always set
        if (!DRY_RUN && Object.keys(fill).length > 0) {
          await prisma.providerProfile.update({ where: { id: existingProfile.id }, data: fill });
        }
        backfilled.add(s.externalSourceUrl);
        merged++;
        continue;
      }
    }

    // Case B — unclaimed (or claimed without a profile): standalone profile.
    const slug = uniqueSlug(s.slug, takenSlugs);
    if (!DRY_RUN) {
      await prisma.providerProfile.create({
        data: {
          ...data,
          userId: ownerUserId,
          slug,
          status: ownerUserId ? "claimed" : "unclaimed",
          isActive: false,
        },
      });
    }
    backfilled.add(s.externalSourceUrl);
    created++;
  }

  console.log(`\nCreated:  ${created} new ProviderProfile rows`);
  console.log(`Merged:   ${merged} (into existing claimed profiles)`);
  console.log(`Skipped:  ${skipped} (already backfilled)`);
  if (noKey) console.log(`No key:   ${noKey} (no externalSourceUrl — skipped)`);
  if (!DRY_RUN) {
    const total = await prisma.providerProfile.count();
    const imported = await prisma.providerProfile.count({ where: { sourceType: "imported" } });
    console.log(`\nProviderProfile total: ${total} (imported: ${imported})`);
  }
  console.log(DRY_RUN ? "\nDry run complete — no changes written." : "\nDone.");
  await prisma.$disconnect();
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
