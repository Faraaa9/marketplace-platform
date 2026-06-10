/**
 * Routing Review Queue tests — pure logic only (no DB, no network):
 * feature-flag gating, review-submission validation, and the eval export
 * shape's compatibility with data/routing/eval/golden_eval_300_labeled.jsonl.
 *
 * Run:  pnpm test:routing-review
 */
import assert from "node:assert/strict";
import {
  isRoutingReviewEnabled,
  parseReviewSubmission,
  buildEvalRecord,
  type ReviewItemForExport,
} from "../review-queue";

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

console.log("Routing Review Queue — flag gating");

t("review queue is OFF by default", () => {
  delete process.env.ROUTING_REVIEW_QUEUE_ENABLED;
  assert.equal(isRoutingReviewEnabled(), false);
});

t("review queue stays OFF for falsy values", () => {
  for (const v of ["false", "0", "no", "off", ""]) {
    process.env.ROUTING_REVIEW_QUEUE_ENABLED = v;
    assert.equal(isRoutingReviewEnabled(), false, `value "${v}" must not enable`);
  }
});

t("review queue turns ON for true/1/yes (case-insensitive)", () => {
  for (const v of ["true", "TRUE", "1", "yes", "Yes"]) {
    process.env.ROUTING_REVIEW_QUEUE_ENABLED = v;
    assert.equal(isRoutingReviewEnabled(), true, `value "${v}" must enable`);
  }
  delete process.env.ROUTING_REVIEW_QUEUE_ENABLED;
});

console.log("\nRouting Review Queue — submission validation");

t("rejects non-object and missing/unknown action", () => {
  assert.equal(parseReviewSubmission(null).ok, false);
  assert.equal(parseReviewSubmission("approve").ok, false);
  assert.equal(parseReviewSubmission({}).ok, false);
  assert.equal(parseReviewSubmission({ action: "delete" }).ok, false);
});

t("approve: clears correction fields and keeps trimmed notes", () => {
  const r = parseReviewSubmission({
    action: "approve",
    notes: "  atrodo gerai  ",
    correctedCategoryIds: ["tax_x"], // must be ignored on approve
  });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.value.action, "approve");
  assert.deepEqual(r.value.correctedCategoryIds, []);
  assert.deepEqual(r.value.correctedCategoryNames, []);
  assert.equal(r.value.correctedPrimaryCategoryId, null);
  assert.equal(r.value.correctedIsAmbiguous, false);
  assert.equal(r.value.correctionNotes, "atrodo gerai");
});

t("correct: rejects non-string-array categories", () => {
  const r = parseReviewSubmission({
    action: "correct",
    correctedCategoryIds: [1, 2],
    correctedCategoryNames: ["A", "B"],
  });
  assert.equal(r.ok, false);
});

t("correct: rejects mismatched ids/names lengths", () => {
  const r = parseReviewSubmission({
    action: "correct",
    correctedCategoryIds: ["tax_a"],
    correctedCategoryNames: ["A", "B"],
  });
  assert.equal(r.ok, false);
});

t("correct: empty correction requires isAmbiguous", () => {
  const rejected = parseReviewSubmission({
    action: "correct",
    correctedCategoryIds: [],
    correctedCategoryNames: [],
  });
  assert.equal(rejected.ok, false);

  const accepted = parseReviewSubmission({
    action: "correct",
    correctedCategoryIds: [],
    correctedCategoryNames: [],
    isAmbiguous: true,
    notes: "generalinė ranga, ne viena paslauga",
  });
  assert.ok(accepted.ok);
  if (!accepted.ok) return;
  assert.equal(accepted.value.correctedIsAmbiguous, true);
  assert.deepEqual(accepted.value.correctedCategoryIds, []);
});

t("correct: primary must be among corrected ids", () => {
  const r = parseReviewSubmission({
    action: "correct",
    correctedCategoryIds: ["tax_a"],
    correctedCategoryNames: ["A"],
    correctedPrimaryCategoryId: "tax_other",
    correctedPrimaryCategoryName: "Other",
  });
  assert.equal(r.ok, false);
});

t("correct: happy path trims values and preserves order", () => {
  const r = parseReviewSubmission({
    action: "correct",
    correctedCategoryIds: [" tax_sant ", "tax_elek"],
    correctedCategoryNames: ["Santechnikai, santechnikos darbai", "Elektrikai, elektros darbai"],
    correctedPrimaryCategoryId: "tax_sant",
    correctedPrimaryCategoryName: "Santechnikai, santechnikos darbai",
  });
  assert.ok(r.ok);
  if (!r.ok) return;
  assert.equal(r.value.action, "correct");
  assert.deepEqual(r.value.correctedCategoryIds, ["tax_sant", "tax_elek"]);
  assert.equal(r.value.correctedPrimaryCategoryId, "tax_sant");
  assert.equal(r.value.correctedIsAmbiguous, false);
  assert.equal(r.value.correctionNotes, null);
});

console.log("\nRouting Review Queue — eval export (golden_eval shape)");

const baseItem: ReviewItemForExport = {
  requestId: "cmreq123",
  title: "Vonios plytelių klijavimas",
  description: "Reikia perkloti plyteles vonioje.",
  city: "Kaunas",
  requestStatus: "OPEN",
  aiPrimaryCategoryName: "Plytelių klojimas",
  aiCategoryNames: ["Plytelių klojimas", "Vidaus apdailos darbai"],
  status: "PENDING",
  correctedPrimaryCategoryName: null,
  correctedCategoryNames: [],
  correctedIsAmbiguous: null,
  correctionNotes: null,
  reviewedAt: null,
};

t("PENDING items are not exported", () => {
  assert.equal(buildEvalRecord(baseItem), null);
});

t("APPROVED: gold label = AI decision", () => {
  const rec = buildEvalRecord({
    ...baseItem,
    status: "APPROVED",
    reviewedAt: new Date("2026-06-10T12:00:00Z"),
  });
  assert.ok(rec);
  if (!rec) return;
  assert.equal(rec.gold_primary_category, "Plytelių klojimas");
  assert.deepEqual(rec.gold_secondary_categories, ["Vidaus apdailos darbai"]);
  assert.equal(rec.suggested_primary_category, "Plytelių klojimas");
  assert.deepEqual(rec.suggested_secondary_categories, ["Vidaus apdailos darbai"]);
  assert.equal(rec.gold_is_ambiguous, false);
  assert.equal(rec.labeled, true);
  assert.equal(rec.labeled_at, "2026-06-10T12:00:00.000Z");
});

t("CORRECTED: gold label = human correction, suggested stays = AI", () => {
  const rec = buildEvalRecord({
    ...baseItem,
    status: "CORRECTED",
    correctedPrimaryCategoryName: "Santechnikai, santechnikos darbai",
    correctedCategoryNames: ["Santechnikai, santechnikos darbai", "Elektrikai, elektros darbai"],
    correctionNotes: "AI pataikė ne tą sritį",
    reviewedAt: new Date("2026-06-10T13:30:00Z"),
  });
  assert.ok(rec);
  if (!rec) return;
  assert.equal(rec.suggested_primary_category, "Plytelių klojimas");
  assert.equal(rec.gold_primary_category, "Santechnikai, santechnikos darbai");
  assert.deepEqual(rec.gold_secondary_categories, ["Elektrikai, elektros darbai"]);
  assert.equal(rec.gold_notes, "AI pataikė ne tą sritį");
});

t("CORRECTED ambiguous: empty gold primary, gold_is_ambiguous true", () => {
  const rec = buildEvalRecord({
    ...baseItem,
    status: "CORRECTED",
    correctedPrimaryCategoryName: null,
    correctedCategoryNames: ["Vidaus apdailos darbai", "Santechnikai, santechnikos darbai"],
    correctedIsAmbiguous: true,
    reviewedAt: new Date("2026-06-10T14:00:00Z"),
  });
  assert.ok(rec);
  if (!rec) return;
  assert.equal(rec.gold_primary_category, "");
  assert.deepEqual(rec.gold_secondary_categories, [
    "Vidaus apdailos darbai",
    "Santechnikai, santechnikos darbai",
  ]);
  assert.equal(rec.gold_is_ambiguous, true);
});

t("export record keys are a subset-compatible match of the golden_eval shape", () => {
  // Field names from data/routing/eval/golden_eval_300_labeled.jsonl that the
  // export emits. If this list drifts, the eval tooling contract is broken —
  // update the golden set tooling, not just this test.
  const expectedKeys = [
    "request_id",
    "title",
    "description",
    "city",
    "status",
    "suggested_primary_category",
    "suggested_secondary_categories",
    "gold_primary_category",
    "gold_secondary_categories",
    "gold_tags",
    "gold_notes",
    "gold_is_ambiguous",
    "labeled",
    "labeled_at",
  ].sort();
  const rec = buildEvalRecord({ ...baseItem, status: "APPROVED", reviewedAt: new Date() });
  assert.ok(rec);
  if (!rec) return;
  assert.deepEqual(Object.keys(rec).sort(), expectedKeys);
});

console.log(failures === 0 ? "\nRESULT: PASS" : `\nRESULT: FAIL — ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
