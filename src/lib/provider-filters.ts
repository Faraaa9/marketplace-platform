import { LITHUANIAN_CITIES } from "@/lib/constants";

export interface ProviderCategory {
  id: string;
  name: string;
  slug: string;
}

export interface ProviderCardData {
  id: string;
  slug: string | null;
  name: string | null;
  profileImage: string | null;
  coverImage: string | null;
  description: string | null;
  categories: ProviderCategory[];
  location: string | null;
  isVerified: boolean;
  isPremium: boolean;
  isYoungTalent: boolean;
  isGoat: boolean;
  badge: string | null;
  responseCount: number;
  acceptedCount: number;
  isRecentlyActive: boolean;
  presenceLevel: "online" | "recent" | null;
  presenceLabel: string | null;
  avgRating: number | null;
  reviewCount: number;
  hasActiveStory: boolean;
  availableForUrgent: boolean;
  priceFrom: number | null;
  avgResponseTimeHours: number | null;
}

export type PresenceFilter = "all" | "online" | "today";

export interface ProviderFilters {
  search: string;
  locations: string[];
  categories: string[];
  presence: PresenceFilter;
  urgent: boolean;
  top: boolean;
}

export const EMPTY_PROVIDER_FILTERS: ProviderFilters = {
  search: "",
  locations: [],
  categories: [],
  presence: "all",
  urgent: false,
  top: false,
};

const TOP_RATING_THRESHOLD = 4.5;

export function hasActiveProviderFilters(filters: ProviderFilters): boolean {
  return Boolean(
    filters.search ||
      filters.locations.length > 0 ||
      filters.categories.length > 0 ||
      filters.presence !== "all" ||
      filters.urgent ||
      filters.top,
  );
}

/** Prisma `where` fragment for the provider location filter (server-side). */
export function buildProviderLocationFilter(location: string) {
  if (!location) {
    return undefined;
  }

  if (location === "Visa Lietuva") {
    return {
      OR: [
        { location: "Visa Lietuva" },
        { location: { in: LITHUANIAN_CITIES.filter((city) => city !== "Visa Lietuva") } },
      ],
    };
  }

  return {
    OR: [
      { location },
      { location: "Visa Lietuva" },
    ],
  };
}

/** In-memory equivalent of buildProviderLocationFilter, used for client-side filtering. */
function matchesLocations(providerLocation: string | null, filters: string[]): boolean {
  if (filters.length === 0) return true;
  // "Visa Lietuva" picked as a filter means "anywhere" — no city restriction.
  if (filters.includes("Visa Lietuva")) return true;
  // A provider serving the whole country satisfies every city filter.
  if (providerLocation === "Visa Lietuva") return true;
  return providerLocation !== null && filters.includes(providerLocation);
}

/** Quality score for sorting providers. Higher = better. */
export function computeProviderScore(p: ProviderCardData): number {
  let score = 0;

  if (p.isGoat) score += 50;
  if (p.isPremium) score += 30;
  if (p.isYoungTalent) score += 15;
  if (p.isVerified) score += 20;

  if (p.profileImage) score += 5;
  if (p.description) score += 5;
  if (p.location) score += 3;

  if (p.categories.length > 0) {
    score += Math.min(p.categories.length, 3) + 2;
  }

  if (p.avgRating !== null) score += Math.round(p.avgRating * 3);
  if (p.reviewCount > 0) score += Math.min(p.reviewCount, 10);
  if (p.acceptedCount > 0) score += Math.min(p.acceptedCount, 10);
  if (p.responseCount > 0) score += Math.min(Math.floor(p.responseCount / 2), 5);
  if (p.isRecentlyActive) score += 8;
  if (p.availableForUrgent) score += 3;
  if (p.hasActiveStory) score += 2;

  return score;
}

/** Local-first filtering + ranking. Runs in-memory so filter changes are instant. */
export function filterAndSortProviders(
  providers: ProviderCardData[],
  filters: ProviderFilters,
): ProviderCardData[] {
  const query = filters.search.trim().toLowerCase();

  const result = providers.filter((p) => {
    if (query) {
      const haystack = `${p.name ?? ""} ${p.description ?? ""}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (!matchesLocations(p.location, filters.locations)) return false;
    if (
      filters.categories.length > 0 &&
      !p.categories.some(
        (c) => filters.categories.includes(c.slug) || filters.categories.includes(c.id),
      )
    ) {
      return false;
    }
    if (filters.urgent && !p.availableForUrgent) return false;
    if (filters.presence === "online" && p.presenceLevel !== "online") return false;
    if (filters.presence === "today" && p.presenceLevel === null) return false;
    if (filters.top && (p.avgRating === null || p.avgRating < TOP_RATING_THRESHOLD)) {
      return false;
    }
    return true;
  });

  return result.sort((a, b) => computeProviderScore(b) - computeProviderScore(a));
}
