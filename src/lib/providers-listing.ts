import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isStoryEnabled } from "@/lib/platform-settings";
import { getSafeProviderImageUrl } from "@/lib/cloudinary-image";
import { getPresenceLabel, getPresenceLevel } from "@/lib/presence";
import { getServiceCategoryGroups } from "@/lib/service-categories";
import type { ProviderCardData } from "@/lib/provider-filters";

const DESC_PREVIEW_LENGTH = 160;
// Local-first listing: every provider is fetched once and filtered in the
// browser, so category/location/search changes are instant. 500 is a safety
// ceiling — beyond it, filtering should move back into SQL.
const MAX_PROVIDERS = 500;

/** Raw cached fetch — DB + enrichment, no card-shape building. Two consumers
 *  share this cache: the /meistrai server page (top-20 slice for fast TTFB)
 *  and the /api/meistrai/providers route (full set, fetched after hydration
 *  to restore the local-first filtering experience). */
async function getProvidersListingDataCached() {
  "use cache";
  cacheLife({ revalidate: 60 });
  cacheTag("providers-listing");

  const where = {
    role: "PROVIDER",
    emailVerified: { not: null },
    providerProfile: { isActive: true, moderationStatus: "APPROVED" as const },
  };

  const [providers, storyFeatureOn, categoryGroups] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        image: true,
        createdAt: true,
        lastSeenAt: true,
        providerProfile: {
          select: {
            slug: true,
            description: true,
            categories: {
              select: { category: { select: { id: true, name: true, slug: true } } },
              orderBy: { sortOrder: "asc" },
            },
            location: true,
            images: true,
            isVerified: true,
            isPremium: true,
            isYoungTalent: true,
            isGoat: true,
            availableForUrgent: true,
            priceFrom: true,
          },
        },
        _count: { select: { responses: true, reviewsReceived: true } },
      },
      orderBy: { createdAt: "desc" },
      take: MAX_PROVIDERS,
    }),
    isStoryEnabled(),
    getServiceCategoryGroups(),
  ]);

  const providerIds = providers.map((p) => p.id);

  const [reviewAggs, acceptedRows, lastResponseRows, avgResponseRows, activeStories] = await Promise.all([
    providerIds.length > 0
      ? prisma.review.groupBy({
          by: ["providerId"],
          where: { providerId: { in: providerIds }, moderationStatus: "APPROVED" },
          _avg: { rating: true },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    providerIds.length > 0
      ? prisma.$queryRaw<Array<{ providerId: string; count: bigint }>>`
          SELECT r."providerId", COUNT(*)::bigint AS count
          FROM service_requests sr
          JOIN responses r ON sr."acceptedResponseId" = r.id
          WHERE r."providerId" = ANY(${providerIds}::text[])
          GROUP BY r."providerId"
        `
      : Promise.resolve([]),
    providerIds.length > 0
      ? prisma.$queryRaw<Array<{ providerId: string; lastAt: Date }>>`
          SELECT "providerId", MAX("createdAt") AS "lastAt"
          FROM responses
          WHERE "providerId" = ANY(${providerIds}::text[])
          GROUP BY "providerId"
        `
      : Promise.resolve([]),
    providerIds.length > 0
      ? prisma.$queryRaw<Array<{ providerId: string; avgHours: number | null }>>`
          SELECT r."providerId",
                 AVG(EXTRACT(EPOCH FROM (r."createdAt" - sr."createdAt")) / 3600) AS "avgHours"
          FROM responses r
          JOIN service_requests sr ON r."requestId" = sr.id
          WHERE r."providerId" = ANY(${providerIds}::text[])
            AND r."createdAt" > sr."createdAt"
          GROUP BY r."providerId"
        `
      : Promise.resolve([]),
    storyFeatureOn && providerIds.length > 0
      ? prisma.providerStory.groupBy({
          by: ["providerId"],
          where: {
            providerId: { in: providerIds },
            moderationStatus: "APPROVED",
            expiresAt: { gt: new Date() },
          },
          _count: true,
        })
      : Promise.resolve([]),
  ]);

  return {
    providers,
    categoryGroups,
    reviewAggs: reviewAggs.map((r) => ({
      providerId: r.providerId,
      avg: r._avg.rating,
      count: r._count._all,
    })),
    acceptedRows: acceptedRows.map((r) => ({
      providerId: r.providerId,
      count: Number(r.count),
    })),
    lastResponseRows: lastResponseRows.map((r) => ({
      providerId: r.providerId,
      lastAt: r.lastAt.toISOString(),
    })),
    avgResponseRows: avgResponseRows.map((r) => ({
      providerId: r.providerId,
      avgHours: r.avgHours !== null ? Math.round(Number(r.avgHours)) : null,
    })),
    activeStoryProviderIds: activeStories.map((s) => s.providerId),
  };
}

export type ProvidersListingCachedData = Awaited<ReturnType<typeof getProvidersListingDataCached>>;

export async function getProvidersListingData() {
  return getProvidersListingDataCached();
}

/** Builds card-shape data the listing UI consumes. Pure transform — no DB or
 *  cache work — so callers can slice the providers array first and only pay
 *  the transform cost for the visible subset. */
export function buildProviderCards(
  data: ProvidersListingCachedData,
  providers: ProvidersListingCachedData["providers"] = data.providers,
): ProviderCardData[] {
  const reviewMap = new Map(data.reviewAggs.map((r) => [r.providerId, { avg: r.avg, count: r.count }]));
  const acceptedMap = new Map(data.acceptedRows.map((r) => [r.providerId, r.count]));
  const lastResponseMap = new Map(data.lastResponseRows.map((r) => [r.providerId, new Date(r.lastAt)]));
  const avgResponseMap = new Map(data.avgResponseRows.map((r) => [r.providerId, r.avgHours]));
  const storySet = new Set(data.activeStoryProviderIds);

  return providers.map((p) => {
    const firstImage: string | null = p.providerProfile?.images?.[0] ?? null;
    const categories = (p.providerProfile?.categories ?? []).map((link) => ({
      id: link.category.id,
      name: link.category.name,
      slug: link.category.slug,
    }));

    const lastActiveAt = lastResponseMap.get(p.id) || p.createdAt;
    const daysSinceActive = Math.floor(
      (Date.now() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60 * 24),
    );
    const isRecentlyActive = daysSinceActive <= 7;

    const acceptedCount = acceptedMap.get(p.id) || 0;
    const review = reviewMap.get(p.id);
    const avgRating = review?.avg != null ? Math.round(review.avg * 10) / 10 : null;
    const reviewCount = review?.count ?? 0;

    const rawDesc = p.providerProfile?.description || null;
    const description =
      rawDesc && rawDesc.length > DESC_PREVIEW_LENGTH
        ? rawDesc.slice(0, DESC_PREVIEW_LENGTH).trimEnd() + "…"
        : rawDesc;

    const badge = p.providerProfile?.isVerified ? "Patikimas" : null;

    return {
      id: p.id,
      slug: p.providerProfile?.slug ?? null,
      name: p.name,
      profileImage: getSafeProviderImageUrl(firstImage || p.image, { width: 96, crop: "fill" }),
      coverImage: getSafeProviderImageUrl(firstImage || p.image, { width: 600, height: 400, crop: "fill" }),
      description,
      categories,
      location: p.providerProfile?.location || null,
      isVerified: p.providerProfile?.isVerified ?? false,
      isPremium: p.providerProfile?.isPremium ?? false,
      isYoungTalent: p.providerProfile?.isYoungTalent ?? false,
      isGoat: p.providerProfile?.isGoat ?? false,
      badge,
      responseCount: p._count.responses,
      acceptedCount,
      isRecentlyActive,
      presenceLevel: getPresenceLevel(p.lastSeenAt),
      presenceLabel: getPresenceLabel(p.lastSeenAt),
      avgRating,
      reviewCount,
      hasActiveStory: storySet.has(p.id),
      availableForUrgent: p.providerProfile?.availableForUrgent ?? false,
      priceFrom: p.providerProfile?.priceFrom ?? null,
      avgResponseTimeHours: avgResponseMap.get(p.id) ?? null,
    };
  });
}
