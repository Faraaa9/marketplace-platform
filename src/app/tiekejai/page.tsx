import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SERVICE_CATEGORIES, LITHUANIAN_CITIES, getEffectivePlanType, PLAN_LIMITS } from "@/lib/constants";
import { Users, ArrowRight } from "lucide-react";
import ProviderFilterBar from "@/components/tiekejai/ProviderFilterBar";
import ProviderListingClient from "@/components/tiekejai/ProviderListingClient";
import { isStoryEnabled } from "@/lib/platform-settings";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary-image";
import type { ProviderCardData } from "@/store/useProviderFilterStore";

export const metadata: Metadata = {
  title: "Paslaugų tiekėjai — PaslaugųRinka",
  description: "Raskite patikimus paslaugų tiekėjus Lietuvoje. Peržiūrėkite profilius, specializacijas ir atsiliepimus.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

const DESC_PREVIEW_LENGTH = 160;

export default async function ProvidersListingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1"));
  const search = params.search || "";
  const perPage = 20;

  // Build filter — only active + verified
  // Category/location filtering is now client-side (in-memory)
  const where: Record<string, unknown> = {
    role: "PROVIDER",
    emailVerified: { not: null },
    providerProfile: { isActive: true },
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { providerProfile: { description: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [providers, total, storyFeatureOn] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        image: true,
        createdAt: true,
        providerProfile: {
          select: {
            description: true,
            specializations: true,
            location: true,
            images: true,
            planType: true,
          },
        },
        subscription: { select: { status: true } },
        _count: { select: { responses: true, reviewsReceived: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.user.count({ where }),
    isStoryEnabled(),
  ]);

  const pages = Math.ceil(total / perPage);
  const providerIds = providers.map((p) => p.id);

  // Batch queries — run in parallel
  const [reviewAggs, acceptedRows, lastResponseRows, activeStories] = await Promise.all([
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

  // Build lookup maps
  const reviewMap = new Map(reviewAggs.map((r) => [r.providerId, { avg: r._avg.rating, count: r._count._all }]));
  const acceptedMap = new Map(acceptedRows.map((r) => [r.providerId, Number(r.count)]));
  const lastResponseMap = new Map(lastResponseRows.map((r) => [r.providerId, new Date(r.lastAt)]));
  const providersWithStories = new Set(activeStories.map((s) => s.providerId));

  // Process providers into serializable card data
  const mapped: ProviderCardData[] = providers.map((p) => {
    const planType = getEffectivePlanType(p.providerProfile?.planType || "FREE", p.subscription?.status);
    const badge = PLAN_LIMITS[planType]?.badge || null;

    let firstImage: string | null = null;
    try {
      const parsed = JSON.parse(p.providerProfile?.images || "[]");
      if (Array.isArray(parsed) && parsed.length > 0) {
        const img = parsed[0];
        firstImage = typeof img === "string" ? img : img?.url || null;
      }
    } catch {}

    let specs: string[] = [];
    try { specs = JSON.parse(p.providerProfile?.specializations || "[]"); } catch {}

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
      name: p.name,
      profileImage: optimizeCloudinaryUrl(firstImage || p.image || "", { width: 96, crop: "fill" }) || null,
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
    };
  });

  // Sort PRO first
  const planOrder: Record<string, number> = { PRO: 0, BASIC: 1, FREE: 2 };
  mapped.sort((a, b) => (planOrder[a.planType] ?? 2) - (planOrder[b.planType] ?? 2));

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* Header */}
      <div className="relative overflow-hidden bg-white dark:bg-surface-900 border-b border-surface-200/50 dark:border-surface-800/50">
        <div className="absolute inset-0 bg-radial-brand-subtle" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950">
              <Users className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">
              Paslaugų tiekėjai
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
        {/* Filter bar */}
        <div className="mb-6">
          <ProviderFilterBar
            activeSearch={search}
            categories={SERVICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            cities={[...LITHUANIAN_CITIES]}
            serverTotal={total}
          />
        </div>

        {/* Client-rendered listing with local-first filtering */}
        <ProviderListingClient
          providers={mapped}
          serverSearch={search}
          serverPage={page}
          serverTotalPages={pages}
          serverTotal={total}
        />

        {/* Bottom CTA */}
        <div className="mt-12 rounded-2xl border border-surface-200/60 bg-white p-8 text-center dark:border-surface-700/50 dark:bg-surface-900/50">
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
