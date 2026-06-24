/**
 * Verifies that runtime category loaders use only the canonical
 * paslaugurinka service taxonomy, not legacy imported category trees.
 *
 * Run:
 *   npx ts-node --transpile-only -r ./scripts/_register-paths.js \
 *     --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' \
 *     scripts/verify-canonical-categories.ts
 */
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(__dirname, "../.env.local") });
config({ path: path.resolve(__dirname, "../.env") });

async function main(): Promise<void> {
  const { prisma } = require("@/lib/prisma") as typeof import("@/lib/prisma");
  const {
    SERVICE_CATEGORY_WHERE,
    SERVICE_TAXONOMY_SOURCE,
  } = require("@/lib/service-categories") as typeof import("@/lib/service-categories");

  const [canonicalCount, canonicalRoots, legacyActive, runtimeRows] = await Promise.all([
    prisma.category.count({ where: SERVICE_CATEGORY_WHERE }),
    prisma.category.count({ where: { ...SERVICE_CATEGORY_WHERE, depth: 0 } }),
    prisma.category.count({
      where: {
        isActive: true,
        OR: [
          { pageType: { not: SERVICE_CATEGORY_WHERE.pageType } },
          { externalSource: { not: SERVICE_TAXONOMY_SOURCE } },
        ],
      },
    }),
    prisma.category.findMany({
      where: SERVICE_CATEGORY_WHERE,
      select: { id: true, pageType: true, externalSource: true, isActive: true },
    }),
  ]);

  const nonCanonicalLoaded = runtimeRows.filter(
    (row) =>
      row.pageType !== SERVICE_CATEGORY_WHERE.pageType ||
      row.externalSource !== SERVICE_TAXONOMY_SOURCE ||
      row.isActive !== true,
  );

  const errors: string[] = [];
  if (canonicalCount === 0) errors.push("Canonical service taxonomy is empty.");
  if (runtimeRows.length !== canonicalCount) {
    errors.push(`Canonical loader query returned ${runtimeRows.length}, expected ${canonicalCount}.`);
  }
  if (canonicalRoots === 0) {
    errors.push("Canonical service taxonomy has no roots.");
  }
  if (nonCanonicalLoaded.length > 0) {
    errors.push(
      `Runtime loader returned ${nonCanonicalLoaded.length} non-canonical categor` +
        `${nonCanonicalLoaded.length === 1 ? "y" : "ies"}.`,
    );
  }

  if (errors.length > 0) {
    console.error("✗ canonical category verification failed");
    for (const error of errors) console.error(`  - ${error}`);
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(
    `✓ canonical categories OK — ${canonicalCount} categories, ${canonicalRoots} roots ` +
      `from ${SERVICE_TAXONOMY_SOURCE}. Legacy active rows present but excluded: ${legacyActive}.`,
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("verify-canonical-categories failed:", error);
  process.exit(1);
});
