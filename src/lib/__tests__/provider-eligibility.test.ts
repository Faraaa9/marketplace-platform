import assert from "node:assert/strict";
import {
  categoriesMatch,
  checkEligibility,
  type CategoryNode,
} from "../provider-eligibility";

const root = (id: string): CategoryNode => ({ id, rootId: null });
// A 2-arg convenience for a node under `rootId` WITHOUT a parentId — enough for
// the root↔child relations below. Depth-2 (service) nodes that need the
// subcategory↔service relation are built inline with an explicit `parentId`.
const under = (id: string, rootId: string): CategoryNode => ({ id, rootId });

const tests: Array<[string, () => void]> = [
  // ── categoriesMatch: the 2-level relations it was designed for (correct) ──
  [
    "categoriesMatch: identical ids match",
    () => {
      assert.equal(categoriesMatch(under("a", "r"), under("a", "r")), true);
    },
  ],
  [
    "categoriesMatch: a root matches its direct child",
    () => {
      assert.equal(categoriesMatch(root("r"), under("child", "r")), true);
    },
  ],
  [
    "categoriesMatch: a child matches its root (symmetric)",
    () => {
      assert.equal(categoriesMatch(under("child", "r"), root("r")), true);
    },
  ],
  [
    "categoriesMatch: two different children of the same root do NOT match",
    () => {
      assert.equal(categoriesMatch(under("c1", "r"), under("c2", "r")), false);
    },
  ],
  [
    "categoriesMatch: unrelated roots do not match",
    () => {
      assert.equal(categoriesMatch(root("r1"), root("r2")), false);
    },
  ],
  [
    "categoriesMatch: child of one root vs a different root do not match",
    () => {
      assert.equal(categoriesMatch(under("child", "r1"), root("r2")), false);
    },
  ],

  // ── checkEligibility: status / ownership / specialization gates ──
  [
    "checkEligibility: non-OPEN request is REQUEST_CLOSED",
    () => {
      const r = checkEligibility(
        "prov",
        { status: "CLOSED", clientId: "someone", category: root("r") },
        [root("r")],
      );
      assert.equal(r.allowed, false);
      assert.equal(r.code, "REQUEST_CLOSED");
    },
  ],
  [
    "checkEligibility: own request is OWN_REQUEST",
    () => {
      const r = checkEligibility(
        "prov",
        { status: "OPEN", clientId: "prov", category: root("r") },
        [root("r")],
      );
      assert.equal(r.code, "OWN_REQUEST");
    },
  ],
  [
    "checkEligibility: provider with no categories is NO_SPECIALIZATIONS",
    () => {
      const r = checkEligibility(
        "prov",
        { status: "OPEN", clientId: "client", category: root("r") },
        [],
      );
      assert.equal(r.code, "NO_SPECIALIZATIONS");
    },
  ],
  [
    "checkEligibility: a request with no curated category is open to any provider",
    () => {
      const r = checkEligibility(
        "prov",
        { status: "OPEN", clientId: "client", category: null },
        [root("other")],
      );
      assert.equal(r.allowed, true);
      assert.equal(r.code, "OK");
    },
  ],
  [
    "checkEligibility: matching category is OK",
    () => {
      const r = checkEligibility(
        "prov",
        { status: "OPEN", clientId: "client", category: under("child", "r") },
        [root("r")],
      );
      assert.equal(r.allowed, true);
    },
  ],
  [
    "checkEligibility: non-matching category is SPECIALIZATION_MISMATCH",
    () => {
      const r = checkEligibility(
        "prov",
        { status: "OPEN", clientId: "client", category: under("c1", "r") },
        [under("c2", "r")],
      );
      assert.equal(r.code, "SPECIALIZATION_MISMATCH");
    },
  ],

  // ── Root-level provider is UNAFFECTED by the depth bug: because a depth-2
  //    leaf carries rootId === the root's id, categoriesMatch(root, leaf) works.
  //    This is the contrast case that proves the bug is specific to depth-1
  //    (subcategory) providers, not root providers. ──
  [
    "checkEligibility: a ROOT-level provider correctly matches a deep (depth-2) lead under that root",
    () => {
      const r = checkEligibility(
        "prov",
        { status: "OPEN", clientId: "client", category: under("deepLeaf", "r") },
        [root("r")],
      );
      assert.equal(r.allowed, true);
    },
  ],

  // ════════════════════════════════════════════════════════════════════════
  // DEPTH FIX (audit 2026-06-13). The taxonomy is a 3-level tree
  // (root -> subcategory(depth1) -> concrete service(depth2)). categoriesMatch
  // now uses parentId so the unlock/respond gate agrees with the inbox matcher
  // expandToMatchSet (id + ancestors + descendants): any lead a provider can SEE
  // is a lead they can act on. These were the "KNOWN BUG" characterization tests
  // (a depth-1 provider saw a depth-2 lead but got 403 on unlock); they now
  // assert the corrected behavior.
  // ════════════════════════════════════════════════════════════════════════
  [
    "FIX: depth-1 provider matches a depth-2 service nested directly under it",
    () => {
      // provider holds subcategory "sub" (depth-1); request's primary is the
      // concrete service "leaf" (depth-2, parentId === "sub").
      const providerSub: CategoryNode = { id: "sub", rootId: "r", parentId: "r" };
      const requestLeaf: CategoryNode = { id: "leaf", rootId: "r", parentId: "sub" };
      // expandToMatchSet("sub") includes "leaf" (descendant) -> inbox shows it,
      // and now the gate agrees.
      assert.equal(categoriesMatch(providerSub, requestLeaf), true);
    },
  ],
  [
    "FIX: symmetric — depth-2 provider matches the depth-1 subcategory that is its parent",
    () => {
      const providerLeaf: CategoryNode = { id: "leaf", rootId: "r", parentId: "sub" };
      const requestSub: CategoryNode = { id: "sub", rootId: "r", parentId: "r" };
      assert.equal(categoriesMatch(providerLeaf, requestSub), true);
    },
  ],
  [
    "FIX: checkEligibility now allows the depth-1-provider / depth-2-lead pair (was SPECIALIZATION_MISMATCH)",
    () => {
      const r = checkEligibility(
        "prov",
        {
          status: "OPEN",
          clientId: "client",
          category: { id: "leaf", rootId: "r", parentId: "sub" },
        },
        [{ id: "sub", rootId: "r", parentId: "r" }],
      );
      assert.equal(r.allowed, true);
      assert.equal(r.code, "OK");
    },
  ],
  [
    "precision guard: a depth-2 service under a DIFFERENT subcategory (same root) still does NOT match",
    () => {
      // provider holds subcategory X; request is a leaf under sibling
      // subcategory Y. expandToMatchSet("X") does NOT include leaves under Y, so
      // the inbox hides it — and the gate must reject it too.
      const providerSubX: CategoryNode = { id: "X", rootId: "r", parentId: "r" };
      const requestLeafUnderY: CategoryNode = { id: "leafY", rootId: "r", parentId: "Y" };
      assert.equal(categoriesMatch(providerSubX, requestLeafUnderY), false);
    },
  ],
];

(async () => {
  for (const [name, fn] of tests) {
    fn();
    console.log(`ok - ${name}`);
  }
  console.log("RESULT: PASS");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
