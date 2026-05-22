import { prisma } from "@/lib/prisma";

export interface ServiceCategoryItem {
  id: string;
  name: string;
  slug: string;
}

export interface ServiceCategoryGroup {
  root: ServiceCategoryItem;
  categories: ServiceCategoryItem[];
}

/**
 * The curated "service" taxonomy that drives the request flow: the 9 roots,
 * each with its depth-1 categories (`pageType="service"`). Roots are group
 * headers — users pick a depth-1 category (1 per request, up to 6 per
 * provider). Ordered by `sortOrder`.
 */
export async function getServiceCategoryGroups(): Promise<ServiceCategoryGroup[]> {
  const categories = await prisma.category.findMany({
    where: { pageType: "service", isActive: true },
    select: { id: true, name: true, slug: true, rootId: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });

  const rootIds = [
    ...new Set(categories.map((c) => c.rootId).filter((id): id is string => !!id)),
  ];
  const roots = await prisma.category.findMany({
    where: { id: { in: rootIds } },
    select: { id: true, name: true, slug: true, sortOrder: true },
  });
  roots.sort((a, b) => a.sortOrder - b.sortOrder);

  return roots.map((root) => ({
    root: { id: root.id, name: root.name, slug: root.slug },
    categories: categories
      .filter((c) => c.rootId === root.id)
      .map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
  }));
}

/**
 * A flat `id -> name` and `slug -> name` lookup for resolving a stored
 * category reference to a display label. Includes the roots so that
 * legacy root-level references (the 3 coarse mapped codes) also resolve.
 */
export async function getServiceCategoryNameMap(): Promise<Map<string, string>> {
  const groups = await getServiceCategoryGroups();
  const map = new Map<string, string>();
  for (const g of groups) {
    map.set(g.root.id, g.root.name);
    map.set(g.root.slug, g.root.name);
    for (const c of g.categories) {
      map.set(c.id, c.name);
      map.set(c.slug, c.name);
    }
  }
  return map;
}

/**
 * Resolve a `?category=` URL param to a curated Category id. Accepts a curated
 * category/root slug, or a legacy SERVICE_CATEGORIES code via a CategoryAlias
 * (so old indexed `?category=<code>` URLs keep resolving). Returns the
 * category id, or null if unresolvable.
 */
export async function resolveCategoryParam(param: string): Promise<string | null> {
  if (!param) return null;

  const bySlug = await prisma.category.findUnique({
    where: { slug: param },
    select: { id: true },
  });
  if (bySlug) return bySlug.id;

  const alias = await prisma.categoryAlias.findFirst({
    where: { aliasSlug: param },
    select: { categoryId: true },
  });
  return alias?.categoryId ?? null;
}
