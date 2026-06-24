/**
 * Guards against the failure mode where provider/request rows reference a
 * category that is NOT in the canonical service taxonomy (SERVICE_CATEGORY_WHERE).
 * expandToMatchSet adds such ids bare, so those rows silently match nothing.
 *
 * verify:canonical-categories only checks the canonical set EXISTS — it does not
 * check that live FK refs point INTO it. This script closes that gap.
 *
 * Fails (exit 1) only on the live-impacting class: ACTIVE providers pointing at a
 * non-canonical category (blank profile pills + no lead matches). Historical
 * non-canonical refs (inactive/test providers, past requests) are reported as a
 * non-blocking warning.
 *
 * Run:
 *   npx ts-node --transpile-only -r ./scripts/_register-paths.js \
 *     --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' \
 *     scripts/verify-category-refs.ts
 */
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(__dirname, "../.env.local") });
config({ path: path.resolve(__dirname, "../.env") });

async function main(): Promise<void> {
  const { prisma } = require("@/lib/prisma") as typeof import("@/lib/prisma");
  const { SERVICE_CATEGORY_WHERE } =
    require("@/lib/service-categories") as typeof import("@/lib/service-categories");

  const canonical = await prisma.category.findMany({
    where: SERVICE_CATEGORY_WHERE,
    select: { id: true },
  });
  const canonicalIds = new Set(canonical.map((row) => row.id));

  const [providerLinks, requestLinks] = await Promise.all([
    prisma.providerProfileCategory.findMany({
      select: { categoryId: true, providerProfile: { select: { isActive: true } } },
    }),
    prisma.serviceRequestCategory.findMany({
      select: { categoryId: true, request: { select: { status: true } } },
    }),
  ]);

  const provBad = providerLinks.filter((l) => !canonicalIds.has(l.categoryId));
  const activeProvBad = provBad.filter((l) => l.providerProfile?.isActive);
  const reqBad = requestLinks.filter((l) => !canonicalIds.has(l.categoryId));
  const openReqBad = reqBad.filter((l) => l.request?.status === "OPEN");

  console.log(`canonical service categories: ${canonicalIds.size}`);
  console.log(
    `provider refs outside canonical: ${provBad.length} (active: ${activeProvBad.length})`,
  );
  console.log(
    `request refs outside canonical:  ${reqBad.length} (OPEN: ${openReqBad.length})`,
  );

  if (activeProvBad.length > 0) {
    console.error(
      `✗ ${activeProvBad.length} ACTIVE-provider category ref(s) point outside the canonical taxonomy`,
    );
    await prisma.$disconnect();
    process.exit(1);
  }

  if (provBad.length > 0 || reqBad.length > 0) {
    console.warn(
      `⚠ ${provBad.length + reqBad.length} historical non-canonical ref(s) remain ` +
        `(inactive providers / past requests) — not blocking.`,
    );
  }

  console.log("✓ no active-provider category refs outside the canonical taxonomy");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("verify-category-refs failed:", error);
  process.exit(1);
});
