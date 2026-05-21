import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SERVICE_CATEGORIES, getEffectivePlanType, PLAN_LIMITS } from "@/lib/constants";
import { Users, ArrowRight, Database } from "lucide-react";
import ProvidersExperience from "@/components/tiekejai/ProvidersExperience";
import { isStoryEnabled } from "@/lib/platform-settings";
import { getSafeProviderImageUrl } from "@/lib/cloudinary-image";
import type { ProviderCardData, ProviderFilters } from "@/lib/provider-filters";

export const metadata: Metadata = {
  title: "Meistrai ir paslaugų teikėjai",
  description: "Raskite patikimus paslaugų tiekėjus Lietuvoje. Peržiūrėkite profilius, specializacijas ir atsiliepimus.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    location?: string;
    category?: string;
    active?: string;
    urgent?: string;
    top?: string;
  }>;
}

const DESC_PREVIEW_LENGTH = 160;
// Local-first listing: every provider is fetched once and filtered in the
// browser, so category/location/search changes are instant. 500 is a safety
// ceiling — beyond it, filtering should move back into SQL.
const MAX_PROVIDERS = 500;

export default async function ProvidersListingPage({ searchParams }: PageProps) {
  const params = await searchParams;

  // Initial filters come from the URL so shared/deep links keep working.
  const rawCategory = params.category ?? "";
  const initialFilters: ProviderFilters = {
    search: params.search?.trim() || "",
    location: params.location || "",
    category: SERVICE_CATEGORIES.some((c) => c.value === rawCategory) ? rawCategory : "",
    active: params.active === "1",
    urgent: params.urgent === "1",
    top: params.top === "1",
  };

  const where: Record<string, unknown> = {
    role: "PROVIDER",
    emailVerified: { not: null },
    providerProfile: { isActive: true },
  };

  const [providers, storyFeatureOn] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        image: true,
        createdAt: true,
        providerProfile: {
          select: {
            slug: true,
            description: true,
            specializations: true,
            location: true,
            images: true,
            planType: true,
            availableForUrgent: true,
            priceFrom: true,
          },
        },
        subscription: { select: { status: true } },
        _count: { select: { responses: true, reviewsReceived: true } },
      },
      orderBy: { createdAt: "desc" },
      take: MAX_PROVIDERS,
    }),
    isStoryEnabled(),
  ]);

  const providerIds = providers.map((p) => p.id);

  // ── Batch queries ──
  const [reviewAggs, acceptedRows, lastResponseRows, avgResponseRows, activeStories] = await Promise.all([
    providerIds.length > 0
      ? prisma.review.groupBy({
          by: ["providerId"],
          where: { providerId: { in: providerIds } },
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
            expiresAt: { gt: new Date() },
          },
          _count: true,
        })
      : Promise.resolve([]),
  ]);

  // ── Build lookup maps ──
  const reviewMap = new Map(reviewAggs.map((r) => [r.providerId, { avg: r._avg.rating, count: r._count._all }]));
  const acceptedMap = new Map(acceptedRows.map((r) => [r.providerId, Number(r.count)]));
  const lastResponseMap = new Map(lastResponseRows.map((r) => [r.providerId, new Date(r.lastAt)]));
  const avgResponseMap = new Map(
    avgResponseRows.map((r) => {
      const hours = r.avgHours !== null ? Math.round(Number(r.avgHours)) : null;
      return [r.providerId, hours];
    })
  );
  const providersWithStories = new Set(activeStories.map((s) => s.providerId));

  // ── Map to card data ──
  const allProviders: ProviderCardData[] = providers.map((p) => {
    const planType = getEffectivePlanType(p.providerProfile?.planType || "FREE", p.subscription?.status);
    const badge = PLAN_LIMITS[planType]?.badge || null;

    const firstImage: string | null = p.providerProfile?.images?.[0] ?? null;
    const specs: string[] = p.providerProfile?.specializations ?? [];

    const lastActiveAt = lastResponseMap.get(p.id) || p.createdAt;
    const daysSinceActive = Math.floor(
      (Date.now() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    const isRecentlyActive = daysSinceActive <= 7;

    const acceptedCount = acceptedMap.get(p.id) || 0;
    const review = reviewMap.get(p.id);
    const avgRating = review?.avg != null ? Math.round(review.avg * 10) / 10 : null;
    const reviewCount = review?.count ?? 0;

    const rawDesc = p.providerProfile?.description || null;
    const description = rawDesc && rawDesc.length > DESC_PREVIEW_LENGTH
      ? rawDesc.slice(0, DESC_PREVIEW_LENGTH).trimEnd() + "…"
      : rawDesc;

    return {
      id: p.id,
      slug: p.providerProfile?.slug ?? null,
      name: p.name,
      profileImage: getSafeProviderImageUrl(firstImage || p.image, { width: 96, crop: "fill" }),
      coverImage: getSafeProviderImageUrl(firstImage || p.image, { width: 600, height: 400, crop: "fill" }),
      description,
      specializations: specs,
      location: p.providerProfile?.location || null,
      planType,
      badge,
      responseCount: p._count.responses,
      acceptedCount,
      isRecentlyActive,
      avgRating,
      reviewCount,
      hasActiveStory: providersWithStories.has(p.id),
      availableForUrgent: p.providerProfile?.availableForUrgent ?? false,
      priceFrom: p.providerProfile?.priceFrom ?? null,
      avgResponseTimeHours: avgResponseMap.get(p.id) ?? null,
    };
  });

  const total = allProviders.length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-surface-200/50 dark:border-surface-800/50">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950">
              <Users className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">
              Meistrai ir paslaugų teikėjai
            </h1>
          </div>
          <p className="text-body text-surface-500 dark:text-surface-400 ml-[52px]">
            {total > 0
              ? `${total} ${total === 1 ? "patikimas specialistas" : total < 10 ? "patikimi specialistai" : "patikimų specialistų"} jūsų paslaugoms`
              : "Raskite patikimus specialistus savo mieste"}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter bar + listing — local-first, filters run in-memory */}
        <ProvidersExperience
          initialProviders={allProviders}
          initialFilters={initialFilters}
        />

        {/* Imported catalog CTA */}
        <div className="mt-8 rounded-2xl border border-amber-200/60 bg-amber-50/50 p-6 dark:border-amber-800/30 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50">
              <Database className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-body font-semibold text-surface-900 dark:text-white">
                Importuotas katalogas
              </p>
              <p className="text-body-sm text-surface-500 dark:text-surface-400">
                Peržiūrėkite tiekėjų profilius iš paslaugos.lt katalogo
              </p>
            </div>
            <Link
              href="/meistrai/katalogas"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-body-sm font-semibold text-white shadow-sm hover:bg-amber-700 transition-colors"
            >
              Katalogas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-6 rounded-2xl border border-surface-200/60 bg-white p-8 text-center dark:border-surface-700/50 dark:bg-surface-900/50">
          <p className="text-body font-semibold text-surface-900 dark:text-white">
            Nerandate tinkamo specialisto?
          </p>
          <p className="mt-1 text-body-sm text-surface-500 dark:text-surface-400 max-w-md mx-auto">
            Paskelbkite užklausą nemokamai — tiekėjai patys pateiks pasiūlymus ir jūs galėsite palyginti.
          </p>
          <Link
            href="/uzklausos/nauja"
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-6 py-2.5 text-body-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
          >
            Paskelbti užklausą
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
