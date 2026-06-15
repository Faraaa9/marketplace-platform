/**
 * CONTRACT TEST — welds the two category matchers together.
 *
 * The lead inbox decides "can a provider SEE this lead" with
 *   expandToMatchSet(providerCategoryIds)  (src/lib/category-matching.ts)
 * while the unlock/respond gate decides "can a provider ACT on this lead" with
 *   categoriesMatch(providerCat, requestCat)  (src/lib/provider-eligibility.ts)
 *
 * These MUST agree, or a provider sees a lead they cannot unlock (or vice versa).
 * This test runs the REAL expandToMatchSet against a synthetic 3-level fixture
 * (the DB call is stubbed — no live-DB dependency) and asserts, for EVERY ordered
 * pair, that:
 *     categoriesMatch(a, b) === expandToMatchSet(a.id).has(b.id)
 *
 * IMPORTANT: this is a TRUTH PROBE, not a target. If a pair diverges, the
 * assertion prints the exact pair and what each function returned — that is a
 * FINDING to review, NOT a reason to change either production function.
 *
 * Note: the two functions use DIFFERENT inputs — expandToMatchSet walks the
 * `parentId` tree (ignoring rootId), categoriesMatch keys off `rootId` (root
 * relations) + `parentId` (direct parent). They agree only while `rootId`
 * faithfully points at the top root AND the tree is ≤3 levels. The live
 * read-only probe (run separately, reported in chat) checks the real data.
 *
 * Run:
 *   npx ts-node --transpile-only -r ./scripts/_register-paths.js \
 *     --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' \
 *     src/lib/__tests__/eligibility-contract.test.ts
 */
import assert from "node:assert/strict";
import { Module } from "node:module";
import * as nodePath from "node:path";
import { categoriesMatch, type CategoryNode } from "../provider-eligibility";

// Resolve the "@/…" path alias INLINE (no tsconfig-paths dependency, so this runs
// in plain CI without `-r scripts/_register-paths.js`): category-matching.ts
// imports "@/lib/prisma", so map "@/" -> src/ here, before that module is required.
const SRC_ROOT = nodePath.resolve(__dirname, "../..");
const ModuleAny = Module as unknown as {
  _resolveFilename: (req: string, ...rest: unknown[]) => string;
};
const _origResolveFilename = ModuleAny._resolveFilename;
ModuleAny._resolveFilename = function (request: string, ...rest: unknown[]) {
  const mapped = request.startsWith("@/") ? nodePath.join(SRC_ROOT, request.slice(2)) : request;
  return _origResolveFilename.call(this, mapped, ...rest);
};

// ── Synthetic 3-level fixture: root → subcategory → service ────────────────
//   R1 ─┬─ A ─┬─ A1
//       │     ├─ A2
//       │     └─ A3
//       └─ B ─── B1
//   R2 ─── C ─── C1            (separate root + subtree)
// rootId points at the TOP root (depth-0), mirroring the live taxonomy import.
interface Row {
  id: string;
  parentId: string | null;
  rootId: string | null;
  depth: number;
}
const FIXTURE: Row[] = [
  { id: "R1", parentId: null, rootId: null, depth: 0 },
  { id: "A", parentId: "R1", rootId: "R1", depth: 1 },
  { id: "B", parentId: "R1", rootId: "R1", depth: 1 },
  { id: "A1", parentId: "A", rootId: "R1", depth: 2 },
  { id: "A2", parentId: "A", rootId: "R1", depth: 2 },
  { id: "A3", parentId: "A", rootId: "R1", depth: 2 },
  { id: "B1", parentId: "B", rootId: "R1", depth: 2 },
  { id: "R2", parentId: null, rootId: null, depth: 0 },
  { id: "C", parentId: "R2", rootId: "R2", depth: 1 },
  { id: "C1", parentId: "C", rootId: "R2", depth: 2 },
];

// ── Stub @/lib/prisma BEFORE the SUT loads, so the REAL expandToMatchSet runs
//    against the fixture with no live DB. category.findMany returns the fixture
//    rows in exactly the { id, parentId } shape expandToMatchSet selects. ──
const prismaPath = require.resolve("@/lib/prisma");
require.cache[prismaPath] = {
  id: prismaPath,
  filename: prismaPath,
  loaded: true,
  children: [],
  paths: [],
  exports: {
    prisma: {
      category: {
        findMany: async () => FIXTURE.map((r) => ({ id: r.id, parentId: r.parentId })),
      },
    },
  },
} as unknown as NodeModule;

// require (not a top-level import) so the prisma stub above is guaranteed to be
// cached before the SUT loads. eslint-disable: the deferred load is the whole point.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { expandToMatchSet } = require("../category-matching") as typeof import("../category-matching");

const ID = FIXTURE.map((r) => r.id);
const node = (id: string): CategoryNode => {
  const r = FIXTURE.find((x) => x.id === id)!;
  return { id: r.id, rootId: r.rootId, parentId: r.parentId };
};

(async () => {
  // Materialize the inbox view: for each node, the set expandToMatchSet returns.
  const inboxSet = new Map<string, Set<string>>();
  for (const id of ID) {
    inboxSet.set(id, new Set(await expandToMatchSet([id])));
  }
  const seesInInbox = (aId: string, bId: string) => inboxSet.get(aId)!.has(bId);

  const tests: Array<[string, () => void]> = [
    // ── The weld: every ordered pair must agree. ──
    [
      "CONTRACT: categoriesMatch(a,b) === expandToMatchSet(a.id).has(b.id) for ALL ordered pairs (both directions)",
      () => {
        const divergences: string[] = [];
        for (const a of ID) {
          for (const b of ID) {
            const canAct = categoriesMatch(node(a), node(b));
            const canSee = seesInInbox(a, b);
            if (canAct !== canSee) {
              divergences.push(
                `(${a} -> ${b}): categoriesMatch=${canAct} | expandToMatchSet.has=${canSee}`,
              );
            }
          }
        }
        assert.equal(
          divergences.length,
          0,
          `\nCONTRACT DIVERGENCE (truth-probe FINDING — do NOT change production code to fix this):\n  ` +
            divergences.join("\n  "),
        );
      },
    ],

    // ── Named cases, so a future reader sees the intended contract explicitly.
    //    Each asserts the production value AND that "can act" === "can see". ──
    [
      "parent↔child MATCHES: subcategory A can act on its service A1 (and A1 is in A's inbox)",
      () => {
        assert.equal(categoriesMatch(node("A"), node("A1")), true);
        assert.equal(seesInInbox("A", "A1"), true);
      },
    ],
    [
      "child↔parent MATCHES: service A1 can act on its subcategory A (symmetric)",
      () => {
        assert.equal(categoriesMatch(node("A1"), node("A")), true);
        assert.equal(seesInInbox("A1", "A"), true);
      },
    ],
    [
      "depth-2 siblings do NOT match: A1 vs A2 (same subcategory, different service)",
      () => {
        assert.equal(categoriesMatch(node("A1"), node("A2")), false);
        assert.equal(seesInInbox("A1", "A2"), false);
      },
    ],
    [
      "root↔depth-2 grandchild — contract holds (asserts equality, not a hardcoded verdict)",
      () => {
        // Whatever the real contract is, the two functions MUST agree. With a
        // correctly-populated rootId (depth-2.rootId === top root) both are true:
        // expandToMatchSet(R1) includes the grandchild A1, and categoriesMatch
        // matches via rootId. The assertion is equality — if they ever diverge
        // (e.g. a depth-2 row whose rootId does NOT point at the top root), this
        // fails and reports it.
        const canAct = categoriesMatch(node("R1"), node("A1"));
        const canSee = seesInInbox("R1", "A1");
        assert.equal(
          canAct,
          canSee,
          `root↔depth-2 DIVERGED: categoriesMatch=${canAct} expandToMatchSet.has=${canSee}`,
        );
        // Document the observed contract value for this (consistent) fixture:
        assert.equal(canAct, true);
      },
    ],
    [
      "root↔depth-2 grandchild, reverse direction (A1 -> R1) also agrees",
      () => {
        assert.equal(categoriesMatch(node("A1"), node("R1")), seesInInbox("A1", "R1"));
        assert.equal(categoriesMatch(node("A1"), node("R1")), true);
      },
    ],
    [
      "unrelated branches do NOT match: A1 (under R1) vs C1 (under R2)",
      () => {
        assert.equal(categoriesMatch(node("A1"), node("C1")), false);
        assert.equal(seesInInbox("A1", "C1"), false);
      },
    ],
    [
      "unrelated roots do NOT match: R1 vs R2",
      () => {
        assert.equal(categoriesMatch(node("R1"), node("R2")), false);
        assert.equal(seesInInbox("R1", "R2"), false);
      },
    ],
    [
      "cross-branch subcategory↔service do NOT match: A vs C1, B1 vs A1",
      () => {
        assert.equal(categoriesMatch(node("A"), node("C1")), false);
        assert.equal(seesInInbox("A", "C1"), false);
        assert.equal(categoriesMatch(node("B1"), node("A1")), false);
        assert.equal(seesInInbox("B1", "A1"), false);
      },
    ],
  ];

  for (const [name, fn] of tests) {
    fn();
    console.log(`ok - ${name}`);
  }
  console.log("RESULT: PASS");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
