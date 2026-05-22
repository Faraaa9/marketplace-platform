/**
 * Supplier Repository — Prisma queries for imported providers.
 *
 * Imported providers now live in the unified `ProviderProfile` table.
 * Every query is scoped to `sourceType: "imported"` so registered
 * (self-created) providers never leak into the catalog.
 */

import { prisma } from "@/lib/prisma";

/** Base filter — only imported catalog providers belong here. */
const IMPORTED_WHERE = { sourceType: "imported" } as const;

const SUPPLIER_LIST_SELECT = {
  id: true,
  displayName: true,
  slug: true,
  status: true,
  location: true,
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
  description: true,
  shortSummary: true,
  phone: true,
  publicEmail: true,
  website: true,
  location: true,
  companyCode: true,
  isVerified: true,
  externalSource: true,
  externalSourceUrl: true,
  heroImageUrl: true,
  images: true,
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

export async function findMany({ limit = 50, offset = 0, city }: FindManyOptions = {}) {
  // categorySlug is intentionally ignored: ProviderProfile has no category
  // links yet (added in a later phase). Catalog filtering by category is
  // temporarily disabled.
  const where: Record<string, unknown> = { ...IMPORTED_WHERE };

  if (city) where.location = city;

  const [items, total] = await Promise.all([
    prisma.providerProfile.findMany({
      where,
      orderBy: { displayName: "asc" },
      skip: offset,
      take: limit,
      select: SUPPLIER_LIST_SELECT,
    }),
    prisma.providerProfile.count({ where }),
  ]);

  return { items, total };
}

export async function findBySlug(slug: string) {
  return prisma.providerProfile.findFirst({
    where: { ...IMPORTED_WHERE, slug },
    select: SUPPLIER_SELECT,
  });
}

/**
 * Category-based lookup is disabled until ProviderProfile gains category
 * links in a later phase. Returns an empty result so callers stay stable.
 */
export async function findByCategory(_categorySlug: string, _opts: { limit?: number; offset?: number } = {}) {
  return { items: [] as Array<Record<string, never>>, total: 0 };
}

export async function getSupplierStats() {
  const [total, unclaimed, withCity] = await Promise.all([
    prisma.providerProfile.count({ where: IMPORTED_WHERE }),
    prisma.providerProfile.count({ where: { ...IMPORTED_WHERE, status: "unclaimed" } }),
    prisma.providerProfile.count({ where: { ...IMPORTED_WHERE, location: { not: null } } }),
  ]);
  return { total, unclaimed, withCity, links: 0, snapshots: 0 };
}
