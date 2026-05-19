#!/usr/bin/env node
/**
 * import-suppliers.js
 *
 * Idempotent import of suppliers_raw.json into PostgreSQL via Prisma.
 * Source data comes from the paslaugos-crawler project.
 *
 * Usage:
 *   node scripts/import-suppliers.js <path-to-suppliers-json> [--dry-run]
 *
 * Example:
 *   node scripts/import-suppliers.js ../paslaugos-crawler/output/suppliers_raw.json
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const rawArgs = process.argv.slice(2);
const flags = new Set(rawArgs.filter((a) => a.startsWith("--")));
const positional = rawArgs.filter((a) => !a.startsWith("--"));
const DRY_RUN = flags.has("--dry-run");

const SOURCE_PATH = positional[0];
if (!SOURCE_PATH) {
  console.error("Usage: node scripts/import-suppliers.js <suppliers-json> [--dry-run]");
  process.exit(1);
}

// ── Helpers ──────────────────────────────────────────────────────────

function loadJson(filePath, label) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error(`ERROR: ${label} not found at ${resolved}`);
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(resolved, "utf8"));
  } catch (e) {
    console.error(`ERROR: Failed to parse ${label}: ${e.message}`);
    process.exit(1);
  }
}

function cleanDisplayName(raw) {
  if (!raw) return null;
  let name = raw.trim().replace(/\.+$/, "").trim();
  return name.length >= 2 ? name : null;
}

function extractCity(text) {
  if (!text) return null;
  const city = text.trim();
  return city.length >= 2 && city.length <= 50 ? city : null;
}

function makeHash(obj) {
  return crypto.createHash("md5").update(JSON.stringify(obj)).digest("hex").substring(0, 16);
}

function validate(items) {
  const errors = [];
  const urls = new Set();

  for (let i = 0; i < items.length; i++) {
    const s = items[i];
    if (!s.profileUrl) errors.push(`[${i}] Missing profileUrl`);
    if (!s.profileSlug) errors.push(`[${i}] Missing profileSlug`);
    if (!s.displayName || s.displayName.length < 2) errors.push(`[${i}] Missing/short displayName`);
    if (s.profileUrl && urls.has(s.profileUrl)) errors.push(`[${i}] Duplicate profileUrl: ${s.profileUrl}`);
    urls.add(s.profileUrl);
    if (!s.categories || s.categories.length === 0) errors.push(`[${i}] No categories for ${s.profileSlug}`);
  }

  return errors;
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Supplier Import (Marketplace Platform) ===");
  if (DRY_RUN) console.log("MODE: dry-run (no DB writes)");

  const raw = loadJson(SOURCE_PATH, "suppliers JSON");
  console.log(`Loaded: ${raw.length} supplier records`);

  const errors = validate(raw);
  if (errors.length > 0) {
    console.error(`\nValidation errors (${errors.length}):`);
    errors.slice(0, 20).forEach((e) => console.error(`  - ${e}`));
    if (errors.length > 20) console.error(`  ... and ${errors.length - 20} more`);
    process.exit(1);
  }
  console.log("Validation: OK");

  const records = raw.map((s) => ({
    displayName: cleanDisplayName(s.displayName) || s.profileSlug,
    slug: s.profileSlug,
    profileUrl: s.profileUrl,
    city: extractCity(s.city),
    phone: s.phone || null,
    shortDesc: s.shortDesc || null,
    rating: s.rating || null,
    categories: s.categories || [],
    cardTextSnippet: s.cardTextSnippet || "",
  }));

  if (DRY_RUN) {
    console.log(`\nDry run complete. Would import:`);
    console.log(`  ${records.length} suppliers`);
    const totalLinks = records.reduce((sum, r) => sum + r.categories.length, 0);
    console.log(`  ${totalLinks} category links`);
    records.slice(0, 3).forEach((r) => console.log(`  - ${r.displayName} (${r.slug}) -> ${r.categories.length} cats`));
    return;
  }

  // Load dotenv for DATABASE_URL (.env.local takes precedence in Next.js projects)
  try {
    require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });
    require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
  } catch {}

  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const allCategories = await prisma.category.findMany({ select: { id: true, slug: true } });
    const catMap = new Map(allCategories.map((c) => [c.slug, c.id]));
    console.log(`Category map loaded: ${catMap.size} entries`);

    let suppliersCreated = 0;
    let suppliersUpdated = 0;
    let linksCreated = 0;
    let linksSkipped = 0;
    let snapshotsCreated = 0;
    let snapshotsSkipped = 0;
    let unmappedCategories = 0;

    console.log(`\nImporting ${records.length} suppliers...`);

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if ((i + 1) % 100 === 0) process.stdout.write(`\r  ${i + 1}/${records.length}`);

      let supplier = await prisma.supplierRecord.findFirst({
        where: { externalSourceUrl: r.profileUrl },
      });

      const supplierData = {
        displayName: r.displayName,
        slug: r.slug,
        status: "unclaimed",
        sourceType: "imported",
        shortSummary: r.shortDesc,
        phonePublic: r.phone,
        city: r.city,
        externalSource: "paslaugos.lt",
        externalSourceUrl: r.profileUrl,
        isVerified: false,
      };

      if (supplier) {
        await prisma.supplierRecord.update({ where: { id: supplier.id }, data: supplierData });
        suppliersUpdated++;
      } else {
        let finalSlug = r.slug;
        const slugExists = await prisma.supplierRecord.findUnique({ where: { slug: finalSlug } });
        if (slugExists) {
          finalSlug = `${r.slug}-${makeHash(r.profileUrl).substring(0, 6)}`;
        }
        supplier = await prisma.supplierRecord.create({ data: { ...supplierData, slug: finalSlug } });
        suppliersCreated++;
      }

      // Snapshot
      const snapshotContent = {
        displayName: r.displayName,
        cardText: r.cardTextSnippet,
        categories: r.categories.map((c) => c.slug),
      };
      const contentHash = makeHash(snapshotContent);

      const existingSnapshot = await prisma.supplierSourceSnapshot.findFirst({
        where: { supplierRecordId: supplier.id, hash: contentHash },
      });

      if (!existingSnapshot) {
        await prisma.supplierSourceSnapshot.create({
          data: {
            supplierRecordId: supplier.id,
            sourceName: "paslaugos.lt",
            sourceUrl: r.profileUrl,
            rawTitle: r.displayName,
            rawText: r.cardTextSnippet,
            rawMetadataJson: JSON.stringify({ rating: r.rating, city: r.city, phone: r.phone }),
            hash: contentHash,
          },
        });
        snapshotsCreated++;
      } else {
        snapshotsSkipped++;
      }

      // Category links
      for (let ci = 0; ci < r.categories.length; ci++) {
        const catSlug = r.categories[ci].slug;
        const categoryId = catMap.get(catSlug);

        if (!categoryId) {
          unmappedCategories++;
          continue;
        }

        const existingLink = await prisma.supplierCategoryLink.findUnique({
          where: { supplierRecordId_categoryId: { supplierRecordId: supplier.id, categoryId } },
        });

        if (!existingLink) {
          await prisma.supplierCategoryLink.create({
            data: {
              supplierRecordId: supplier.id,
              categoryId,
              isPrimary: ci === 0,
              confidenceScore: 1.0,
            },
          });
          linksCreated++;
        } else {
          linksSkipped++;
        }
      }
    }

    const totalSuppliers = await prisma.supplierRecord.count();
    const totalLinks = await prisma.supplierCategoryLink.count();
    const totalSnapshots = await prisma.supplierSourceSnapshot.count();

    console.log(`\n\n=== Import Summary ===`);
    console.log(`  Suppliers: ${suppliersCreated} created, ${suppliersUpdated} updated`);
    console.log(`  Category links: ${linksCreated} created, ${linksSkipped} skipped`);
    console.log(`  Snapshots: ${snapshotsCreated} created, ${snapshotsSkipped} skipped`);
    console.log(`  Unmapped categories: ${unmappedCategories}`);
    console.log(`\n=== DB Totals ===`);
    console.log(`  SupplierRecord: ${totalSuppliers}`);
    console.log(`  SupplierCategoryLink: ${totalLinks}`);
    console.log(`  SupplierSourceSnapshot: ${totalSnapshots}`);
    console.log("=== Done ===");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
