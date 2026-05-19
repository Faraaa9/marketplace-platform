import { LITHUANIAN_CITIES } from "@/lib/constants";
import type { ProviderCardData } from "@/store/useProviderFilterStore";

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

/** Quality score for sorting providers. Higher = better. */
export function computeProviderScore(p: ProviderCardData): number {
  let score = 0;

  // Plan tier (0-20)
  if (p.planType === "PRO") score += 20;
  else if (p.planType === "BASIC") score += 10;

  // Has profile image (0-5)
  if (p.profileImage) score += 5;

  // Has description (0-5)
  if (p.description) score += 5;

  // Has location (0-3)
  if (p.location) score += 3;

  // Has specializations (0-5)
  if (p.specializations.length > 0) score += Math.min(p.specializations.length, 3) + 2;

  // Rating (0-15)
  if (p.avgRating !== null) {
    score += Math.round(p.avgRating * 3); // max 15 for 5.0
  }

  // Review count (0-10)
  if (p.reviewCount > 0) {
    score += Math.min(p.reviewCount, 10);
  }

  // Accepted count (0-10)
  if (p.acceptedCount > 0) {
    score += Math.min(p.acceptedCount, 10);
  }

  // Response count (0-5)
  if (p.responseCount > 0) {
    score += Math.min(Math.floor(p.responseCount / 2), 5);
  }

  // Recently active (0-8)
  if (p.isRecentlyActive) score += 8;

  // Available for urgent (0-3)
  if (p.availableForUrgent) score += 3;

  // Has active story (0-2)
  if (p.hasActiveStory) score += 2;

  return score;
}
