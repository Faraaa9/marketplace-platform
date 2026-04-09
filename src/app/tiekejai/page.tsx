import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SERVICE_CATEGORIES, LITHUANIAN_CITIES, getEffectivePlanType, PLAN_LIMITS } from "@/lib/constants";
import { buildProviderLocationFilter } from "@/lib/provider-filters";
import { MapPin, Shield, MessageSquare, Search, Users, Clock, Award, Star, ArrowRight } from "lucide-react";
import ProviderFilterBar from "@/components/tiekejai/ProviderFilterBar";

export const metadata: Metadata = {
  title: "Paslaugų tiekėjai — PaslaugųRinka",
  description: "Raskite patikimus paslaugų tiekėjus Lietuvoje. Peržiūrėkite profilius, specializacijas ir atsiliepimus.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ page?: string; category?: string; location?: string; search?: string }>;
}

export default async function ProvidersListingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1"));
  const category = params.category || "";
  const location = params.location || "";
  const search = params.search || "";
  const perPage = 20;

  // Build filter — only active + verified
  const where: Record<string, unknown> = {
    role: "PROVIDER",
    emailVerified: { not: null },
    providerProfile: { isActive: true },
  };

  if (category) {
    where.providerProfile = {
      ...(where.providerProfile as Record<string, unknown>),
      specializations: { contains: category },
    };
  }
  if (location) {
    where.providerProfile = {
      ...(where.providerProfile as Record<string, unknown>),
      ...buildProviderLocationFilter(location),
    };
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { providerProfile: { description: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [providers, total] = await Promise.all([
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
            phone: true,
            website: true,
          },
        },
        subscription: { select: { status: true } },
        _count: { select: { responses: true } },
        responses: {
          select: { id: true, createdAt: true },
          orderBy: { createdAt: "desc" as const },
          take: 1,
        },
        reviewsReceived: {
          select: { rating: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.user.count({ where }),
  ]);

  const pages = Math.ceil(total / perPage);
  const hasFilters = category || location || search;

  // Batch query: count accepted responses per provider
  const providerIds = providers.map((p) => p.id);
  const acceptedCounts = providerIds.length > 0
    ? await prisma.serviceRequest.groupBy({
        by: ["acceptedResponseId"],
        where: {
          acceptedResponseId: { not: null },
          responses: { some: { providerId: { in: providerIds } } },
        },
        _count: true,
      })
    : [];
  const acceptedResponseIds = acceptedCounts.map((a) => a.acceptedResponseId).filter(Boolean) as string[];
  const acceptedResponses = acceptedResponseIds.length > 0
    ? await prisma.response.findMany({
        where: { id: { in: acceptedResponseIds } },
        select: { id: true, providerId: true },
      })
    : [];
  const acceptedByProvider = new Map<string, number>();
  for (const r of acceptedResponses) {
    acceptedByProvider.set(r.providerId, (acceptedByProvider.get(r.providerId) || 0) + 1);
  }

  // Process providers
  const mapped = providers.map((p) => {
    const planType = getEffectivePlanType(p.providerProfile?.planType || "FREE", p.subscription?.status);
    const badge = PLAN_LIMITS[planType]?.badge || null;

    let images: string[] = [];
    try {
      const parsed = JSON.parse(p.providerProfile?.images || "[]");
      images = Array.isArray(parsed)
        ? parsed.map((img: { url?: string } | string) => typeof img === "string" ? img : img.url || "").filter(Boolean)
        : [];
    } catch {}

    let specs: string[] = [];
    try { specs = JSON.parse(p.providerProfile?.specializations || "[]"); } catch {}

    // Last active
    const lastActiveAt = p.responses[0]?.createdAt || p.createdAt;
    const daysSinceActive = Math.floor(
      (Date.now() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    const isRecentlyActive = daysSinceActive <= 7;

    const acceptedCount = acceptedByProvider.get(p.id) || 0;

    // Reviews
    const reviews = p.reviewsReceived || [];
    const avgRating = reviews.length > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : null;

    return {
      id: p.id,
      name: p.name,
      profileImage: images[0] || p.image || null,
      description: p.providerProfile?.description || null,
      specializations: specs,
      location: p.providerProfile?.location || null,
      planType,
      badge,
      responseCount: p._count.responses,
      acceptedCount,
      isRecentlyActive,
      avgRating,
      reviewCount: reviews.length,
    };
  });

  // Sort PRO first
  const planOrder: Record<string, number> = { PRO: 0, BASIC: 1, FREE: 2 };
  mapped.sort((a, b) => (planOrder[a.planType] ?? 2) - (planOrder[b.planType] ?? 2));

  const categoryLabel = (val: string) => SERVICE_CATEGORIES.find((c) => c.value === val)?.label || val;

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    const nc = overrides.category ?? category;
    const nl = overrides.location ?? location;
    const ns = overrides.search ?? search;
    const np = overrides.page ?? "1";
    if (nc) p.set("category", nc);
    if (nl) p.set("location", nl);
    if (ns) p.set("search", ns);
    if (np !== "1") p.set("page", np);
    const qs = p.toString();
    return `/tiekejai${qs ? `?${qs}` : ""}`;
  }

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
            activeCategory={category}
            activeLocation={location}
            activeSearch={search}
            categoryLabel={category ? categoryLabel(category) : undefined}
            categories={SERVICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            cities={[...LITHUANIAN_CITIES]}
            totalResults={total}
          />
        </div>

        {/* Provider cards */}
        {mapped.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mapped.map((p) => (
              <Link key={p.id} href={`/tiekejai/${p.id}`} className="group block">
                <article className="h-full rounded-2xl border border-surface-200/60 bg-white p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-brand-200/60 dark:border-surface-700/50 dark:bg-surface-900/50 dark:hover:border-brand-700/50 flex flex-col">
                  {/* Avatar + name */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="h-12 w-12 shrink-0 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center overflow-hidden">
                      {p.profileImage ? (
                        <img src={p.profileImage} alt={p.name || ""} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-brand-600 dark:text-brand-400">
                          {(p.name || "T")[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-body font-semibold text-surface-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                          {p.name}
                        </h3>
                        {p.badge && (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro font-medium shrink-0 ${
                            p.planType === "PRO"
                              ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                          }`}>
                            <Shield className="h-3 w-3" />
                            {p.badge}
                          </span>
                        )}
                      </div>
                      {/* Rating row */}
                      {p.avgRating !== null ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3 w-3 ${
                                  star <= Math.round(p.avgRating!)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-surface-200 dark:text-surface-700"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-micro font-medium text-surface-600 dark:text-surface-300">
                            {p.avgRating}
                          </span>
                          <span className="text-micro text-surface-400">
                            ({p.reviewCount})
                          </span>
                        </div>
                      ) : (
                        p.location && (
                          <p className="text-micro text-surface-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {p.location}
                          </p>
                        )
                      )}
                    </div>
                  </div>

                  {/* Location — show separately if rating exists */}
                  {p.avgRating !== null && p.location && (
                    <p className="text-micro text-surface-400 flex items-center gap-1 mb-2">
                      <MapPin className="h-3 w-3" />
                      {p.location}
                    </p>
                  )}

                  {/* Description */}
                  {p.description && (
                    <p className="text-body-sm text-surface-500 dark:text-surface-400 line-clamp-2 mb-3 leading-relaxed">
                      {p.description}
                    </p>
                  )}

                  {/* Specializations */}
                  {p.specializations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {p.specializations.slice(0, 3).map((spec) => (
                        <span key={spec} className="rounded-md bg-surface-100 px-2 py-0.5 text-micro text-surface-600 dark:bg-surface-800 dark:text-surface-400">
                          {categoryLabel(spec)}
                        </span>
                      ))}
                      {p.specializations.length > 3 && (
                        <span className="text-micro text-surface-400">+{p.specializations.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Spacer to push footer down */}
                  <div className="flex-1" />

                  {/* Trust footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-surface-100 dark:border-surface-800">
                    <div className="flex items-center gap-3 text-micro text-surface-400">
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {p.responseCount}
                      </span>
                      {p.acceptedCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <Award className="h-3 w-3" />
                          {p.acceptedCount} priimtų
                        </span>
                      )}
                      {p.isRecentlyActive && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <Clock className="h-3 w-3" />
                          Aktyvus
                        </span>
                      )}
                    </div>
                    <span className="text-micro font-medium text-brand-600 dark:text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-0.5">
                      Profilis
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-surface-300 bg-white p-12 text-center dark:border-surface-700 dark:bg-surface-900">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-100 dark:bg-surface-800">
              <Search className="h-6 w-6 text-surface-400" />
            </div>
            <p className="text-body font-medium text-surface-600 dark:text-surface-300">
              {hasFilters ? "Tiekėjų pagal pasirinktus filtrus nerasta" : "Tiekėjų kol kas nėra"}
            </p>
            <p className="mt-1 text-body-sm text-surface-400 max-w-md mx-auto">
              {hasFilters
                ? "Pabandykite pakeisti filtrus arba peržiūrėti visus tiekėjus"
                : "Platforma dar tik auga. Paskelbkite užklausą — ji bus matoma visiems būsimiems tiekėjams."}
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              {hasFilters && (
                <Link
                  href="/tiekejai"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-surface-200 bg-white px-5 py-2.5 text-body-sm font-semibold text-surface-700 hover:bg-surface-50 transition-colors dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
                >
                  Išvalyti filtrus
                </Link>
              )}
              <Link
                href="/uzklausos/nauja"
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-body-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
              >
                Paskelbti užklausą
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            {page > 1 && (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                className="rounded-xl border border-surface-200 bg-white px-5 py-2.5 text-body-sm font-medium text-surface-600 hover:bg-surface-50 transition-all dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
              >
                Ankstesnis
              </Link>
            )}
            <span className="flex items-center px-4 text-body-sm text-surface-500 font-medium">{page} / {pages}</span>
            {page < pages && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="rounded-xl border border-surface-200 bg-white px-5 py-2.5 text-body-sm font-medium text-surface-600 hover:bg-surface-50 transition-all dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
              >
                Kitas
              </Link>
            )}
          </div>
        )}
        {/* Bottom CTA — for clients */}
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
