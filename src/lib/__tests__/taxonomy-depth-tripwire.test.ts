/**
 * TRIPWIRE — taxonomy depth-boundary guard for the eligibility matcher.
 *
 * The lead-unlock gate categoriesMatch() (src/lib/provider-eligibility.ts) is
 * correct ONLY while the service tree is ≤3 levels deep (root → subcategory →
 * service): it matches root↔descendant via rootId and subcategory↔service via a
 * single parentId hop, with NO general ancestor walk. A structural depth-3 node
 * would appear in a provider's inbox — expandToMatchSet is full-descent — yet be
 * invisible to the gate, silently re-opening the depth bug fixed 2026-06-13.
 *
 * HOW DEPTH IS COMPUTED — STRUCTURAL, not nominal. The check does NOT trust the
 * `level` label (parent/category/subcategory). It derives a parentId graph from
 * the flat file's positional path columns and WALKS it (maxDepthByParentWalk),
 * so a recycled label cannot hide a deeper chain.
 *
 * CAVEAT / FINDING (reported in chat): data/routing/taxonomy/taxonomy_flat.jsonl
 * has NO `parentId` column — only a fixed 3-slot positional path
 * (parent → category → subcategory). A structural depth-3 node is therefore
 * UNREPRESENTABLE in this file (no 4th slot), so the file walk is schema-capped
 * at depth 2 and can never itself reach depth-3. The genuine depth-3 risk lives
 * in the DB's generic parentId model (the importer fills it positionally today,
 * but a future importer or out-of-band write could deepen it). Guarding THAT is a
 * standing DB-side check — listed as an out-of-scope TODO. Part B below proves the
 * extracted walk DOES go RED on a depth-3 parentId graph, so the guard is sound
 * the moment it is fed data that can express the violation.
 *
 * Source of truth: the flat file is the artifact the importer
 * (scripts/import-paslaugurinka-taxonomy.js) loads into Category. PURE test —
 * no DB, runs in CI.
 *
 * Run:
 *   npx ts-node --transpile-only \
 *     --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' \
 *     src/lib/__tests__/taxonomy-depth-tripwire.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  MAX_SUPPORTED_DEPTH,
  flatRowsToTree,
  maxDepthByParentWalk,
  unknownLevels,
  unexpectedColumns,
  type FlatRow,
  type TreeNode,
} from "./taxonomy-depth";

const TAXONOMY_FILE = path.resolve(
  __dirname,
  "../../../data/routing/taxonomy/taxonomy_flat.jsonl",
);

function readFlatRows(): FlatRow[] {
  return readFileSync(TAXONOMY_FILE, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as FlatRow);
}

const tests: Array<[string, () => void]> = [
  // ── Part A: the REAL source file ──────────────────────────────────────────
  [
    "A1: taxonomy source file is present and non-empty (guard never passes vacuously)",
    () => {
      assert.ok(readFlatRows().length > 0, "taxonomy_flat.jsonl is empty or missing");
    },
  ],
  [
    "A2: no unknown level tier and no unexpected/new structural column",
    () => {
      const rows = readFlatRows();
      assert.deepEqual(
        unknownLevels(rows),
        [],
        "a new/4th level tier appeared — extend categoriesMatch before deepening the tree",
      );
      assert.deepEqual(
        unexpectedColumns(rows as Array<Record<string, unknown>>),
        [],
        "a new structural column appeared — the positional path reader would miss it",
      );
    },
  ],
  [
    `A3: STRUCTURAL depth (parentId walk of the path graph) === ${MAX_SUPPORTED_DEPTH}, never deeper`,
    () => {
      const tree = flatRowsToTree(readFlatRows());
      const depth = maxDepthByParentWalk(tree);
      assert.ok(
        depth <= MAX_SUPPORTED_DEPTH,
        `Taxonomy reached structural depth ${depth} > ${MAX_SUPPORTED_DEPTH}: expandToMatchSet ` +
          `would surface leads categoriesMatch cannot match — re-opening the 2026-06-13 depth bug.`,
      );
      // Reaches EXACTLY the supported depth: confirms the walk actually resolves
      // the deepest chain (not trivially 0 from dangling parents).
      assert.equal(depth, MAX_SUPPORTED_DEPTH, "deepest chain did not resolve to depth 2");
    },
  ],

  // ── Part B: TEST-OF-THE-TEST — prove the guard goes RED, not just green. ────
  // Fixtures are fed straight to the extracted primitives. Because the flat file
  // cannot encode depth-3, these use synthetic {id,parentId} graphs to exercise
  // the structural walk on data that DOES express the violation.
  [
    "B1: clean 3-level set → structural depth 2 → guard PASSES (depth <= MAX)",
    () => {
      const clean: TreeNode[] = [
        { id: "R", parentId: null }, // depth 0
        { id: "A", parentId: "R" }, // depth 1
        { id: "A1", parentId: "A" }, // depth 2
      ];
      assert.equal(maxDepthByParentWalk(clean), 2);
      assert.ok(maxDepthByParentWalk(clean) <= MAX_SUPPORTED_DEPTH, "clean set must pass");
    },
  ],
  [
    "B2: row with an unknown / 4th-level label → guard FAILS (unknownLevels non-empty)",
    () => {
      const rows = [
        { level: "parent" },
        { level: "category" },
        { level: "subcategory" },
        { level: "subsubcategory" }, // a new, deeper tier
      ];
      const bad = unknownLevels(rows);
      assert.deepEqual(bad, ["subsubcategory"]);
      assert.ok(bad.length > 0, "unknown level must trip the guard");
    },
  ],
  [
    "B3: subcategory whose parent is a subcategory (recycled label, structural depth-3) → guard FAILS",
    () => {
      // All four carry KNOWN labels — a nominal (label-only) check would PASS —
      // but the parentId chain is 4 deep, so the structural walk reaches depth 3.
      const recycled: TreeNode[] = [
        { id: "R", parentId: null }, // depth 0  (level "parent")
        { id: "A", parentId: "R" }, // depth 1  (level "category")
        { id: "B", parentId: "A" }, // depth 2  (level "subcategory")
        { id: "C", parentId: "B" }, // depth 3  (level "subcategory" — recycled!)
      ];
      // The blind-spot proof: nominal check sees only known labels and would pass…
      assert.deepEqual(
        unknownLevels([
          { level: "parent" },
          { level: "category" },
          { level: "subcategory" },
          { level: "subcategory" },
        ]),
        [],
        "all labels are known — a nominal check would NOT catch this",
      );
      // …but the STRUCTURAL walk catches the depth-3 node and trips the guard.
      const depth = maxDepthByParentWalk(recycled);
      assert.equal(depth, 3, "structural walk must reach depth 3");
      assert.ok(depth > MAX_SUPPORTED_DEPTH, "structural depth-3 must trip the guard");
    },
  ],
  [
    "B4: parentId cycle is handled (returns Infinity > MAX, trips the guard, no hang)",
    () => {
      const cyclic: TreeNode[] = [
        { id: "X", parentId: "Y" },
        { id: "Y", parentId: "X" },
      ];
      const depth = maxDepthByParentWalk(cyclic);
      assert.ok(depth > MAX_SUPPORTED_DEPTH, "a cycle must trip the guard, not hang");
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
