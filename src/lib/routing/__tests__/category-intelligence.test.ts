/**
 * Category Intelligence TS port — behavior tests + Python parity.
 *
 * Deterministic, no DB, no network. Two layers:
 *  1. Behavior: the safety contract from the offline evaluation (ambiguous ->
 *     review not selection, redirects suppress, agreeing strong phrase lifts
 *     confidence, review caps confidence).
 *  2. Parity: every case in fixtures/ci-parity.json (generated from the
 *     validated Python adapter by scripts/ai-routing/build_ci_parity_fixture.py)
 *     must produce identical matched phrases / ranking boosts / ambiguity
 *     phrases / redirect tokens.
 *
 * Run:  pnpm routing:ci-signal
 */
import assert from "node:assert/strict";
import {
  analyzeCategoryIntelligence,
  combineWithRouting,
  CI_SCORING,
} from "../category-intelligence";
import parityCases from "./fixtures/ci-parity.json";

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

console.log("Category Intelligence — TS port (shadow review/confidence signal)");

// ── 1. Behavior ────────────────────────────────────────────────────────────

t("empty signal on no match", () => {
  const sig = analyzeCategoryIntelligence("zzqq", "wwxx yyzz");
  assert.equal(sig.matchedPhrases.length, 0);
  assert.deepEqual(sig.rankingBoosts, {});
  const d = combineWithRouting(sig, "Santechnikai, santechnikos darbai", 0.8);
  assert.equal(d.shouldReview, false);
  assert.equal(d.confidence, 0.8);
});

t("finds 'bega vanduo' in a longer sentence", () => {
  const sig = analyzeCategoryIntelligence(
    "Bėga vanduo",
    "bėga vanduo per vamzdį po kriaukle",
  );
  assert.ok(
    sig.matchedPhrases.some((m) => m.phrase === "bega vanduo"),
    `matched: ${sig.matchedPhrases.map((m) => m.phrase).join(", ")}`,
  );
});

t("ambiguous phrase alone -> review when router picks outside the distribution", () => {
  const sig = analyzeCategoryIntelligence("Bėga vanduo", "bėga vanduo");
  assert.ok(sig.ambiguitySignals.length > 0, "expected an ambiguity signal");
  // 'bega vanduo' dist: Santechnika ~53%, Buitinės technikos remontas ~13%.
  const outside = combineWithRouting(sig, "Valymo paslaugos", 0.9);
  assert.equal(outside.shouldReview, true);
  assert.ok(outside.confidence <= CI_SCORING.reviewConfidenceCap);
});

t("ambiguous phrase NOT escalated when router confidently picks inside the distribution", () => {
  const sig = analyzeCategoryIntelligence("Bėga vanduo", "bėga vanduo");
  const inside = combineWithRouting(sig, "Santechnikai, santechnikos darbai", 0.9);
  assert.equal(inside.shouldReview, false);
});

t("ambiguous phrase + low router confidence -> review even inside the distribution", () => {
  const sig = analyzeCategoryIntelligence("Bėga vanduo", "bėga vanduo");
  const lowConf = combineWithRouting(sig, "Santechnikai, santechnikos darbai", 0.45);
  assert.equal(lowConf.shouldReview, true);
});

t("'lietvamzdis' does not boost Santechnika; redirect fires toward Stogdengiai", () => {
  const sig = analyzeCategoryIntelligence(
    "Lietvamzdis",
    "lietvamzdis nuo stogo bėga vanduo lietaus",
  );
  const santech = Object.entries(sig.rankingBoosts)
    .filter(([c]) => c.toLowerCase().includes("santechnik"))
    .reduce((s, [, v]) => s + v, 0);
  assert.ok(santech <= 0, `Santechnika boost should be <= 0, got ${santech}`);
  assert.ok(sig.redirectHints.some((h) => h.token === "lietvamzdis"));
  assert.ok(sig.redirectHints.some((h) => h.to.includes("Stogdengiai")));
  const d = combineWithRouting(sig, "Santechnikai, santechnikos darbai", 0.9);
  assert.equal(d.shouldReview, true);
  assert.ok(d.confidence <= CI_SCORING.reviewConfidenceCap);
});

t("agreeing strong phrase lifts the router's confidence (never re-ranks)", () => {
  const sig = analyzeCategoryIntelligence(
    "Kanalizacijos valymas",
    "reikia išvalyti kanalizacijos vamzdžius",
  );
  const santech = Object.entries(sig.rankingBoosts)
    .filter(([c]) => c.toLowerCase().includes("santechnik"))
    .reduce((s, [, v]) => s + v, 0);
  assert.ok(santech > 0, `expected positive Santechnika boost, got ${santech}`);
  const agree = combineWithRouting(sig, "Santechnikai, santechnikos darbai", 0.5);
  const disagree = combineWithRouting(sig, "Baldų gamyba", 0.5);
  assert.ok(agree.confidence > 0.5, `agreeing pick should lift confidence, got ${agree.confidence}`);
  assert.ok(
    disagree.confidence <= agree.confidence,
    "a disagreeing pick must never gain more confidence than an agreeing one",
  );
});

t("katilas/šildymas redirects away from generic Santechnika", () => {
  const sig = analyzeCategoryIntelligence(
    "Dujinio katilo remontas",
    "neveikia dujinis katilas, šildymas nešyla",
  );
  assert.ok(
    sig.redirectHints.some((h) => h.to === "Katilų montavimas, remontas"),
    `hints: ${JSON.stringify(sig.redirectHints)}`,
  );
  const d = combineWithRouting(sig, "Santechnikai, santechnikos darbai", 0.9);
  assert.equal(d.shouldReview, true);
});

// ── 2. Parity vs the validated Python adapter ──────────────────────────────

interface ParityCase {
  title: string;
  description: string;
  matchedFolded: string[];
  rankingBoosts: Record<string, number>;
  ambiguityPhrases: string[];
  redirectTokens: string[];
}

// Through `unknown`: tsc otherwise infers the fixture's exact literal type,
// whose per-case optional keys are incompatible with Record<string, number>.
const cases = parityCases as unknown as ParityCase[];

t(`parity with Python adapter on ${cases.length} fixture cases`, () => {
  const eps = 1e-6;
  for (const c of cases) {
    const sig = analyzeCategoryIntelligence(c.title, c.description);
    const label = `case "${c.title}"`;

    const matched = [...new Set(sig.matchedPhrases.map((m) => m.phrase))].sort();
    assert.deepEqual(matched, c.matchedFolded, `${label}: matched phrases differ`);

    const gotBoosts = Object.keys(sig.rankingBoosts).sort();
    const expBoosts = Object.keys(c.rankingBoosts).sort();
    assert.deepEqual(gotBoosts, expBoosts, `${label}: boost categories differ`);
    for (const k of expBoosts) {
      assert.ok(
        Math.abs(sig.rankingBoosts[k] - c.rankingBoosts[k]) < eps,
        `${label}: boost for "${k}" ${sig.rankingBoosts[k]} != ${c.rankingBoosts[k]}`,
      );
    }

    const ambPhrases = [...new Set(sig.ambiguitySignals.map((a) => a.phrase))].sort();
    assert.deepEqual(ambPhrases, c.ambiguityPhrases, `${label}: ambiguity phrases differ`);

    const tokens = sig.redirectHints.map((h) => h.token).sort();
    assert.deepEqual(tokens, c.redirectTokens, `${label}: redirect tokens differ`);
  }
});

if (failures > 0) {
  console.error(`\n${failures} test(s) FAILED`);
  process.exit(1);
}
console.log("\nAll category-intelligence tests passed.");
