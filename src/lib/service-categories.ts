import { prisma } from "@/lib/prisma";
import { cacheLife, cacheTag } from "next/cache";

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

export const SERVICE_TAXONOMY_SOURCE = "paslaugurinka-taxonomy";
export const SERVICE_CATEGORY_WHERE = {
  pageType: "service",
  externalSource: SERVICE_TAXONOMY_SOURCE,
  isActive: true,
} as const;

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
  return prisma.category.findMany({
    where: SERVICE_CATEGORY_WHERE,
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
  "use cache";
  cacheLife({ revalidate: 300 });
  cacheTag("categories");

  if (cachedGroups && cachedGroups.expiresAt > Date.now()) {
    return cachedGroups.value;
  }

  // Categories rarely change — 5-minute cache window is plenty.
  // No tag yet; consumers can tag at their own level.
  const rows = await loadServiceCategoryRows();
  const byParent = new Map<string | null, CategoryRow[]>();
  for (const row of rows) {
    const key = row.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(row);
    byParent.set(key, list);
  }

  // Only the fields the UI (GroupedCategoryPicker) actually reads are kept on
  // the serialized node: id, name, slug, childCount, children. parentId/rootId/
  // depth/path are intentionally dropped — they are never read off the grouped
  // output (the matching/suggestion libs work off raw rows), and on a 4k-node
  // tree they bloated the RSC payload streamed to the client (the /uzklausos
  // board shipped ~2.5 MB of HTML, tripping Semrush "Large HTML page size").
  function toItem(row: CategoryRow): ServiceCategoryItem {
    const children = (byParent.get(row.id) ?? []).map(toItem);
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      childCount: children.length,
      children,
    };
  }

  const roots = rows
    .filter((row) => row.depth === 0 || row.parentId === null)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "lt"));

  // `categories` reuses the very same node instances as `root.children` (not a
  // second `toItem` pass), so the tree is built — and serialized — once.
  const value: ServiceCategoryGroup[] = roots.map((root) => {
    const item = toItem(root);
    return { root: item, categories: item.children ?? [] };
  });
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

export async function getCanonicalServiceCategoryRowsById(ids: string[]): Promise<Array<{ id: string; slug: string }>> {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  if (uniqueIds.length === 0) return [];

  return prisma.category.findMany({
    where: { ...SERVICE_CATEGORY_WHERE, id: { in: uniqueIds } },
    select: { id: true, slug: true },
  });
}

export async function filterCanonicalServiceCategoryIds(ids: string[]): Promise<string[]> {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  if (uniqueIds.length === 0) return [];

  const rows = await getCanonicalServiceCategoryRowsById(uniqueIds);
  const valid = new Set(rows.map((row) => row.id));
  return uniqueIds.filter((id) => valid.has(id));
}

/**
 * Resolve a `?category=` URL param to a canonical service Category id.
 * Only the live paslaugurinka taxonomy is accepted; legacy/imported trees and
 * aliases are intentionally excluded so request/search flows cannot drift.
 */
export async function resolveCategoryParam(param: string): Promise<string | null> {
  if (!param) return null;

  const bySlug = await prisma.category.findUnique({
    where: { slug: param },
    select: { id: true, pageType: true, externalSource: true, isActive: true },
  });
  if (
    bySlug?.pageType === SERVICE_CATEGORY_WHERE.pageType &&
    bySlug.externalSource === SERVICE_CATEGORY_WHERE.externalSource &&
    bySlug.isActive === SERVICE_CATEGORY_WHERE.isActive
  ) {
    return bySlug.id;
  }

  return null;
}
