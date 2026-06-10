/**
 * Supplier Service — business logic and DTO mapping for imported providers.
 *
 * Imported providers are read from the unified `ProviderProfile` table
 * (filtered to `sourceType: "imported"` in the repository layer).
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
  description: string | null;
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

type ListRow = {
  id: string;
  displayName: string | null;
  slug: string | null;
  status: string;
  location: string | null;
  isVerified: boolean;
  externalSource: string | null;
  heroImageUrl: string | null;
  rating: number | null;
  reviewCount: number;
  shortSummary: string | null;
};

function toListDto(s: ListRow): SupplierListDto {
  return {
    id: s.id,
    displayName: s.displayName ?? "",
    slug: s.slug ?? "",
    status: s.status,
    city: s.location,
    isVerified: s.isVerified,
    source: s.externalSource,
    // Category links are added in a later phase — none exist yet.
    categoryCount: 0,
    heroImageUrl: s.heroImageUrl,
    rating: s.rating,
    reviewCount: s.reviewCount,
    shortSummary: s.shortSummary,
  };
}

function toDetailDto(s: NonNullable<Awaited<ReturnType<typeof repo.findBySlug>>>): SupplierDetailDto {
  return {
    id: s.id,
    displayName: s.displayName ?? "",
    slug: s.slug ?? "",
    status: s.status,
    sourceType: s.sourceType,
    description: s.description,
    shortSummary: s.shortSummary,
    phonePublic: s.phone,
    emailPublic: s.publicEmail,
    websiteUrl: s.website,
    city: s.location,
    companyCode: s.companyCode,
    isVerified: s.isVerified,
    externalSource: s.externalSource,
    externalSourceUrl: s.externalSourceUrl,
    heroImageUrl: s.heroImageUrl,
    // `images` is already a String[] on ProviderProfile — no JSON parsing.
    galleryUrls: s.images ?? [],
    rating: s.rating,
    reviewCount: s.reviewCount,
    createdAt: s.createdAt,
    // Category links and source snapshots are added in a later phase.
    categories: [],
    snapshots: [],
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

/**
 * Category-based listing is disabled until ProviderProfile gains category
 * links in a later phase. Returns an empty result so callers stay stable.
 */
 
export async function getByCategorySlug(_categorySlug: string, _opts: { limit?: number; offset?: number } = {}) {
  return { items: [] as SupplierListDto[], total: 0 };
}

export async function getStats() {
  return repo.getSupplierStats();
}
