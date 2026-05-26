import { prisma } from "@/lib/prisma";

export interface ServiceCategoryItem {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  rootId?: string | null;
  depth?: number;
  path?: string;
  childCount?: number;
  children?: ServiceCategoryItem[];
}

export interface ServiceCategoryGroup {
  root: ServiceCategoryItem;
  categories: ServiceCategoryItem[];
}

const TAXONOMY_SOURCE = "paslaugurinka-taxonomy";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  rootId: string | null;
  depth: number;
  path: string;
  sortOrder: number;
};

async function loadServiceCategoryRows(): Promise<CategoryRow[]> {
  const preferred = await prisma.category.findMany({
    where: { pageType: "service", externalSource: TAXONOMY_SOURCE, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      rootId: true,
      depth: true,
      path: true,
      sortOrder: true,
    },
    orderBy: [{ depth: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  if (preferred.length > 0) return preferred;

  return prisma.category.findMany({
    where: { pageType: "service", isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      rootId: true,
      depth: true,
      path: true,
      sortOrder: true,
    },
    orderBy: [{ depth: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
}

// ── In-memory cache for the service taxonomy ──────────────────────────────
// Categories change only when an admin runs the taxonomy import script. Without
// caching this fan-out query fires on every page render (home, /meistrai,
// /uzklausos, sitemap, /api/service-categories), which on production traffic
// dominated the DB seq-scan stats. 5-minute TTL keeps invalidation simple
// without a pub/sub layer, and the import script can call
// invalidateServiceCategoryGroups() for immediate refresh.
const CACHE_TTL_MS = 5 * 60_000;
let cachedGroups: { value: ServiceCategoryGroup[]; expiresAt: number } | null = null;

export function invalidateServiceCategoryGroups(): void {
  cachedGroups = null;
}

/**
 * The service taxonomy that drives request/provider flows. Newer data is a
 * 3-level tree: root -> subcategory -> concrete service. The legacy 2-level
 * shape is still accepted as a fallback, so older screens do not crash while
 * the UI is being migrated.
 */
export async function getServiceCategoryGroups(): Promise<ServiceCategoryGroup[]> {
  if (cachedGroups && cachedGroups.expiresAt > Date.now()) {
    return cachedGroups.value;
  }
  const rows = await loadServiceCategoryRows();
  const byParent = new Map<string | null, CategoryRow[]>();
  for (const row of rows) {
    const key = row.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(row);
    byParent.set(key, list);
  }

  function toItem(row: CategoryRow): ServiceCategoryItem {
    const children = (byParent.get(row.id) ?? []).map(toItem);
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      parentId: row.parentId,
      rootId: row.rootId,
      depth: row.depth,
      path: row.path,
      childCount: children.length,
      children,
    };
  }

  const roots = rows
    .filter((row) => row.depth === 0 || row.parentId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "lt"));

  const value: ServiceCategoryGroup[] = roots.map((root) => ({
    root: toItem(root),
    categories: (byParent.get(root.id) ?? []).map(toItem),
  }));
  cachedGroups = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
}

/**
 * A flat `id -> name` and `slug -> name` lookup for resolving a stored
 * category reference to a display label. Includes the roots so that
 * legacy root-level references (the 3 coarse mapped codes) also resolve.
 */
export async function getServiceCategoryNameMap(): Promise<Map<string, string>> {
  const groups = await getServiceCategoryGroups();
  const map = new Map<string, string>();
  function add(item: ServiceCategoryItem) {
    map.set(item.id, item.name);
    map.set(item.slug, item.name);
    for (const child of item.children ?? []) add(child);
  }
  for (const g of groups) {
    add(g.root);
  }
  return map;
}

export async function getFlatServiceCategories(): Promise<ServiceCategoryItem[]> {
  const groups = await getServiceCategoryGroups();
  const out: ServiceCategoryItem[] = [];
  function walk(item: ServiceCategoryItem) {
    out.push(item);
    for (const child of item.children ?? []) walk(child);
  }
  for (const group of groups) walk(group.root);
  return out;
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
