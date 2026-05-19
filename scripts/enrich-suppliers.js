#!/usr/bin/env node
/**
 * enrich-suppliers.js
 *
 * Visits each supplier's profile page on paslaugos.lt via Playwright
 * and extracts structured data: description, phone, city, images, rating, etc.
 * Updates SupplierRecord in the database.
 *
 * Usage:
 *   node scripts/enrich-suppliers.js [--force] [--limit=50] [--dry-run] [--concurrency=3]
 *
 * Flags:
 *   --force        Re-enrich already enriched suppliers
 *   --limit=N      Process at most N suppliers (default: all)
 *   --dry-run      Extract data but don't write to DB
 *   --concurrency  Number of parallel browser pages (default: 3)
 */

const path = require("path");
const { chromium } = require("playwright");

// ── CLI args ──────────────────────────────────────────────────────────

const rawArgs = process.argv.slice(2);
const flags = Object.fromEntries(
  rawArgs.filter((a) => a.startsWith("--")).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v === undefined ? true : v];
  })
);

const FORCE = !!flags.force;
const DRY_RUN = !!flags["dry-run"];
const LIMIT = flags.limit ? parseInt(flags.limit) : 0;
const CONCURRENCY = parseInt(flags.concurrency || "3");
const NAV_TIMEOUT = 20000;
const PAGE_WAIT = 2000;
const DELAY_BETWEEN = 500; // ms between requests to be polite

// ── Page data extractor ──────────────────────────────────────────────

/**
 * Runs inside the browser page context.
 * Extracts structured supplier data from a paslaugos.lt profile page.
 */
function extractProfileData() {
  const bodyText = document.body.innerText;

  // Location: "Vilnius, +200 km aplink" or "Kaunas"
  const locationMatch = bodyText.match(/^(.+?),\s*\+?\d+\s*km\s*aplink/m);
  const city = locationMatch ? locationMatch[1].trim() : null;

  // Phone
  const phoneEl = document.querySelector('[href^="tel:"]');
  const phone = phoneEl ? phoneEl.getAttribute("href").replace("tel:", "").trim() : null;

  // Meta description (used as shortSummary)
  const metaDesc = document.querySelector('meta[name="description"]')?.content || null;

  // Description: the paragraph text after the title, before reviews
  // It's in the meta description, which is the best clean summary
  const description = metaDesc;

  // Rating and review count: "4.9 (99) Nuo"
  const ratingMatch = bodyText.match(/(\d+\.?\d*)\s*\((\d+)\)\s*Nuo/);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
  const reviewCount = ratingMatch ? parseInt(ratingMatch[2]) : 0;

  // Gallery images from paslaugos-img.dgn.lt
  const galleryImages = Array.from(document.querySelectorAll('img[src*="paslaugos-img.dgn.lt"]'))
    .map((i) => i.src)
    .filter((v, i, a) => a.indexOf(v) === i);

  // Hero: prefer pagemainimage, fallback to first gallery image
  const heroImage = galleryImages.find((u) => u.includes("pagemainimage")) || galleryImages[0] || null;

  // Experience years
  const expMatch = bodyText.match(/(\d+)\s*m\.\s*patirtis/);
  const experienceYears = expMatch ? parseInt(expMatch[1]) : null;

  // Identity verified
  const verified = bodyText.includes("Tapatybė patvirtinta");

  // External website (non-paslaugos.lt links)
  const websiteLinks = Array.from(document.querySelectorAll('a[href]'))
    .filter((a) => {
      const h = a.getAttribute("href") || "";
      return h.startsWith("http") && !h.includes("paslaugos.lt") && !h.includes("dgn.lt");
    })
    .map((a) => a.href);
  const website = websiteLinks[0] || null;

  return {
    city,
    phone,
    description,
    rating,
    reviewCount,
    heroImage,
    galleryImages: galleryImages.slice(0, 20), // cap at 20
    experienceYears,
    verified,
    website,
  };
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Supplier Enrichment (Marketplace Platform) ===");
  if (DRY_RUN) console.log("MODE: dry-run (no DB writes)");
  if (FORCE) console.log("MODE: force (re-enriching all)");
  console.log(`Concurrency: ${CONCURRENCY}`);

  // Load env
  try {
    require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
    require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
  } catch {}

  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  try {
    // Find suppliers to enrich
    const where = { externalSourceUrl: { not: null } };
    if (!FORCE) {
      where.enrichedAt = null;
    }

    let suppliers = await prisma.supplierRecord.findMany({
      where,
      select: { id: true, slug: true, externalSourceUrl: true },
      orderBy: { displayName: "asc" },
      ...(LIMIT > 0 ? { take: LIMIT } : {}),
    });

    console.log(`Found ${suppliers.length} suppliers to enrich`);
    if (suppliers.length === 0) {
      console.log("Nothing to do. Use --force to re-enrich.");
      return;
    }

    // Launch browser
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      locale: "lt-LT",
    });

    let enriched = 0;
    let failed = 0;
    let skipped = 0;

    // Process in batches of CONCURRENCY
    for (let i = 0; i < suppliers.length; i += CONCURRENCY) {
      const batch = suppliers.slice(i, i + CONCURRENCY);

      const results = await Promise.allSettled(
        batch.map(async (supplier) => {
          const page = await context.newPage();
          try {
            await page.goto(supplier.externalSourceUrl, {
              timeout: NAV_TIMEOUT,
              waitUntil: "domcontentloaded",
            });
            await page.waitForTimeout(PAGE_WAIT);

            const data = await page.evaluate(extractProfileData);
            return { supplier, data };
          } finally {
            await page.close();
          }
        })
      );

      for (const result of results) {
        const idx = enriched + failed + skipped + 1;
        const pct = ((idx / suppliers.length) * 100).toFixed(1);

        if (result.status === "rejected") {
          failed++;
          const slug = batch[results.indexOf(result)]?.slug || "?";
          process.stdout.write(`\r[${pct}%] ${idx}/${suppliers.length} — FAIL ${slug}: ${result.reason?.message?.substring(0, 60) || "unknown"}    `);
          continue;
        }

        const { supplier, data } = result.value;

        // Skip if no useful data extracted
        if (!data.description && !data.phone && !data.city && !data.heroImage) {
          skipped++;
          process.stdout.write(`\r[${pct}%] ${idx}/${suppliers.length} — SKIP ${supplier.slug} (no data)    `);
          continue;
        }

        if (!DRY_RUN) {
          await prisma.supplierRecord.update({
            where: { id: supplier.id },
            data: {
              shortSummary: data.description || undefined,
              phonePublic: data.phone || undefined,
              city: data.city || undefined,
              websiteUrl: data.website || undefined,
              isVerified: data.verified,
              heroImageUrl: data.heroImage || undefined,
              galleryUrls: data.galleryImages.length > 0 ? JSON.stringify(data.galleryImages) : undefined,
              rating: data.rating ?? undefined,
              reviewCount: data.reviewCount || undefined,
              metadataJson: JSON.stringify({
                experienceYears: data.experienceYears,
                enrichedFrom: "playwright-scrape",
              }),
              enrichedAt: new Date(),
            },
          });
        }

        enriched++;
        process.stdout.write(`\r[${pct}%] ${idx}/${suppliers.length} — OK ${supplier.slug}    `);
      }

      // Polite delay between batches
      if (i + CONCURRENCY < suppliers.length) {
        await new Promise((r) => setTimeout(r, DELAY_BETWEEN));
      }
    }

    await browser.close();

    // Summary
    const totalEnriched = await prisma.supplierRecord.count({ where: { enrichedAt: { not: null } } });
    const withCity = await prisma.supplierRecord.count({ where: { city: { not: null } } });
    const withImage = await prisma.supplierRecord.count({ where: { heroImageUrl: { not: null } } });
    const withRating = await prisma.supplierRecord.count({ where: { rating: { not: null } } });

    console.log(`\n\n=== Enrichment Summary ===`);
    console.log(`  Enriched: ${enriched}`);
    console.log(`  Failed: ${failed}`);
    console.log(`  Skipped (no data): ${skipped}`);
    console.log(`\n=== DB Totals ===`);
    console.log(`  Total enriched: ${totalEnriched}`);
    console.log(`  With city: ${withCity}`);
    console.log(`  With hero image: ${withImage}`);
    console.log(`  With rating: ${withRating}`);
    console.log("=== Done ===");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("\nFATAL:", e);
  process.exit(1);
});
