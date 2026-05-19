/**
 * Supplier Service — business logic and DTO mapping for imported suppliers.
 */

import * as repo from "./supplier-repository";

// ── Types ────────────────────────────────────────────────────────────

export interface SupplierListDto {
  id: string;
  displayName: string;
  slug: string;
  status: string;
  city: string | null;
  isVerified: boolean;
  source: string | null;
  categoryCount: number;
  heroImageUrl: string | null;
  rating: number | null;
  reviewCount: number;
  shortSummary: string | null;
}

export interface SupplierDetailDto {
  id: string;
  displayName: string;
  slug: string;
  status: string;
  sourceType: string;
  shortSummary: string | null;
  phonePublic: string | null;
  emailPublic: string | null;
  websiteUrl: string | null;
  city: string | null;
  companyCode: string | null;
  isVerified: boolean;
  externalSource: string | null;
  externalSourceUrl: string | null;
  heroImageUrl: string | null;
  galleryUrls: string[];
  rating: number | null;
  reviewCount: number;
  createdAt: Date;
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    depth: number;
    path: string;
    isPrimary: boolean;
    confidence: number;
  }>;
  snapshots: Array<{
    id: string;
    sourceName: string;
    sourceUrl: string | null;
    rawTitle: string | null;
    capturedAt: Date;
  }>;
}

// ── DTO mappers ──────────────────────────────────────────────────────

function toListDto(s: { id: string; displayName: string; slug: string; status: string; city: string | null; isVerified: boolean; externalSource: string | null; heroImageUrl?: string | null; rating?: number | null; reviewCount?: number; shortSummary?: string | null; _count?: { categoryLinks: number } }): SupplierListDto {
  return {
    id: s.id,
    displayName: s.displayName,
    slug: s.slug,
    status: s.status,
    city: s.city,
    isVerified: s.isVerified,
    source: s.externalSource,
    categoryCount: s._count?.categoryLinks ?? 0,
    heroImageUrl: s.heroImageUrl ?? null,
    rating: s.rating ?? null,
    reviewCount: s.reviewCount ?? 0,
    shortSummary: s.shortSummary ?? null,
  };
}

function toDetailDto(s: NonNullable<Awaited<ReturnType<typeof repo.findBySlug>>>): SupplierDetailDto {
  return {
    id: s.id,
    displayName: s.displayName,
    slug: s.slug,
    status: s.status,
    sourceType: s.sourceType,
    shortSummary: s.shortSummary,
    phonePublic: s.phonePublic,
    emailPublic: s.emailPublic,
    websiteUrl: s.websiteUrl,
    city: s.city,
    companyCode: s.companyCode,
    isVerified: s.isVerified,
    externalSource: s.externalSource,
    externalSourceUrl: s.externalSourceUrl,
    heroImageUrl: s.heroImageUrl ?? null,
    galleryUrls: s.galleryUrls ? JSON.parse(s.galleryUrls) : [],
    rating: s.rating ?? null,
    reviewCount: s.reviewCount ?? 0,
    createdAt: s.createdAt,
    categories: (s.categoryLinks || []).map((l) => ({
      ...l.category,
      isPrimary: l.isPrimary,
      confidence: l.confidenceScore,
    })),
    snapshots: (s.snapshots || []).map((snap) => ({
      id: snap.id,
      sourceName: snap.sourceName,
      sourceUrl: snap.sourceUrl,
      rawTitle: snap.rawTitle,
      capturedAt: snap.capturedAt,
    })),
  };
}

// ── Service methods ──────────────────────────────────────────────────

export async function list(opts: { limit?: number; offset?: number; city?: string; categorySlug?: string } = {}) {
  const { items, total } = await repo.findMany(opts);
  return { suppliers: items.map(toListDto), total };
}

export async function getBySlug(slug: string): Promise<SupplierDetailDto | null> {
  const supplier = await repo.findBySlug(slug);
  if (!supplier) return null;
  return toDetailDto(supplier);
}

export async function getByCategorySlug(categorySlug: string, opts: { limit?: number; offset?: number } = {}) {
  return repo.findByCategory(categorySlug, opts);
}

export async function getStats() {
  return repo.getSupplierStats();
}
