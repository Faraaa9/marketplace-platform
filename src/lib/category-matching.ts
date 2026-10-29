import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SERVICE_CATEGORY_WHERE } from "@/lib/service-categories";

/**
 * Prisma relation filter selecting only categories that are currently ACTIVE:
 * a free/base category (`expiresAt` null) or a paid unlock that hasn't expired.
 *
 * Apply on the `categories` relation everywhere provider categories drive lead
 * MATCHING, NOTIFICATIONS, or public VISIBILITY — so an expired paid category
 * stops surfacing the provider. Do NOT apply in the profile editor, which must
 * show every category (incl. expired) so the provider can renew/manage them.
 */
export function activeCategoryFilter(): Prisma.ProviderProfileCategoryWhereInput {
  return { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] };
}

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
// ~2k rows that change only on a taxonomy import; reloading them on every
// lead-feed render and notification was the hottest category query. Same
// 5-minute TTL as the service-categories cache.
const TAXONOMY_TTL_MS = 5 * 60_000;
let cachedTaxonomy: { rows: { id: string; parentId: string | null }[]; expiresAt: number } | null = null;

async function loadTaxonomy() {
  if (cachedTaxonomy && cachedTaxonomy.expiresAt > Date.now()) return cachedTaxonomy.rows;
  const rows = await prisma.category.findMany({
    where: SERVICE_CATEGORY_WHERE,
    select: { id: true, parentId: true },
  });
  cachedTaxonomy = { rows, expiresAt: Date.now() + TAXONOMY_TTL_MS };
  return rows;
}

/**
 * A request matches when ANY of its categories (primary or the up-to-2 extras)
 * is in the match set — the same rule the new-request notifier uses.
 */
export function requestCategoryWhere(matchSet: string[]): Prisma.ServiceRequestWhereInput {
  return {
    OR: [{ categoryId: { in: matchSet } }, { categories: { some: { categoryId: { in: matchSet } } } }],
  };
}

export function requestInMatchSet(
  request: { categoryId: string | null; categories: { categoryId: string }[] },
  matchSet: Set<string>,
): boolean {
  if (request.categoryId && matchSet.has(request.categoryId)) return true;
  return request.categories.some((c) => matchSet.has(c.categoryId));
}

export async function expandToMatchSet(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];

  const rows = await loadTaxonomy();

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
