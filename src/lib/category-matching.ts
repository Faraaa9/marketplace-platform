import { prisma } from "@/lib/prisma";

/**
 * Expand a set of curated category ids into the full set of category ids
 * that match them tree-aware. The service tree can be any depth, so for each
 * input id the match set adds the id itself, all ancestors, and all
 * descendants.
 *
 * Symmetric — works whether `ids` is a provider's categories (-> the request
 * categories they can serve) or a request's category (-> the provider
 * categories that serve it).
 */
export async function expandToMatchSet(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];

  const rows = await prisma.category.findMany({
    where: { pageType: "service", isActive: true },
    select: { id: true, parentId: true },
  });

  const byId = new Map(rows.map((row) => [row.id, row]));
  const childrenByParent = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.parentId) continue;
    const children = childrenByParent.get(row.parentId) ?? [];
    children.push(row.id);
    childrenByParent.set(row.parentId, children);
  }

  const result = new Set<string>();

  function addAncestors(id: string) {
    let current = byId.get(id);
    while (current) {
      result.add(current.id);
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
  }

  function addDescendants(id: string) {
    for (const childId of childrenByParent.get(id) ?? []) {
      result.add(childId);
      addDescendants(childId);
    }
  }

  for (const id of ids) {
    if (!byId.has(id)) {
      result.add(id);
      continue;
    }
    addAncestors(id);
    addDescendants(id);
  }

  return [...result];
}
