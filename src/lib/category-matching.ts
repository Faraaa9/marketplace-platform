import { prisma } from "@/lib/prisma";

/**
 * Expand a set of curated category ids into the full set of category ids
 * that match them tree-aware. The curated service tree is 2 levels deep, so
 * for each input id the match set adds: the id itself, its root (if the id
 * is a depth-1 category), and its direct children (if the id is a root).
 *
 * Symmetric — works whether `ids` is a provider's categories (-> the request
 * categories they can serve) or a request's category (-> the provider
 * categories that serve it).
 */
export async function expandToMatchSet(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];

  const cats = await prisma.category.findMany({
    where: { id: { in: ids } },
    select: { id: true, rootId: true },
  });

  const result = new Set<string>();
  const rootIds: string[] = [];
  for (const c of cats) {
    result.add(c.id);
    if (c.rootId) result.add(c.rootId);
    else rootIds.push(c.id);
  }

  if (rootIds.length > 0) {
    const children = await prisma.category.findMany({
      where: { rootId: { in: rootIds } },
      select: { id: true },
    });
    for (const ch of children) result.add(ch.id);
  }

  return [...result];
}
