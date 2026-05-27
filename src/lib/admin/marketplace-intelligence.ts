import { prisma } from "@/lib/prisma";

export type MarketplaceIntelligence = {
  supplyDemandGaps: Array<{
    categoryId: string;
    categoryName: string;
    requestCount: number;
    providerCount: number;
    gapScore: number;
  }>;
  unansweredRequests: Array<{
    id: string;
    title: string;
    categoryName: string;
    location: string;
    createdAt: string;
  }>;
  recommendations: string[];
};

const EMPTY: MarketplaceIntelligence = {
  supplyDemandGaps: [],
  unansweredRequests: [],
  recommendations: [],
};

/**
 * CEO intelligence v1 — supply/demand gaps and recent unanswered requests
 * across the last 14 days. Recommendations are deterministic strings
 * computed from the same counts that drive the cards.
 */
export async function getMarketplaceIntelligence(
  since: Date,
): Promise<MarketplaceIntelligence> {
  try {
    const [recentRequests, activeProviders] = await Promise.all([
      prisma.serviceRequest.findMany({
        where: {
          createdAt: { gte: since },
          status: "OPEN",
          moderationStatus: "APPROVED",
        },
        select: {
          id: true,
          title: true,
          location: true,
          createdAt: true,
          categoryId: true,
          categoryRef: { select: { name: true } },
          _count: { select: { responses: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
      prisma.providerProfile.findMany({
        where: { isActive: true },
        select: {
          id: true,
          categories: {
            select: {
              categoryId: true,
              category: { select: { name: true } },
            },
          },
        },
        take: 1000,
      }),
    ]);

    const demand = new Map<string, { categoryName: string; requestCount: number }>();
    for (const request of recentRequests) {
      if (!request.categoryId) continue;
      const current = demand.get(request.categoryId) ?? {
        categoryName: request.categoryRef?.name ?? "Nežinoma kategorija",
        requestCount: 0,
      };
      current.requestCount += 1;
      demand.set(request.categoryId, current);
    }

    const supply = new Map<string, { categoryName: string; providerIds: Set<string> }>();
    for (const provider of activeProviders) {
      for (const link of provider.categories) {
        const current = supply.get(link.categoryId) ?? {
          categoryName: link.category.name,
          providerIds: new Set<string>(),
        };
        current.providerIds.add(provider.id);
        supply.set(link.categoryId, current);
      }
    }

    const supplyDemandGaps = Array.from(demand.entries())
      .map(([categoryId, item]) => {
        const providerCount = supply.get(categoryId)?.providerIds.size ?? 0;
        return {
          categoryId,
          categoryName: item.categoryName,
          requestCount: item.requestCount,
          providerCount,
          gapScore: item.requestCount * 2 - providerCount,
        };
      })
      .filter((item) => item.requestCount > 0 && item.gapScore > 0)
      .sort((a, b) => b.gapScore - a.gapScore || b.requestCount - a.requestCount)
      .slice(0, 5);

    const unansweredRequests = recentRequests
      .filter((request) => request._count.responses === 0)
      .slice(0, 5)
      .map((request) => ({
        id: request.id,
        title: request.title,
        categoryName: request.categoryRef?.name ?? "Nežinoma kategorija",
        location: request.location,
        createdAt: request.createdAt.toISOString(),
      }));

    const recommendations: string[] = [];
    const topGap = supplyDemandGaps[0];
    if (topGap) {
      recommendations.push(
        `Auginti tiekėjus kategorijoje „${topGap.categoryName}" — ${topGap.requestCount} užkl., ${topGap.providerCount} aktyvūs tiekėjai.`,
      );
    }
    if (unansweredRequests.length > 0) {
      recommendations.push(
        `Peržiūrėti ${unansweredRequests.length} naujas užklausas be atsakymų ir paskatinti tinkamus tiekėjus.`,
      );
    }
    if (recommendations.length === 0) {
      recommendations.push("Paklausos ir pasiūlos signalai kol kas stabilūs.");
    }

    return { supplyDemandGaps, unansweredRequests, recommendations };
  } catch (error) {
    console.error("Admin marketplace intelligence error:", error);
    return EMPTY;
  }
}
