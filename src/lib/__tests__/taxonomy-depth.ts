/**
 * Test-support helpers for the taxonomy depth tripwire.
 *
 * The STRUCTURAL depth walk (maxDepthByParentWalk / findNodesExceedingDepth),
 * TreeNode and MAX_SUPPORTED_DEPTH now live in the PRODUCTION module
 * src/lib/taxonomy-depth.ts (shared with the live DB guard,
 * scripts/verify-taxonomy-depth-db.ts). They are re-exported here so the tripwire
 * test's imports stay unchanged. The flat-file-specific helpers below
 * (positional-path parsing, level/column checks) remain test-only — they describe
 * the shape of data/routing/taxonomy/taxonomy_flat.jsonl, not production logic.
 *
 * PURE — no DB, no production-runtime imports (the prod module it pulls from is
 * itself pure).
 */
import type { TreeNode } from "../taxonomy-depth";

export {
  MAX_SUPPORTED_DEPTH,
  maxDepthByParentWalk,
  findNodesExceedingDepth,
} from "../taxonomy-depth";
export type { TreeNode, DepthViolation } from "../taxonomy-depth";

// The importer's level tiers (scripts/import-paslaugurinka-taxonomy.js):
// parent=0, category=1, subcategory=2.
export const KNOWN_LEVELS = new Set(["parent", "category", "subcategory"]);

// The flat file's complete column set. A NEW structural column (e.g. a 4th path
// slot "subsubcategory") would slip past the positional path reader below, so we
// also assert the column set never grows.
export const EXPECTED_COLUMNS = new Set([
  "parent",
  "category",
  "subcategory",
  "level",
  "canonical_name",
  "source",
]);

export interface FlatRow {
  parent: string | null;
  category: string | null;
  subcategory: string | null;
  level: string;
  [key: string]: unknown;
}

/** The positional path of a flat row, deepest-last, with nulls dropped. */
function pathOf(row: FlatRow): string[] {
  return [row.parent, row.category, row.subcategory].filter(
    (x): x is string => x != null && x !== "",
  );
}

/**
 * Derive a parentId graph from the flat file's positional path columns: a row's
 * identity is its full path, its parent is that path with the deepest component
 * dropped. This is the ONLY parent linkage the flat file expresses (it has no
 * `parentId` column) — so the walk is structural but bounded by the 3-slot path
 * schema (it can never yield depth > 2). See the tripwire header's caveat.
 */
export function flatRowsToTree(rows: FlatRow[]): TreeNode[] {
  return rows.map((row) => {
    const path = pathOf(row);
    return {
      id: path.join(" > "),
      parentId: path.length > 1 ? path.slice(0, -1).join(" > ") : null,
    };
  });
}

/** Level labels NOT in the known tier set — a new/4th tier trips this. */
export function unknownLevels(rows: Array<{ level: string }>): string[] {
  const out = new Set<string>();
  for (const r of rows) {
    if (!KNOWN_LEVELS.has(r.level)) out.add(String(r.level));
  }
  return [...out];
}

/** JSON columns outside the known set — a new structural column trips this. */
export function unexpectedColumns(rows: Array<Record<string, unknown>>): string[] {
  const out = new Set<string>();
  for (const r of rows) {
    for (const k of Object.keys(r)) if (!EXPECTED_COLUMNS.has(k)) out.add(k);
  }
  return [...out];
}
