import { prisma } from "./clients";
import { runFull } from "./pipeline";

async function main() {
  const [{ count }] = await prisma.$queryRaw<{ count: bigint }[]>`select count(*)::bigint as count from category_embedding`;
  console.log(`category_embedding rows: ${count}`);
  const jobs = await runFull("Reikia nupjauti žolę, iškasti tvenkinį ir nuplauti mašiną", { k: 50, fewshot: true });
  for (const j of jobs) {
    console.log(`\nDARBAS: ${j.phrase}  (spėjimas: ${j.draft})`);
    console.log("  picks:", j.picks.map((p) => `${p.category} [${p.confidence}]`).join(" | ") || "(nėra)");
    console.log("  top5 cand:", j.candidates.slice(0, 5).map((c) => c.name).join("; "));
  }
  await prisma.$disconnect();
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
