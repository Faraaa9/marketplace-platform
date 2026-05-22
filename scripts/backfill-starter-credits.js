#!/usr/bin/env node
/**
 * backfill-starter-credits.js
 *
 * Phase 4: grants free starter credits to existing active providers so the
 * lead board is usable for them on day one of the pay-per-lead model.
 *
 * Scope: active providers with a real account (isActive=true, userId set).
 * Amount: PlatformSettings.freeStarterCredits (default 3).
 *
 * Idempotent: a provider with an existing STARTER_GRANT ledger row is skipped,
 * so re-running never grants twice.
 *
 * Usage:
 *   node scripts/backfill-starter-credits.js --dry-run   # preview
 *   node scripts/backfill-starter-credits.js             # apply
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log(`=== Backfill Starter Credits ${DRY_RUN ? "(DRY RUN — no writes)" : ""} ===\n`);

  const settings = await prisma.platformSettings.findUnique({
    where: { id: "singleton" },
    select: { freeStarterCredits: true },
  });
  const amount = settings?.freeStarterCredits ?? 3;
  console.log(`Starter credit amount: ${amount}`);
  if (amount <= 0) {
    console.log("freeStarterCredits is 0 — nothing to grant.");
    await prisma.$disconnect();
    return;
  }

  const providers = await prisma.providerProfile.findMany({
    where: { isActive: true, userId: { not: null } },
    select: { id: true, displayName: true },
  });
  console.log(`Active providers with an account: ${providers.length}\n`);

  let granted = 0;
  let skipped = 0;
  for (const p of providers) {
    const existing = await prisma.creditTransaction.findFirst({
      where: { providerProfileId: p.id, type: "STARTER_GRANT" },
      select: { id: true },
    });
    const label = p.displayName || p.id;
    if (existing) {
      skipped++;
      continue;
    }
    if (DRY_RUN) {
      console.log(`  → would grant ${amount} to "${label}"`);
      granted++;
      continue;
    }
    await prisma.$transaction(async (tx) => {
      const updated = await tx.providerProfile.update({
        where: { id: p.id },
        data: { creditBalance: { increment: amount } },
        select: { creditBalance: true },
      });
      await tx.creditTransaction.create({
        data: {
          providerProfileId: p.id,
          amount,
          balanceAfter: updated.creditBalance,
          type: "STARTER_GRANT",
          note: "Startiniai kreditai (backfill)",
        },
      });
    });
    console.log(`  → granted ${amount} to "${label}"`);
    granted++;
  }

  console.log(
    `\n${granted} provider(s) ${DRY_RUN ? "would be" : ""} granted, ` +
      `${skipped} already had starter credits.`,
  );
  console.log(DRY_RUN ? "Dry run complete — no changes written." : "Done.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
