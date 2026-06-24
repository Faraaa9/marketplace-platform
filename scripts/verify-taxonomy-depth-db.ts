/**
 * verify:taxonomy-depth-db — DB-side depth guard (pre-deploy / post-import).
 *
 * Walks the LIVE Category.parentId graph for the service taxonomy (the exact set
 * expandToMatchSet loads: pageType="service", isActive=true) and FAILS LOUDLY,
 * with the offending category ids + chains, if any node exceeds MAX_SUPPORTED_DEPTH.
 * A depth-3 service category would be surfaced in a provider's inbox by
 * expandToMatchSet (full descent) yet be unmatchable by the unlock/respond gate
 * categoriesMatch (single parent hop) — re-opening the 2026-06-13 depth bug. The DB
 * is the ONLY place such a node can actually exist (the flat source file's 3-slot
 * schema cannot encode it — see src/lib/__tests__/taxonomy-depth-tripwire.test.ts).
 *
 * PLACEMENT — this is a pre-deploy / post-import gate, NOT a boot-time assertion.
 * Why (recommended over boot-time): (1) the taxonomy is import-time data — it only
 * changes when an admin runs `pnpm import:paslaugurinka-taxonomy`, never at runtime,
 * so re-checking on every (serverless) cold start is wasted work + a startup DB
 * dependency; (2) blast radius — a false positive in a boot assertion takes the
 * whole app down (no requests served), whereas here it only blocks a deploy
 * (recoverable, visible, zero user impact); (3) it pairs naturally with the import
 * and the deploy pipeline, exactly where a depth-3 node could be introduced.
 *
 * Needs DB access (DATABASE_URL) → deliberately NOT part of the pure-CI suite.
 * Run after the taxonomy import and/or as a deploy gate.
 *
 * Run:
 *   pnpm verify:taxonomy-depth-db
 */
import { config } from "dotenv";
import path from "node:path";

// Load env BEFORE prisma is imported — prisma.ts reads DATABASE_URL at module
// eval. .env.local takes precedence (Next.js convention), then .env.
config({ path: path.resolve(__dirname, "../.env.local") });
config({ path: path.resolve(__dirname, "../.env") });

import {
  findNodesExceedingDepth,
  MAX_SUPPORTED_DEPTH,
  type TreeNode,
} from "@/lib/taxonomy-depth";

async function main(): Promise<void> {
  // Lazy require so the dotenv config above runs first.
  const { prisma } = require("@/lib/prisma") as typeof import("@/lib/prisma");
  const { SERVICE_CATEGORY_WHERE } = require("@/lib/service-categories") as typeof import("@/lib/service-categories");

  const rows: TreeNode[] = await prisma.category.findMany({
    where: SERVICE_CATEGORY_WHERE,
    select: { id: true, parentId: true },
  });

  const violations = findNodesExceedingDepth(rows, MAX_SUPPORTED_DEPTH);

  if (violations.length > 0) {
    const lines = violations
      .slice(0, 50)
      .map((v) => `  ${v.id} @ depth ${v.depth}  (chain: ${v.chain.join(" -> ")})`)
      .join("\n");
    console.error(
      `✗ taxonomy depth violation: ${violations.length} service categor` +
        `${violations.length === 1 ? "y" : "ies"} exceed depth ${MAX_SUPPORTED_DEPTH}.\n` +
        `expandToMatchSet (inbox) surfaces these, but categoriesMatch (unlock/respond gate) ` +
        `cannot match them — re-opening the 2026-06-13 depth bug. Extend categoriesMatch ` +
        `(general ancestor walk / reuse expandToMatchSet) before deepening the tree.\n` +
        lines +
        (violations.length > 50 ? `\n  ...and ${violations.length - 50} more` : ""),
    );
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log(
    `✓ taxonomy depth OK — ${rows.length} active service categories, ` +
      `max structural depth ≤ ${MAX_SUPPORTED_DEPTH}.`,
  );
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("verify:taxonomy-depth-db failed:", error);
  process.exit(1);
});
