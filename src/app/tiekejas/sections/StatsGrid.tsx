import Link from "next/link";
import {
  FileText,
  MessageCircle,
  Coins,
  CheckCircle2,
  ArrowRight,
  Clock,
  MapPin,
  Sparkles,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { expandToMatchSet, activeCategoryFilter } from "@/lib/category-matching";
import { computeProfileCompleteness } from "@/lib/provider-completeness";
import { getUnlockedRequestIds } from "@/lib/credits";
import { formatRelativeDate } from "@/lib/utils";

interface NextAction {
  label: string;
  description: string;
  href: string;
}

/** The single most important next step for the provider (advisory CTA). */
function getNextAction(stats: {
  emailVerified: boolean;
  isActive: boolean;
  categoryCount: number;
  profileCompleteness: number;
  missingProfileItems: string[];
  matchingRequests: number;
  myResponses: number;
}): NextAction | null {
  if (!stats.emailVerified) return null; // AccountCard banner handles this
  if (!stats.isActive) return null; // AccountCard suspension alert handles this
  if (stats.categoryCount === 0) {
    return {
      label: "Pasirinkite veiklos sritis",
      description: "Be veiklos sričių nematysite jums tinkamų užklausų",
      href: "/tiekejas/profilis",
    };
  }
  if (stats.profileCompleteness < 100) {
    return {
      label: "Užpildykite profilį",
      description: `${stats.profileCompleteness}% — trūksta: ${stats.missingProfileItems.slice(0, 2).join(", ")}`,
      href: "/tiekejas/profilis",
    };
  }
  if (stats.matchingRequests > 0 && stats.myResponses === 0) {
    return {
      label: "Atsakykite į pirmą užklausą",
      description: `${stats.matchingRequests} užklausos atitinka jūsų veiklos sritis`,
      href: "/tiekejas/uzklausos",
    };
  }
  if (stats.matchingRequests > 0) {
    return {
      label: "Peržiūrėkite naujas užklausas",
      description: `${stats.matchingRequests} tinkamos užklausos laukia jūsų pasiūlymo`,
      href: "/tiekejas/uzklausos",
    };
  }
  return null;
}

/**
 * Provider dashboard metrics: a contextual next-action CTA plus the four stat
 * tiles (matching requests, my responses, credits, accepted). Owns the
 * expensive matching count (expandToMatchSet) — computed once here.
 */
export async function StatsGrid({ userId }: { userId: string }) {
  const [profile, user, responseRows] = await Promise.all([
    prisma.providerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        creditBalance: true,
        isActive: true,
        categories: { where: activeCategoryFilter(), select: { categoryId: true } },
        description: true,
        headline: true,
        services: true,
        location: true,
        phone: true,
        images: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    }),
    prisma.response.findMany({
      where: { providerId: userId },
      select: { id: true, request: { select: { acceptedResponseId: true } } },
    }),
  ]);

  const categoryIds = profile?.categories.map((c) => c.categoryId) ?? [];
  const matchSet = await expandToMatchSet(categoryIds);
  const matchingRequests =
    categoryIds.length > 0
      ? await prisma.serviceRequest.count({
          where: {
            status: "OPEN",
            moderationStatus: "APPROVED",
            categoryId: { in: matchSet },
            clientId: { not: userId },
          },
        })
      : 0;
  const topRequestRows =
    categoryIds.length > 0
      ? await prisma.serviceRequest.findMany({
          where: {
            status: "OPEN",
            moderationStatus: "APPROVED",
            categoryId: { in: matchSet },
            clientId: { not: userId },
          },
          select: {
            id: true,
            title: true,
            categoryId: true,
            categoryRef: { select: { name: true } },
            categories: {
              select: { categoryId: true, category: { select: { name: true } } },
              orderBy: { sortOrder: "asc" },
            },
            location: true,
            budget: true,
            createdAt: true,
            responses: {
              where: { providerId: userId },
              select: { id: true },
              take: 1,
            },
            _count: { select: { responses: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 60,
        })
      : [];

  const myResponses = responseRows.length;
  const acceptedCount = responseRows.filter(
    (row) => row.request.acceptedResponseId === row.id,
  ).length;
  const creditBalance = profile?.creditBalance ?? 0;

  const { completeness, missingItems } = computeProfileCompleteness({
    description: profile?.description ?? null,
    headline: profile?.headline ?? null,
    services: profile?.services ?? null,
    location: profile?.location ?? null,
    phone: profile?.phone ?? null,
    images: profile?.images ?? [],
    categoryCount: categoryIds.length,
  });

  const nextAction = getNextAction({
    emailVerified: !!user?.emailVerified,
    isActive: profile?.isActive ?? false,
    categoryCount: categoryIds.length,
    profileCompleteness: completeness,
    missingProfileItems: missingItems,
    matchingRequests,
    myResponses,
  });
  const providerMatch = new Set(matchSet);
  const unlockedIds = profile?.id
    ? await getUnlockedRequestIds(
        profile.id,
        topRequestRows.map((request) => request.id),
      )
    : new Set<string>();
  const topRequests = topRequestRows
    .map((request) => {
      const requestCategoryIds =
        request.categories.length > 0
          ? request.categories.map((link) => link.categoryId)
          : request.categoryId
            ? [request.categoryId]
            : [];
      const categoryNames = request.categories
        .map((link) => link.category?.name?.trim() ?? "")
        .filter((name) => name.length > 0);
      let relevance = 0;
      if (requestCategoryIds.some((id) => providerMatch.has(id))) relevance += 2;
      if (
        request.location === profile?.location ||
        request.location === "Visa Lietuva" ||
        profile?.location === "Visa Lietuva"
      ) {
        relevance += 1;
      }
      return {
        id: request.id,
        title: request.title,
        categoryName:
          categoryNames[0] ?? request.categoryRef?.name ?? "Užklausa",
        location: request.location,
        budget: request.budget,
        createdAt: request.createdAt,
        responseCount: request._count.responses,
        hasResponded: request.responses.length > 0,
        isUnlocked: unlockedIds.has(request.id),
        relevance,
      };
    })
    .sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, 3);
  const canWork = !!user?.emailVerified && (profile?.isActive ?? false);

  return (
    <section className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <div className="rounded-2xl border border-surface-200/60 bg-white p-5 shadow-soft dark:border-surface-700/50 dark:bg-surface-900/50 sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-body-sm font-medium text-surface-500 dark:text-surface-400">
              Šiandien svarbiausia
            </p>
            <h2 className="mt-1 text-heading-2 font-bold text-surface-900 dark:text-white">
              {nextAction?.label ?? "Sekite naujas užklausas"}
            </h2>
            <p className="mt-1 max-w-xl text-body-sm leading-relaxed text-surface-500 dark:text-surface-400">
              {nextAction?.description ??
                "Profilis paruoštas. Kai atsiras tinkama užklausa, pradėkite nuo atrakinimo ir trumpo pasiūlymo."}
            </p>
          </div>
          <Link
            href={nextAction?.href ?? "/tiekejas/uzklausos"}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-body-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {nextAction ? "Atlikti veiksmą" : "Peržiūrėti užklausas"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricTile
            href="/tiekejas/uzklausos"
            icon={FileText}
            value={matchingRequests}
            label="Tinkamos"
            tone="brand"
          />
          <MetricTile
            href="/tiekejas/atsakymai"
            icon={MessageCircle}
            value={myResponses}
            label="Atsakymai"
            tone="emerald"
          />
          <MetricTile
            href="/tiekejas/planai"
            icon={Coins}
            value={creditBalance}
            label="Kreditai"
            tone={creditBalance > 0 ? "brand" : "amber"}
          />
          <MetricTile
            href="/tiekejas/atsakymai?status=priimti"
            icon={CheckCircle2}
            value={acceptedCount}
            label="Priimti"
            tone="emerald"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-surface-200/60 bg-white p-5 shadow-soft dark:border-surface-700/50 dark:bg-surface-900/50">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-body-sm font-semibold text-surface-900 dark:text-white">
              Naujos galimybės
            </p>
            <p className="text-micro text-surface-500 dark:text-surface-400">
              Geriausi atitikimai pagal veiklos sritis
            </p>
          </div>
          <Link
            href="/tiekejas/uzklausos"
            className="text-caption font-semibold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400"
          >
            Visos
          </Link>
        </div>

        {!canWork ? (
          <div className="rounded-xl border border-dashed border-surface-200 bg-surface-50 px-4 py-5 text-body-sm text-surface-500 dark:border-surface-700 dark:bg-surface-800/40 dark:text-surface-400">
            Patvirtinkite paskyrą ir įjunkite profilį, kad galėtumėte dirbti su užklausomis.
          </div>
        ) : topRequests.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-200 bg-surface-50 px-4 py-5 dark:border-surface-700 dark:bg-surface-800/40">
            <div className="flex items-center gap-2 text-body-sm font-medium text-surface-700 dark:text-surface-200">
              <Sparkles className="h-4 w-4 text-brand-500" />
              Kol kas naujų atitikimų nėra
            </div>
            <p className="mt-1 text-body-sm text-surface-500 dark:text-surface-400">
              Pridėkite daugiau veiklos sričių arba patikrinkite užklausas vėliau.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {topRequests.map((request) => (
              <Link
                key={request.id}
                href={`/tiekejas/uzklausos/${request.id}`}
                className="group block rounded-xl border border-surface-200/70 bg-surface-50/70 px-3 py-3 transition-colors hover:border-brand-200 hover:bg-brand-50/50 dark:border-surface-700/50 dark:bg-surface-800/30 dark:hover:border-brand-800/50 dark:hover:bg-brand-500/10"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="truncate rounded-lg bg-white px-2 py-1 text-micro font-semibold text-surface-600 dark:bg-surface-900 dark:text-surface-300">
                    {request.categoryName}
                  </span>
                  <span className="shrink-0 rounded-lg bg-brand-50 px-2 py-1 text-micro font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                    {request.hasResponded
                      ? "Atsakyta"
                      : request.isUnlocked
                        ? "Atrakinta"
                        : "1 kreditas"}
                  </span>
                </div>
                <p className="line-clamp-2 text-body-sm font-semibold text-surface-900 transition-colors group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
                  {request.title}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-micro text-surface-500 dark:text-surface-400">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {request.location}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatRelativeDate(request.createdAt)}
                  </span>
                  {request.budget && (
                    <span className="inline-flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5" />
                      {request.budget}
                    </span>
                  )}
                  <span>{request.responseCount} ats.</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function MetricTile({
  href,
  icon: Icon,
  value,
  label,
  tone,
}: {
  href: string;
  icon: typeof FileText;
  value: number;
  label: string;
  tone: "brand" | "emerald" | "amber";
}) {
  const toneClass = {
    brand:
      "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    amber:
      "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  }[tone];

  return (
    <Link
      href={href}
      className="group rounded-xl border border-surface-200/70 bg-surface-50/70 p-3 transition-colors hover:border-brand-200 hover:bg-white dark:border-surface-700/50 dark:bg-surface-800/30 dark:hover:border-brand-800/50 dark:hover:bg-surface-800/60"
    >
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${toneClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-heading-3 font-bold tabular-nums text-surface-900 dark:text-white">
        {value}
      </p>
      <p className="text-micro font-medium text-surface-500 dark:text-surface-400">
        {label}
      </p>
    </Link>
  );
}
