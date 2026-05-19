/**
 * Category Repository — Prisma queries for imported taxonomy.
 * Uses the shared Prisma singleton from @/lib/prisma.
 */

import { prisma } from "@/lib/prisma";

const CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  parentId: true,
  rootId: true,
  depth: true,
  path: true,
  sortOrder: true,
  isActive: true,
  pageType: true,
} as const;

export async function findRoots() {
  return prisma.category.findMany({
    where: { depth: 0, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      ...CATEGORY_SELECT,
      _count: { select: { children: true } },
    },
  });
}

export async function findBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    select: {
      ...CATEGORY_SELECT,
      parent: { select: { id: true, name: true, slug: true } },
      root: { select: { id: true, name: true, slug: true } },
      aliases: { select: { id: true, aliasName: true, aliasSlug: true, source: true } },
      _count: { select: { children: true } },
    },
  });
}

export async function findById(id: string) {
  return prisma.category.findUnique({
    where: { id },
    select: {
      ...CATEGORY_SELECT,
      parent: { select: { id: true, name: true, slug: true } },
      root: { select: { id: true, name: true, slug: true } },
      aliases: { select: { id: true, aliasName: true, aliasSlug: true, source: true } },
      _count: { select: { children: true } },
    },
  });
}

export async function findChildren(parentId: string) {
  return prisma.category.findMany({
    where: { parentId, isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      ...CATEGORY_SELECT,
      _count: { select: { children: true } },
    },
  });
}

export async function findSubtree(categoryId: string) {
  return prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      ...CATEGORY_SELECT,
      children: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          ...CATEGORY_SELECT,
          children: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            select: CATEGORY_SELECT,
          },
        },
      },
    },
  });
}

export async function resolveAlias(aliasSlug: string) {
  const alias = await prisma.categoryAlias.findFirst({
    where: { aliasSlug },
    select: {
      category: { select: { slug: true } },
    },
  });
  return alias ? alias.category.slug : null;
}

export async function getCategoryStats() {
  const [total, roots, aliases] = await Promise.all([
    prisma.category.count({ where: { isActive: true } }),
    prisma.category.count({ where: { depth: 0, isActive: true } }),
    prisma.categoryAlias.count(),
  ]);
  return { total, roots, aliases };
}

/**
 * Get supplier count for a category subtree (self + all descendants).
 * Counts distinct suppliers linked to any category in the subtree.
 */
export async function getSubtreeSupplierCount(categoryId: string, categoryPath: string): Promise<number> {
  // Get all category IDs in subtree (self + descendants)
  const descendants = await prisma.category.findMany({
    where: { path: { startsWith: categoryPath + "/" } },
    select: { id: true },
  });
  const subtreeIds = [categoryId, ...descendants.map((c) => c.id)];

  // Count distinct suppliers linked to any of these categories
  const count = await prisma.supplierCategoryLink.groupBy({
    by: ["supplierRecordId"],
    where: { categoryId: { in: subtreeIds } },
  });

  return count.length;
}

/**
 * Get supplier counts for all root categories in a single batch.
 * Returns a map of categoryId → supplierCount.
 *
 * Uses path-based subtree resolution (same as getSubtreeCategoryIds)
 * because root categories have rootId=null in the schema.
 */
export async function getRootSupplierCounts(): Promise<Map<string, number>> {
  const roots = await prisma.category.findMany({
    where: { depth: 0, isActive: true },
    select: { id: true, path: true },
  });

  // Get all active categories with their paths
  const allCategories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, path: true },
  });

  // Build map: rootId → all category IDs in that subtree (using path prefix)
  const rootSubtreeMap = new Map<string, string[]>();
  for (const root of roots) {
    const subtreeIds = [root.id];
    const prefix = root.path + "/";
    for (const cat of allCategories) {
      if (cat.path.startsWith(prefix)) {
        subtreeIds.push(cat.id);
      }
    }
    rootSubtreeMap.set(root.id, subtreeIds);
  }

  // Get all supplier-category links
  const links = await prisma.supplierCategoryLink.findMany({
    select: { supplierRecordId: true, categoryId: true },
  });

  // Build reverse map: categoryId → rootId
  const categoryToRoot = new Map<string, string>();
  for (const [rootId, catIds] of rootSubtreeMap) {
    for (const catId of catIds) {
      categoryToRoot.set(catId, rootId);
    }
  }

  // Count distinct suppliers per root
  const rootSupplierSets = new Map<string, Set<string>>();
  for (const root of roots) {
    rootSupplierSets.set(root.id, new Set());
  }
  for (const link of links) {
    const rootId = categoryToRoot.get(link.categoryId);
    if (rootId) {
      rootSupplierSets.get(rootId)!.add(link.supplierRecordId);
    }
  }

  const result = new Map<string, number>();
  for (const [rootId, supplierSet] of rootSupplierSets) {
    result.set(rootId, supplierSet.size);
  }
  return result;
}
