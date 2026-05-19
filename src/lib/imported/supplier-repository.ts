/**
 * Supplier Repository — Prisma queries for imported supplier records.
 */

import { prisma } from "@/lib/prisma";

const SUPPLIER_LIST_SELECT = {
  id: true,
  displayName: true,
  slug: true,
  status: true,
  city: true,
  isVerified: true,
  externalSource: true,
  heroImageUrl: true,
  rating: true,
  reviewCount: true,
  shortSummary: true,
} as const;

const SUPPLIER_SELECT = {
  id: true,
  displayName: true,
  slug: true,
  status: true,
  sourceType: true,
  shortSummary: true,
  phonePublic: true,
  emailPublic: true,
  websiteUrl: true,
  city: true,
  companyCode: true,
  isVerified: true,
  externalSource: true,
  externalSourceUrl: true,
  heroImageUrl: true,
  galleryUrls: true,
  rating: true,
  reviewCount: true,
  createdAt: true,
} as const;

interface FindManyOptions {
  limit?: number;
  offset?: number;
  city?: string;
  categorySlug?: string;
}

export async function findMany({ limit = 50, offset = 0, city, categorySlug }: FindManyOptions = {}) {
  const where: Record<string, unknown> = {};

  if (city) where.city = city;
  if (categorySlug) {
    const subtreeIds = await getSubtreeCategoryIds(categorySlug);
    if (subtreeIds.length > 0) {
      where.categoryLinks = { some: { categoryId: { in: subtreeIds } } };
    } else {
      where.categoryLinks = { some: { categoryId: "nonexistent" } };
    }
  }

  const [items, total] = await Promise.all([
    prisma.supplierRecord.findMany({
      where,
      orderBy: { displayName: "asc" },
      skip: offset,
      take: limit,
      select: {
        ...SUPPLIER_LIST_SELECT,
        _count: { select: { categoryLinks: true } },
      },
    }),
    prisma.supplierRecord.count({ where }),
  ]);

  return { items, total };
}

export async function findBySlug(slug: string) {
  return prisma.supplierRecord.findUnique({
    where: { slug },
    select: {
      ...SUPPLIER_SELECT,
      categoryLinks: {
        select: {
          isPrimary: true,
          confidenceScore: true,
          category: { select: { id: true, name: true, slug: true, depth: true, path: true } },
        },
        orderBy: { isPrimary: "desc" },
      },
      snapshots: {
        select: { id: true, sourceName: true, sourceUrl: true, rawTitle: true, capturedAt: true },
        orderBy: { capturedAt: "desc" },
        take: 5,
      },
    },
  });
}

export async function findByCategory(categorySlug: string, { limit = 50, offset = 0 } = {}) {
  // Resolve subtree IDs for the category
  const subtreeIds = await getSubtreeCategoryIds(categorySlug);

  const linkWhere = subtreeIds.length > 0
    ? { categoryId: { in: subtreeIds } }
    : { category: { slug: "nonexistent" } };

  const [items, total] = await Promise.all([
    prisma.supplierCategoryLink.findMany({
      where: linkWhere,
      skip: offset,
      take: limit,
      select: {
        isPrimary: true,
        supplier: { select: SUPPLIER_LIST_SELECT },
      },
    }),
    prisma.supplierCategoryLink.count({ where: linkWhere }),
  ]);

  return {
    items: items.map((l) => ({ ...l.supplier, isPrimary: l.isPrimary })),
    total,
  };
}

/** Resolve a category slug to all subtree category IDs (self + all descendants). */
async function getSubtreeCategoryIds(slug: string): Promise<string[]> {
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { id: true, path: true },
  });
  if (!category) return [];

  const descendants = await prisma.category.findMany({
    where: { path: { startsWith: category.path + "/" } },
    select: { id: true },
  });

  return [category.id, ...descendants.map((c) => c.id)];
}

export async function getSupplierStats() {
  const [total, unclaimed, withCity, links, snapshots] = await Promise.all([
    prisma.supplierRecord.count(),
    prisma.supplierRecord.count({ where: { status: "unclaimed" } }),
    prisma.supplierRecord.count({ where: { city: { not: null } } }),
    prisma.supplierCategoryLink.count(),
    prisma.supplierSourceSnapshot.count(),
  ]);
  return { total, unclaimed, withCity, links, snapshots };
}
