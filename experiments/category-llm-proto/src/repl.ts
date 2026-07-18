/**
 * Interactive demo. Type a Lithuanian request, see the segmented jobs, the
 * auto-picked categories, confidence, and AUTO vs "needs confirm" gate.
 * Run:  pnpm proto:repl   (or the npx ts-node incantation in README)
 */
import readline from "node:readline";
import { prisma } from "./clients";
import { runFull } from "./pipeline";

const AUTO_THRESHOLD = Number(process.env.PROTO_AUTO_THR || 0.9);
const K = Number(process.env.PROTO_K || 50);

async function handle(text: string) {
  const t0 = Date.now();
  const jobs = await runFull(text, { k: K, fewshot: true });
  if (!jobs.length) { console.log("  (nepavyko išskaidyti / nėra kandidatų)"); return; }
  console.log("");
  jobs.forEach((j, i) => {
    const top = j.picks[0];
    const auto = top && top.confidence >= AUTO_THRESHOLD;
    const tag = top ? (auto ? "✅ AUTO" : "⚠️  REIKIA PATVIRTINIMO") : "∅ NĖRA";
    console.log(`  ${i + 1}. „${j.phrase}"  ${tag}`);
    if (top) {
      j.picks.forEach((p, pi) => console.log(`        ${pi === 0 ? "→" : " "} ${p.category}  (conf ${p.confidence})`));
    }
    console.log(`        kiti kandidatai: ${j.candidates.slice(0, 5).map((c) => c.name).join("; ")}`);
  });
  const autoCount = jobs.filter((j) => j.picks[0] && j.picks[0].confidence >= AUTO_THRESHOLD).length;
  console.log(`\n  ${autoCount}/${jobs.length} darbų auto (conf ≥ ${AUTO_THRESHOLD})   ${Date.now() - t0}ms\n`);
}

async function main() {
  console.log(`Category LLM prototype REPL — k=${K}, auto threshold=${AUTO_THRESHOLD}. Įvesk užklausą (Ctrl+C išeiti).`);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: "\n> " });
  rl.prompt();
  rl.on("line", async (line) => {
    const text = line.trim();
    if (text) { try { await handle(text); } catch (e) { console.error("  klaida:", (e as Error).message); } }
    rl.prompt();
  });
  rl.on("close", async () => { await prisma.$disconnect(); process.exit(0); });
}
main();
