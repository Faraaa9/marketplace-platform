#!/usr/bin/env node
/**
 * Import the hand-curated Paslaugų rinka taxonomy from kategorijos.md.
 *
 * Source format:
 *   ## Root category
 *   - Subcategory without details
 *   ### Subcategory
 *   - Concrete service
 *
 * The importer writes a 3-level service taxonomy into Category:
 *   depth 0: root
 *   depth 1: provider/request subcategory
 *   depth 2: concrete service leaf
 *
 * Idempotent and additive for this taxonomy source. Existing rows with
 * externalSource="paslaugurinka-taxonomy" are updated; rows no longer present
 * in the markdown are deactivated.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { PrismaClient } = require("@prisma/client");

const SOURCE = "paslaugurinka-taxonomy";
const DEFAULT_MARKDOWN_PATH = "/Users/judyanncastillo/Documents/Paslaugos-kategorijos/kategorijos.md";
const DRY_RUN = process.argv.includes("--dry-run");
const RESET_CURATED = process.argv.includes("--reset-curated");
const inputPath =
  process.argv.find((arg) => !arg.startsWith("--") && arg !== process.argv[0] && arg !== process.argv[1]) ||
  DEFAULT_MARKDOWN_PATH;

const LT = {
  "ą": "a",
  "č": "c",
  "ę": "e",
  "ė": "e",
  "į": "i",
  "š": "s",
  "ų": "u",
  "ū": "u",
  "ž": "z",
};

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[ąčęėįšųūž]/g, (char) => LT[char] || char)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
}

function stableId(parts) {
  const hash = crypto.createHash("sha1").update(parts.join(" / ")).digest("hex").slice(0, 18);
  return `tax_${hash}`;
}

function parseMainList(markdown, heading) {
  const start = markdown.indexOf(`## ${heading}`);
  if (start === -1) return [];
  const next = markdown.indexOf("\n## ", start + 1);
  const block = markdown.slice(start, next === -1 ? markdown.length : next);
  return block
    .split(/\r?\n/)
    .map((line) => line.match(/^\d+\.\s+(.+?)\s*$/)?.[1]?.trim())
    .filter(Boolean);
}

function parseMarkdown(markdown) {
  const groupA = new Set(parseMainList(markdown, "Pagrindinės kategorijos A"));
  const groupB = new Set(parseMainList(markdown, "Pagrindinės kategorijos B"));
  const rows = [];
  let currentRoot = null;
  let currentSub = null;
  let rootOrder = 0;
  let subOrder = 0;
  let serviceOrder = 0;

  function addRow({ name, depth, parentId, rootId, pathValue, sortOrder, group, kind }) {
    const pathSlug = `pr-${pathValue.map(slugify).join("--")}`;
    rows.push({
      id: stableId(pathValue),
      name,
      slug: pathSlug,
      parentId,
      rootId,
      depth,
      path: pathValue.map(slugify).join("/"),
      sortOrder,
      pageType: "service",
      externalSource: SOURCE,
      externalSlug: pathSlug,
      metadataJson: JSON.stringify({ group, kind, sourcePath: pathValue }),
    });
    return rows[rows.length - 1];
  }

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("Pastaba:") || line.startsWith("# ")) continue;

    const rootMatch = line.match(/^##\s+(.+?)\s*$/);
    if (rootMatch) {
      const name = rootMatch[1].trim();
      if (name === "Pagrindinės kategorijos A" || name === "Pagrindinės kategorijos B") {
        currentRoot = null;
        currentSub = null;
        continue;
      }
      const group = groupA.has(name) ? "A" : groupB.has(name) ? "B" : "custom";
      currentRoot = addRow({
        name,
        depth: 0,
        parentId: null,
        rootId: null,
        pathValue: [name],
        sortOrder: rootOrder++,
        group,
        kind: "root",
      });
      currentSub = null;
      subOrder = 0;
      serviceOrder = 0;
      continue;
    }

    const subMatch = line.match(/^###\s+(.+?)\s*$/);
    if (subMatch && currentRoot) {
      const name = subMatch[1].trim();
      currentSub = addRow({
        name,
        depth: 1,
        parentId: currentRoot.id,
        rootId: currentRoot.id,
        pathValue: [currentRoot.name, name],
        sortOrder: subOrder++,
        group: JSON.parse(currentRoot.metadataJson).group,
        kind: "subcategory",
      });
      serviceOrder = 0;
      continue;
    }

    const bulletMatch = line.match(/^-\s+(.+?)\s*$/);
    if (bulletMatch && currentRoot) {
      const name = bulletMatch[1].trim();
      if (!name || /^Rodyti\s+/i.test(name)) continue;

      if (currentSub) {
        addRow({
          name,
          depth: 2,
          parentId: currentSub.id,
          rootId: currentRoot.id,
          pathValue: [currentRoot.name, currentSub.name, name],
          sortOrder: serviceOrder++,
          group: JSON.parse(currentRoot.metadataJson).group,
          kind: "service",
        });
      } else {
        addRow({
          name,
          depth: 1,
          parentId: currentRoot.id,
          rootId: currentRoot.id,
          pathValue: [currentRoot.name, name],
          sortOrder: subOrder++,
          group: JSON.parse(currentRoot.metadataJson).group,
          kind: "subcategory",
        });
      }
    }
  }

  const unique = new Map();
  for (const row of rows) {
    if (!unique.has(row.id)) unique.set(row.id, row);
  }
  return [...unique.values()];
}

async function main() {
  const resolved = path.resolve(inputPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Markdown file not found: ${resolved}`);
  }
  const markdown = fs.readFileSync(resolved, "utf8");
  const rows = parseMarkdown(markdown);

  const duplicateSlugs = rows
    .map((row) => row.slug)
    .filter((slug, index, arr) => arr.indexOf(slug) !== index);
  if (duplicateSlugs.length > 0) {
    throw new Error(`Duplicate slugs in parsed taxonomy: ${[...new Set(duplicateSlugs)].slice(0, 5).join(", ")}`);
  }

  console.log(`=== Paslaugų rinka taxonomy import ${DRY_RUN ? "(DRY RUN)" : ""} ===`);
  console.log(`Source: ${resolved}`);
  console.log(`Rows: ${rows.length}`);
  console.log(`  Roots: ${rows.filter((r) => r.depth === 0).length}`);
  console.log(`  Subcategories: ${rows.filter((r) => r.depth === 1).length}`);
  console.log(`  Services: ${rows.filter((r) => r.depth === 2).length}`);

  if (DRY_RUN) {
    for (const row of rows.slice(0, 12)) {
      console.log(`  [${row.depth}] ${row.path}`);
    }
    console.log("Dry run complete — no DB writes.");
    return;
  }

  const prisma = new PrismaClient();
  try {
    if (RESET_CURATED) {
      const result = await prisma.category.updateMany({
        where: { externalSource: "curated" },
        data: { isActive: false, pageType: null },
      });
      console.log(`Deactivated old curated rows: ${result.count}`);
    }

    const removed = await prisma.category.deleteMany({
      where: { externalSource: SOURCE },
    });

    let created = 0;
    for (const depth of [...new Set(rows.map((row) => row.depth))].sort((a, b) => a - b)) {
      const batch = rows
        .filter((row) => row.depth === depth)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((row) => ({
          id: row.id,
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
          metadataJson: row.metadataJson,
          isActive: true,
        }));
      const result = await prisma.category.createMany({ data: batch });
      created += result.count;
      console.log(`Inserted depth ${depth}: ${result.count}`);
    }

    const summary = await prisma.category.groupBy({
      by: ["depth"],
      where: { externalSource: SOURCE, isActive: true },
      _count: { _all: true },
      orderBy: { depth: "asc" },
    });

    console.log(`Removed old ${SOURCE} rows: ${removed.count}`);
    console.log(`Created: ${created}`);
    for (const row of summary) console.log(`Depth ${row.depth}: ${row._count._all}`);
    console.log("Done.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("FATAL:", error);
  process.exit(1);
});
