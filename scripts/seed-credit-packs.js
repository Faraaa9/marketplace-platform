#!/usr/bin/env node
/**
 * seed-credit-packs.js
 *
 * Phase 4: seeds the default credit packs providers can buy. Prices are in
 * cents (euros). Admins edit/add/remove packs afterward in the admin UI.
 *
 * Idempotent: a pack already present (matched by name) is left untouched, so
 * re-running never duplicates packs and never clobbers admin price edits.
 *
 * Usage:
 *   node scripts/seed-credit-packs.js --dry-run   # preview
 *   node scripts/seed-credit-packs.js             # apply
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

const PACKS = [
  { name: "1 kreditas", credits: 1, priceCents: 200, sortOrder: 0 },
  { name: "5 kreditai", credits: 5, priceCents: 1000, sortOrder: 1 },
  { name: "25 kreditai", credits: 25, priceCents: 4000, sortOrder: 2 },
];

async function main() {
  console.log(`=== Seed Credit Packs ${DRY_RUN ? "(DRY RUN — no writes)" : ""} ===\n`);

  let created = 0;
  for (const pack of PACKS) {
    const existing = await prisma.creditPack.findFirst({
      where: { name: pack.name },
      select: { id: true },
    });
    const eur = (pack.priceCents / 100).toFixed(2);
    if (existing) {
      console.log(`  · "${pack.name}" already exists — skipped`);
      continue;
    }
    console.log(`  → creating "${pack.name}" — ${pack.credits} kr. / €${eur}`);
    if (!DRY_RUN) await prisma.creditPack.create({ data: pack });
    created++;
  }

  const total = await prisma.creditPack.count();
  console.log(`\n${created} pack(s) ${DRY_RUN ? "would be" : ""} created. CreditPack total: ${total}`);
  console.log(DRY_RUN ? "Dry run complete — no changes written." : "Done.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
