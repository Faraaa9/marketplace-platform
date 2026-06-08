/**
 * Phase A2 — identity carry-through tests for multi-routing v4. Deterministic,
 * no DB, no network. Asserts that v4 keeps each surviving candidate's ORIGINAL
 * request `categoryId` instead of re-resolving the name (which is ambiguous for
 * DISTINCT_TAX duplicates). See docs/ai-routing/phase-a2-routing-contract-plan.md.
 *
 * Run:  pnpm routing:identity
 */
import assert from "node:assert/strict";
import { classifyMultiRouting, type RoutingCandidate } from "../multi-routing-v4";

let failures = 0;
function t(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failures += 1;
    console.error(`  ✗ ${name}\n      ${(e as Error).message}`);
  }
}

console.log("Phase A2 — identity carry-through (multi-routing v4)");

// 1. "Sodybos nuomai" has 3 active service tax_ ids (DISTINCT_TAX). The request
//    carried tax_1366…; v4 must keep THAT id, not the lowest-id duplicate.
t("Sodybos nuomai keeps the request's own categoryId, not the lowest tax_ duplicate", () => {
  const candidates: RoutingCandidate[] = [
    { categoryId: "tax_1366216ea80fa9898e", categoryName: "Sodybos nuomai" },
  ];
  const r = classifyMultiRouting({
    title: "Sodybos nuoma savaitgaliui",
    description: "Ieškau sodybos nuomai prie ežero dešimties žmonių grupei.",
    candidates,
    status: "OPEN",
  });
  assert.equal(r.routingCategories.length, 1);
  assert.equal(r.routingCategories[0].categoryId, "tax_1366216ea80fa9898e");
  assert.equal(r.routingCategories[0].categoryName, "Sodybos nuomai");
  assert.notEqual(
    r.routingCategories[0].categoryId,
    "tax_0b40ccdecc82452a0a",
    "must NOT collapse to the lowest-id duplicate",
  );
});

// 2. "Plytelių klijavimas" exists as a tax_ service id AND a dead barehex leaf.
//    The request carried the tax_ id; v4 must keep it, never the barehex dup.
t("Plytelių klijavimas keeps the request's own categoryId, not the barehex dup", () => {
  const candidates: RoutingCandidate[] = [
    { categoryId: "tax_c5fe96c2e44b02a4b5", categoryName: "Plytelių klijavimas" },
  ];
  const r = classifyMultiRouting({
    title: "Vonios plytelių klijavimas",
    description: "Reikia perkloti plyteles vonioje.",
    candidates,
    status: "OPEN",
  });
  assert.equal(r.routingCategories.length, 1);
  assert.equal(r.routingCategories[0].categoryId, "tax_c5fe96c2e44b02a4b5");
  assert.notEqual(r.routingCategories[0].categoryId, "20fb37fba25f", "must NOT be the barehex leaf dup");
});

// 3. Catch-all suppression still removes "Statybos darbai" (no text evidence)
//    while the surviving category keeps its ORIGINAL id.
t("catch-all suppression drops 'Statybos darbai' and preserves the remaining categoryId", () => {
  const candidates: RoutingCandidate[] = [
    { categoryId: "tax_statybos_id", categoryName: "Statybos darbai" },
    { categoryId: "tax_elektrikai_id", categoryName: "Elektrikai, elektros darbai" },
  ];
  const r = classifyMultiRouting({
    title: "Elektros instaliacija",
    description: "Reikia pakeisti elektros instaliaciją dviejų kambarių bute.",
    candidates,
    status: "OPEN",
  });
  const names = r.routingCategories.map((c) => c.categoryName);
  const ids = r.routingCategories.map((c) => c.categoryId);
  assert.ok(!names.includes("Statybos darbai"), "'Statybos darbai' must be suppressed");
  assert.deepEqual(names, ["Elektrikai, elektros darbai"]);
  assert.deepEqual(ids, ["tax_elektrikai_id"], "surviving category keeps its original id");
});

console.log(failures === 0 ? "\nRESULT: PASS" : `\nRESULT: FAIL — ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
