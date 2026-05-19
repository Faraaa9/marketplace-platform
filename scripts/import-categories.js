#!/usr/bin/env node
/**
 * import-categories.js
 *
 * Idempotent import of catalog_tree_clean_v2.json into PostgreSQL via Prisma.
 * Source data comes from the paslaugos-crawler project.
 *
 * Usage:
 *   node scripts/import-categories.js <path-to-tree-json> [--dry-run] [--with-aliases <alias-json>]
 *
 * Example:
 *   node scripts/import-categories.js ../paslaugos-crawler/output/catalog_tree_clean_v2.json
 *   node scripts/import-categories.js ../paslaugos-crawler/output/catalog_tree_clean_v2.json --with-aliases ../paslaugos-crawler/output/catalog_aliases_v2.json
 */

const fs = require("fs");
const path = require("path");

// ── CLI args ─────────────────────────────────────────────────────────
const rawArgs = process.argv.slice(2);
const flags = new Set(rawArgs.filter((a) => a.startsWith("--")));
const positional = rawArgs.filter((a) => !a.startsWith("--"));
const DRY_RUN = flags.has("--dry-run");
const WITH_ALIASES = flags.has("--with-aliases");

const TREE_PATH = positional[0];
if (!TREE_PATH) {
  console.error("Usage: node scripts/import-categories.js <tree-json> [--dry-run] [--with-aliases <alias-json>]");
  process.exit(1);
}

const ALIAS_PATH = WITH_ALIASES ? positional[1] : null;
if (WITH_ALIASES && !ALIAS_PATH) {
  console.error("--with-aliases requires a path to the alias JSON file");
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

function flattenTree(roots) {
  const rows = [];

  function walk(node, parentId, rootId, depth, parentPath, sortIndex) {
    if (!node.name || !node.slug) {
      console.warn(`WARN: Skipping node without name/slug: ${JSON.stringify({ id: node.id, url: node.url })}`);
      return;
    }

    const currentRootId = depth === 0 ? node.id : rootId;
    const currentPath = parentPath ? `${parentPath}/${node.slug}` : node.slug;

    rows.push({
      id: node.id,
      name: node.name,
      slug: node.slug,
      parentId: depth === 0 ? null : parentId,
      rootId: depth === 0 ? null : currentRootId,
      depth,
      path: currentPath,
      sortOrder: sortIndex,
      pageType: node.pageType || null,
      externalSource: "paslaugos.lt",
      externalSlug: node.slug,
    });

    if (node.children && node.children.length > 0) {
      node.children.forEach((child, idx) => {
        walk(child, node.id, currentRootId, depth + 1, currentPath, idx);
      });
    }
  }

  roots.forEach((root, idx) => walk(root, null, null, 0, "", idx));
  return rows;
}

function validate(rows) {
  const errors = [];
  const ids = new Set();
  const slugs = new Set();

  for (const row of rows) {
    if (!row.id) errors.push(`Missing id for slug=${row.slug}`);
    if (!row.name) errors.push(`Missing name for id=${row.id}`);
    if (!row.slug) errors.push(`Missing slug for id=${row.id}`);
    if (ids.has(row.id)) errors.push(`Duplicate id: ${row.id}`);
    ids.add(row.id);
    if (slugs.has(row.slug)) errors.push(`Duplicate slug: ${row.slug}`);
    slugs.add(row.slug);
    if (row.depth < 0 || row.depth > 10) errors.push(`Suspicious depth=${row.depth} for id=${row.id}`);
  }

  const allIds = new Set(rows.map((r) => r.id));
  for (const row of rows) {
    if (row.parentId && !allIds.has(row.parentId)) {
      errors.push(`Orphan: id=${row.id} references parentId=${row.parentId} which doesn't exist`);
    }
    if (row.rootId && !allIds.has(row.rootId)) {
      errors.push(`Bad rootId: id=${row.id} references rootId=${row.rootId} which doesn't exist`);
    }
  }

  return errors;
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Category Import (Marketplace Platform) ===");
  if (DRY_RUN) console.log("MODE: dry-run (no DB writes)");

  const tree = loadJson(TREE_PATH, "tree JSON");
  console.log(`Loaded tree: ${tree.length} roots`);

  const rows = flattenTree(tree);
  console.log(`Flattened: ${rows.length} categories`);
  console.log(`  Roots: ${rows.filter((r) => r.depth === 0).length}`);
  console.log(`  Depth 1: ${rows.filter((r) => r.depth === 1).length}`);
  console.log(`  Depth 2: ${rows.filter((r) => r.depth === 2).length}`);

  const errors = validate(rows);
  if (errors.length > 0) {
    console.error(`\nValidation errors (${errors.length}):`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log("Validation: OK");

  if (DRY_RUN) {
    console.log(`\nDry run complete. Would import ${rows.length} categories.`);
    rows.slice(0, 3).forEach((r) => console.log(`  - [${r.depth}] ${r.name} (${r.slug})`));
    console.log("  ...");
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
    let created = 0;
    let updated = 0;

    const sorted = [...rows].sort((a, b) => a.depth - b.depth || a.sortOrder - b.sortOrder);

    console.log("\nImporting...");
    for (const row of sorted) {
      const data = {
        name: row.name,
        slug: row.slug,
        parentId: row.parentId,
        rootId: row.rootId,
        depth: row.depth,
        path: row.path,
        sortOrder: row.sortOrder,
        pageType: row.pageType,
        externalSource: row.externalSource,
        externalSlug: row.externalSlug,
        isActive: true,
      };

      const existing = await prisma.category.findUnique({ where: { id: row.id } });
      if (existing) {
        await prisma.category.update({ where: { id: row.id }, data });
        updated++;
      } else {
        await prisma.category.create({ data: { id: row.id, ...data } });
        created++;
      }
    }

    console.log(`\nCategories: ${created} created, ${updated} updated, ${rows.length} total`);

    if (WITH_ALIASES && ALIAS_PATH) {
      const aliasData = loadJson(ALIAS_PATH, "alias JSON");
      let aliasCreated = 0;
      let aliasSkipped = 0;

      for (const group of aliasData) {
        if (group.action !== "merge_to_canonical") continue;
        const canonicalId = group.canonical.id;

        const canonical = await prisma.category.findUnique({ where: { id: canonicalId } });
        if (!canonical) {
          console.warn(`WARN: Canonical ${canonicalId} not in DB, skipping alias group`);
          aliasSkipped++;
          continue;
        }

        for (const alias of group.aliases) {
          const existing = await prisma.categoryAlias.findFirst({
            where: { categoryId: canonicalId, aliasName: alias.name },
          });
          if (existing) {
            aliasSkipped++;
            continue;
          }

          const aliasSlug = alias.url
            ? alias.url.replace("https://paslaugos.lt/", "").replace(/\//g, "-")
            : null;

          await prisma.categoryAlias.create({
            data: { categoryId: canonicalId, aliasName: alias.name, aliasSlug, source: group.reason },
          });
          aliasCreated++;
        }
      }

      console.log(`Aliases: ${aliasCreated} created, ${aliasSkipped} skipped`);
    }

    const totalCategories = await prisma.category.count();
    const totalRoots = await prisma.category.count({ where: { depth: 0 } });
    const totalAliases = await prisma.categoryAlias.count();

    console.log(`\n=== DB Summary ===`);
    console.log(`  Categories: ${totalCategories}`);
    console.log(`  Roots: ${totalRoots}`);
    console.log(`  Aliases: ${totalAliases}`);
    console.log("=== Done ===");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
