#!/usr/bin/env node
/**
 * backfill-leadunlocks-from-responses.js
 *
 * Phase 4: a provider who already responded to a request under the old
 * subscription model has effectively engaged that lead. This creates a
 * matching LeadUnlock (source="legacy", no charge) so their in-flight
 * conversations stay unlocked once the pay-per-lead gate goes live.
 *
 * Idempotent: createMany skipDuplicates + @@unique(requestId, providerProfileId).
 * No credits are spent and no ledger rows are written — these are free,
 * retroactive unlocks for work that predates the credit model.
 *
 * Usage:
 *   node scripts/backfill-leadunlocks-from-responses.js --dry-run   # preview
 *   node scripts/backfill-leadunlocks-from-responses.js             # apply
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log(
    `=== Backfill LeadUnlocks from Responses ${DRY_RUN ? "(DRY RUN — no writes)" : ""} ===\n`,
  );

  const responses = await prisma.response.findMany({
    select: { requestId: true, providerId: true },
  });
  console.log(`Responses: ${responses.length}`);

  // Response.providerId is a User id; LeadUnlock keys on ProviderProfile id.
  const userIds = [...new Set(responses.map((r) => r.providerId))];
  const profiles = await prisma.providerProfile.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, userId: true },
  });
  const profileByUserId = new Map(profiles.map((p) => [p.userId, p.id]));

  const seen = new Set();
  const rows = [];
  let noProfile = 0;
  for (const r of responses) {
    const providerProfileId = profileByUserId.get(r.providerId);
    if (!providerProfileId) {
      noProfile++;
      continue;
    }
    const key = `${r.requestId}::${providerProfileId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ requestId: r.requestId, providerProfileId, source: "legacy" });
  }
  console.log(`${rows.length} unique (request, provider) pair(s) to unlock.`);
  if (noProfile) {
    console.log(`${noProfile} response(s) skipped — responder has no provider profile.`);
  }

  if (!DRY_RUN && rows.length > 0) {
    const res = await prisma.leadUnlock.createMany({ data: rows, skipDuplicates: true });
    const total = await prisma.leadUnlock.count();
    console.log(`\nCreated ${res.count} LeadUnlock row(s) (${rows.length - res.count} already existed).`);
    console.log(`LeadUnlock total: ${total}`);
  }
  console.log(DRY_RUN ? "\nDry run complete — no changes written." : "\nDone.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
