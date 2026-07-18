import { prisma } from "./clients";

// Read-only: print live category names matching each keyword, to hand-label hard-query gold.
const KEYWORDS = process.argv.slice(2);

async function main() {
  for (const kw of KEYWORDS) {
    const rows = await prisma.$queryRawUnsafe<{ name: string }[]>(
      `select c.name from category_embedding e join categories c on c.id = e.category_id where c.name ilike $1 order by c.name limit 12`,
      `%${kw}%`,
    );
    console.log(`\n[${kw}]`);
    rows.forEach((r) => console.log("  " + r.name));
  }
  await prisma.$disconnect();
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
