/**
 * Phase-2 prereq helper: dump the live paslaugurinka service taxonomy.
 *
 * SELECT-ONLY. Loads { slug, name, aliases } for every active service
 * category (the same filter the runtime pipeline emits slugs from) and writes
 * a flat JSON the label-map builder consumes offline.
 *
 * Run from repo root:
 *   node scripts/pull-live-taxonomy.js
 *
 * ponytail: plain prisma + fs, no CLI args. The output path is fixed because
 * exactly one consumer (build-phrase-label-map.js) reads it.
 */
const path = require("path");
const fs = require("fs");

require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const { PrismaClient } = require("@prisma/client");

// Mirror of SERVICE_CATEGORY_WHERE in src/lib/service-categories.ts.
// Kept literal here so this offline script needs no TS path resolution.
const SERVICE_CATEGORY_WHERE = {
  pageType: "service",
  externalSource: "paslaugurinka-taxonomy",
  isActive: true,
};

const OUT = path.resolve(__dirname, "../data/routing/category-intelligence/live_taxonomy.json");

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.category.findMany({
      where: SERVICE_CATEGORY_WHERE,
      select: {
        slug: true,
        name: true,
        depth: true,
        aliases: { select: { aliasName: true } },
      },
      orderBy: [{ depth: "asc" }, { name: "asc" }],
    });

    const out = rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      depth: r.depth,
      aliases: r.aliases.map((a) => a.aliasName).filter(Boolean),
    }));

    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
    console.log(`Wrote ${out.length} categories -> ${OUT}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("pull-live-taxonomy failed:", e.message);
  process.exit(1);
});
