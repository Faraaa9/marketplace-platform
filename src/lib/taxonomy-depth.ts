/**
 * Structural depth of the curated service tree — the SHARED source of truth for
 * "how deep is the taxonomy", used by BOTH the offline tripwire test
 * (src/lib/__tests__/taxonomy-depth-tripwire.test.ts) and the live DB guard
 * (scripts/verify-taxonomy-depth-db.ts).
 *
 * Depth is computed by WALKING the parentId chain (0-indexed: a root is 0), never
 * from a level/label — so a node structurally deeper than its label suggests is
 * still caught. This mirrors expandToMatchSet's full descent. The eligibility
 * matcher categoriesMatch (src/lib/provider-eligibility.ts) only supports a single
 * parent hop, so depth MUST stay ≤ MAX_SUPPORTED_DEPTH; otherwise the inbox
 * (expandToMatchSet, full descent) and the unlock/respond gate (categoriesMatch)
 * diverge — the depth bug fixed 2026-06-13.
 *
 * Pure: no DB, no imports. The DB-walking guard loads Category rows elsewhere and
 * calls findNodesExceedingDepth() here.
 */

// Max 0-indexed structural depth categoriesMatch can faithfully mirror against
// expandToMatchSet. Raise ONLY together with categoriesMatch (a general ancestor
// walk / reuse of expandToMatchSet) when the taxonomy legitimately grows a level.
export const MAX_SUPPORTED_DEPTH = 2;

export interface TreeNode {
  id: string;
  parentId: string | null;
}

export interface DepthViolation {
  id: string;
  /** 0-indexed structural depth; Infinity when the parentId chain is cyclic. */
  depth: number;
  /** node id → parent → … → root (or the repeated id, when cyclic), for diagnostics. */
  chain: string[];
}

/**
 * Walk one node's parentId chain. Cycle-safe: a cycle yields depth = Infinity
 * (with the offending chain) instead of looping forever.
 */
function walk(start: TreeNode, byId: Map<string, TreeNode>): { depth: number; chain: string[] } {
  const chain: string[] = [start.id];
  const seen = new Set<string>([start.id]);
  let cur: TreeNode | undefined = start;
  while (cur && cur.parentId != null) {
    const parent = byId.get(cur.parentId);
    if (!parent) break; // dangling parent — chain ends here
    chain.push(parent.id);
    if (seen.has(parent.id)) return { depth: Number.POSITIVE_INFINITY, chain };
    seen.add(parent.id);
    cur = parent;
  }
  return { depth: chain.length - 1, chain };
}

/** Deepest structural depth across all nodes (Infinity if any chain is cyclic). */
export function maxDepthByParentWalk(nodes: TreeNode[]): number {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let max = 0;
  for (const n of nodes) {
    const { depth } = walk(n, byId);
    if (depth > max) max = depth;
  }
  return max;
}

/**
 * Every node whose structural depth exceeds `limit`, each with its parent chain —
 * so a guard can fail LOUDLY with the offending ids instead of a bare count.
 */
export function findNodesExceedingDepth(
  nodes: TreeNode[],
  limit: number = MAX_SUPPORTED_DEPTH,
): DepthViolation[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const violations: DepthViolation[] = [];
  for (const n of nodes) {
    const { depth, chain } = walk(n, byId);
    if (depth > limit) violations.push({ id: n.id, depth, chain });
  }
  return violations;
}
