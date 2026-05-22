#!/usr/bin/env node
/**
 * apply-curated-taxonomy.js
 *
 * Phase 1 apply: writes the curated taxonomy (curated-taxonomy-proposal.json)
 * into the Category table as a clean 'service' tier.
 *
 *   - 9 roots: name updated to the proposal display name where it differs
 *     (e.g. "Mokymai" -> "Grožis, sveikata ir mokymai").
 *   - ~137 curated categories: created as depth-1 rows, pageType="service",
 *     externalSource="curated", id = "svc-<slug>".
 *
 * ADDITIVE ONLY — the 840 imported categories are left untouched. Re-mapping
 * old categories and supplier links to the new tier happens in Phase 3.
 *
 * Idempotent: re-running updates existing "svc-" rows, never duplicates.
 * Reversible: delete Category rows where externalSource = "curated".
 *
 * Usage:
 *   node scripts/apply-curated-taxonomy.js --dry-run   # preview, no writes
 *   node scripts/apply-curated-taxonomy.js             # apply
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes("--dry-run");

const LT = { "ą": "a", "č": "c", "ę": "e", "ė": "e", "į": "i", "š": "s", "ų": "u", "ū": "u", "ž": "z" };
function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[ąčęėįšųūž]/g, (c) => LT[c] || c)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uniqueSlug(base) {
  let slug = base;
  let n = 2;
  while (await prisma.category.findFirst({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${n}`;
    n++;
  }
  return slug;
}

async function main() {
  const proposal = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, "curated-taxonomy-proposal.json"), "utf8")
  );

  console.log(`=== Apply Curated Taxonomy ${DRY_RUN ? "(DRY RUN — no writes)" : ""} ===`);

  let rootsRenamed = 0, created = 0, updated = 0, total = 0;
  const seenIds = new Set();

  for (const r of proposal.roots) {
    const root = await prisma.category.findUnique({ where: { slug: r.rootSlug } });
    if (!root) {
      console.error(`  ! ROOT NOT FOUND: ${r.rootSlug} — skipping "${r.root}"`);
      continue;
    }
    if (root.name !== r.root) {
      console.log(`  ~ root rename: "${root.name}" -> "${r.root}"`);
      if (!DRY_RUN) await prisma.category.update({ where: { id: root.id }, data: { name: r.root } });
      rootsRenamed++;
    }

    let idx = 0;
    for (const cat of r.categories) {
      total++;
      const base = slugify(cat.name);
      const id = `svc-${base}`;
      if (seenIds.has(id)) {
        console.error(`  ! DUPLICATE id ${id} ("${cat.name}") — skipping`);
        continue;
      }
      seenIds.add(id);

      const existing = await prisma.category.findUnique({ where: { id } });
      if (existing) {
        if (!DRY_RUN) {
          await prisma.category.update({
            where: { id },
            data: { name: cat.name, parentId: root.id, rootId: root.id, depth: 1, sortOrder: idx, pageType: "service", isActive: true },
          });
        }
        updated++;
      } else {
        const slug = DRY_RUN ? base : await uniqueSlug(base);
        if (!DRY_RUN) {
          await prisma.category.create({
            data: {
              id, name: cat.name, slug,
              parentId: root.id, rootId: root.id, depth: 1,
              path: `${r.rootSlug}/${slug}`, sortOrder: idx,
              pageType: "service", externalSource: "curated", isActive: true,
            },
          });
        }
        created++;
      }
      idx++;
    }
    console.log(`  ${r.root}: ${r.categories.length} kategorijos`);
  }

  console.log(`\nRoots renamed: ${rootsRenamed}`);
  console.log(`Categories: ${created} created, ${updated} updated, ${total} total`);
  if (!DRY_RUN) {
    const count = await prisma.category.count({ where: { pageType: "service" } });
    console.log(`DB now has ${count} 'service' categories.`);
  }
  console.log(DRY_RUN ? "\nDry run complete — no changes written." : "\nDone.");
  await prisma.$disconnect();
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
