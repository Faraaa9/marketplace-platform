import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LITHUANIAN_CITIES, BUDGET_OPTIONS } from "@/lib/constants";
import { formatRelativeDate, truncate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getServiceCategoryGroups, resolveCategoryParam } from "@/lib/service-categories";
import { expandToMatchSet } from "@/lib/category-matching";
import { MapPin, Clock, MessageSquare, ArrowRight, Search, Wallet, Sparkles, TrendingUp } from "lucide-react";
import RequestFilterBar from "@/components/uzklausos/RequestFilterBar";
import PinnedRequestPhotos from "@/components/requests/PinnedRequestPhotos";

export const metadata: Metadata = {
  title: "Viešos užklausos — PaslaugųRinka",
  description:
    "Peržiūrėkite aktyvias paslaugų užklausas Lietuvoje. Raskite darbus ir pateikite pasiūlymus.",
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
    location?: string;
    search?: string;
    sort?: string;
    open?: string;
  }>;
}

async function getBoardListing(
  page: number,
  perPage: number,
  filters: { category: string; location: string; search: string }
) {
  "use cache";
  cacheLife({ revalidate: 30 });
  cacheTag("requests");

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // The board shows open requests plus ones matched to a provider
    // (IN_PROGRESS / CLOSED) within the last 24h — those linger with a
    // "Tiekėjas rastas" stamp.
    const conditions: Record<string, unknown>[] = [
      {
        OR: [
          { status: "OPEN" },
          { status: { in: ["IN_PROGRESS", "CLOSED"] }, updatedAt: { gte: oneDayAgo } },
        ],
      },
    ];
    if (filters.search) {
      conditions.push({
        OR: [
          { title: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
        ],
      });
    }

    const where: Record<string, unknown> = { AND: conditions, moderationStatus: "APPROVED" };
    if (filters.category) {
      // `?category=<slug>` — resolve a curated slug or a legacy code (via
      // CategoryAlias). A root slug expands to its children so the board
      // shows the whole branch.
      const categoryId = await resolveCategoryParam(filters.category);
      where.categoryId = {
        in: categoryId ? await expandToMatchSet([categoryId]) : ([] as string[]),
      };
    }
    // "Visa Lietuva" is the explicit "all of Lithuania" choice — keep the
    // chip/URL but don't apply a DB filter, so providers see every city.
    if (filters.location && filters.location !== "Visa Lietuva") {
      where.location = filters.location;
    }

    const [requests, total] = await Promise.all([
      prisma.serviceRequest.findMany({
        where,
        select: {
          id: true,
          trackingToken: true,
          title: true,
          description: true,
          categoryRef: { select: { name: true } },
          categories: {
            select: { category: { select: { name: true } } },
            orderBy: { sortOrder: "asc" },
          },
          location: true,
          budget: true,
          clientId: true,
          status: true,
          attachmentUrls: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.serviceRequest.count({ where }),
    ]);

    // Response counts in a single grouped query instead of a correlated
    // subquery per row — much cheaper than Prisma's `_count.responses` for
    // wider result sets.
    const ids = requests.map((r) => r.id);
    const responseCounts =
      ids.length > 0
        ? await prisma.response.groupBy({
            by: ["requestId"],
            where: { requestId: { in: ids } },
            _count: { _all: true },
          })
        : [];
    const countByRequest = new Map(responseCounts.map((g) => [g.requestId, g._count._all]));

    // 'use cache' serializes via JSON, so Dates round-trip as strings.
    // Coerce here so consumers get real Date objects. Prefer the join table
    // for multi-category display; fall back to the legacy single relation
    // for any row written before the multi-category migration.
    const serialized = requests.map(({ categoryRef, categories, ...r }) => {
      const joinedNames = categories
        .map((link) => link.category?.name?.trim() ?? "")
        .filter((name) => name.length > 0);
      const categoryNames = joinedNames.length > 0
        ? joinedNames
        : categoryRef?.name
          ? [categoryRef.name]
          : [];
      return {
        ...r,
        categoryNames,
        createdAt: r.createdAt.toISOString(),
        responseCount: countByRequest.get(r.id) ?? 0,
      };
    });

  return { requests: serialized, total };
}

// Board-wide counters change slowly relative to the listing; cache them
// separately with a longer TTL so the listing doesn't pay for three counts
// (one of them unfiltered on `responses`) on every hit.
async function getBoardStats() {
  "use cache";
  cacheLife({ revalidate: 300 });
  cacheTag("requests");

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [totalActive, newToday, totalProviderResponses] = await Promise.all([
    prisma.serviceRequest.count({ where: { status: "OPEN", moderationStatus: "APPROVED" } }),
    prisma.serviceRequest.count({
      where: { status: "OPEN", moderationStatus: "APPROVED", createdAt: { gte: oneDayAgo } },
    }),
    prisma.response.count(),
  ]);
  return { totalActive, newToday, totalProviderResponses };
}

export default async function PublicRequestsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user?.id ?? null;
  const userRole = session?.user?.role;

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1"));
  const category = params.category || "";
  const location = params.location || "";
  const search = params.search || "";
  const sort = params.sort || "newest";
  const openRequestId = params.open || "";
  const perPage = 20;

  const now = new Date();

  const [{ requests, total }, { totalActive, newToday, totalProviderResponses }, categoryGroups] =
    await Promise.all([
      getBoardListing(page, perPage, { category, location, search }),
      getBoardStats(),
      getServiceCategoryGroups(),
    ]);

  // Client-side sort for response count (kept post-cache so it doesn't bloat the key surface)
  if (sort === "responses-asc") {
    requests.sort((a, b) => a.responseCount - b.responseCount);
  } else if (sort === "responses-desc") {
    requests.sort((a, b) => b.responseCount - a.responseCount);
  }

  const pages = Math.ceil(total / perPage);

  const budgetLabel = (val: string) =>
    BUDGET_OPTIONS.find((b) => b.value === val)?.label || val;

  const hasFilters = category || location || search;

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    const newCategory = overrides.category ?? category;
    const newLocation = overrides.location ?? location;
    const newSearch = overrides.search ?? search;
    const newSort = overrides.sort ?? sort;
    const newPage = overrides.page ?? "1";
    if (newCategory) p.set("category", newCategory);
    if (newLocation) p.set("location", newLocation);
    if (newSearch) p.set("search", newSearch);
    if (newSort && newSort !== "newest") p.set("sort", newSort);
    if (newPage !== "1") p.set("page", newPage);
    const qs = p.toString();
    return `/uzklausos${qs ? `?${qs}` : ""}`;
  }

  function isNew(createdAt: Date | string) {
    return now.getTime() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000;
  }

  function offerNoun(n: number) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 0 || (mod100 >= 11 && mod100 <= 19)) return "pasiūlymų";
    if (mod10 === 1) return "pasiūlymas";
    return "pasiūlymai";
  }

  function competitionLevel(responseCount: number) {
    if (responseCount === 0)
      return {
        label: "Galimybė",
        opportunity: true,
        chip: "bg-[#e6ecd9] text-[#5c6d3b] ring-[#c4d0a6] dark:bg-[#37422a]/50 dark:text-[#bccb9c] dark:ring-[#4c5a36]",
      };
    if (responseCount <= 2)
      return {
        label: "Maža konkurencija",
        opportunity: false,
        chip: "bg-[#e3e8ec] text-[#516678] ring-[#c4cfd6] dark:bg-[#33414c]/50 dark:text-[#aebfca] dark:ring-[#44525d]",
      };
    if (responseCount <= 5)
      return {
        label: "Vidutinė",
        opportunity: false,
        chip: "bg-[#f2e7c9] text-[#896224] ring-[#ddca9c] dark:bg-[#473919]/60 dark:text-[#d8bd80] dark:ring-[#5b4a26]",
      };
    return {
      label: "Didelė konkurencija",
      opportunity: false,
      chip: "bg-[#f0ddd3] text-[#9a4427] ring-[#e0c0b0] dark:bg-[#43271c]/60 dark:text-[#dcab93] dark:ring-[#5c3525]",
    };
  }

  const SORT_OPTIONS = [
    { value: "newest", label: "Naujausios" },
    { value: "responses-asc", label: "Mažiausia konkurencija" },
    { value: "responses-desc", label: "Populiariausios" },
  ];

  const CTA_TONES = [
    "bg-brand-600 hover:bg-brand-700 shadow-[0_2.5px_0_#793821]",
    "bg-[#6f7d4d] hover:bg-[#616d43] shadow-[0_2.5px_0_#4a5430]",
    "bg-[#a17b44] hover:bg-[#8c6a3b] shadow-[0_2.5px_0_#6b5028]",
  ];

  const stats = [
    { value: totalActive, label: "aktyvios užklausos" },
    { value: newToday, label: "naujos šiandien" },
    { value: totalProviderResponses, label: "pateikti pasiūlymai" },
  ];

  return (
    <div className="min-h-screen">
      {/* ── Board header ── */}
      <header className="mx-auto max-w-5xl px-4 pb-6 pt-12 text-center sm:px-6 sm:pt-16">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-brand-600 dark:text-brand-400">
          PaslaugųRinka
        </p>
        <h1 className="mt-2.5 font-serif text-[2.35rem] font-semibold leading-[1.08] tracking-tight text-surface-900 dark:text-white sm:text-[3rem]">
          Užklausų lenta
        </h1>
        <p className="mx-auto mt-3 max-w-md font-serif text-[1.05rem] italic text-surface-500 dark:text-surface-300">
          Raskite darbus ir prisekite savo pasiūlymą prie lentos
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {stats.map((s) => (
            <span
              key={s.label}
              className="inline-flex items-baseline gap-1.5 rounded-md bg-[#efe8d3]/90 px-3 py-1.5 ring-1 ring-inset ring-[#d2c5a1]/70 dark:bg-surface-800/70 dark:ring-surface-700"
            >
              <span className="font-serif text-[1.05rem] font-semibold text-surface-900 dark:text-white">
                {s.value}
              </span>
              <span className="text-[0.72rem] font-medium text-surface-600 dark:text-surface-400">
                {s.label}
              </span>
            </span>
          ))}
        </div>
      </header>

      {/* ── Search + filters ── */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <RequestFilterBar
          activeCategory={category}
          activeLocation={location}
          activeSearch={search}
          activeSort={sort}
          categoryGroups={categoryGroups}
          cities={[...LITHUANIAN_CITIES]}
          sortOptions={SORT_OPTIONS}
          totalResults={total}
        />
      </div>

      {/* ── Pinned notes ── */}
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-7 sm:px-6">
        {requests.length > 0 ? (
          <div className="uzklausa-grid grid gap-7 sm:gap-8">
            {requests.map((r, i) => {
              const competition = competitionLevel(r.responseCount);
              const isMatched = r.status === "IN_PROGRESS" || r.status === "CLOSED";
              const isOwnRequest = !!currentUserId && r.clientId === currentUserId;
              const isOpenedRequest = openRequestId === r.id;
              const ctaHref = isOwnRequest
                ? `/uzklausos/sekti/${r.trackingToken}`
                : userRole === "PROVIDER"
                  ? `/tiekejas/uzklausos/${r.id}`
                  : userRole
                    ? `/tapti-tiekeju`
                    : `/prisijungti?callbackUrl=${encodeURIComponent(`/tiekejas/uzklausos/${r.id}`)}`;
              const ctaLabel = isOwnRequest ? "Valdyti užklausą" : "Pateikti pasiūlymą";
              const ctaTone = isOwnRequest
                ? "bg-[#ebe3cc] text-[#6c5d3c] hover:bg-[#e1d8bd] shadow-[0_2.5px_0_#c7ba92]"
                : `text-white ${CTA_TONES[i % CTA_TONES.length]}`;

              return (
                <article id={`uzklausa-${r.id}`} key={r.id} className="paper-note uzklausa-card scroll-mt-24">
                  <div className="paper-note__shadow">
                    <div className="paper-note__sheet px-6 pb-8 pt-8 sm:px-9">
                      {/* category + competition */}
                      <div className="flex items-start justify-between gap-3">
                        {r.categoryNames.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {r.categoryNames.map((name) => (
                              <span
                                key={name}
                                className="inline-flex items-center rounded-md bg-[#ebe2cb] px-2.5 py-1 font-serif text-[0.78rem] font-medium text-[#6f6042] ring-1 ring-inset ring-[#d3c6a2]/70 dark:bg-surface-800 dark:text-surface-300 dark:ring-surface-700"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                        {!isMatched && (
                          <span
                            className={`uzklausa-card__competition ml-auto inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[0.72rem] font-semibold ring-1 ring-inset ${competition.chip}`}
                          >
                            {competition.opportunity ? (
                              <Sparkles className="h-3 w-3" />
                            ) : (
                              <TrendingUp className="h-3 w-3" />
                            )}
                            {competition.label}
                          </span>
                        )}
                      </div>

                      {/* title */}
                      <h3
                        className={`mt-3.5 font-serif text-[1.5rem] font-semibold leading-snug text-surface-900 dark:text-white sm:text-[1.7rem]${
                          isMatched ? " pr-[96px] sm:pr-[172px]" : ""
                        }`}
                      >
                        {r.title}
                        {isNew(r.createdAt) && !isMatched && (
                          <span className="ml-2 inline-block -rotate-3 rounded border border-brand-500/50 px-1.5 py-0.5 align-middle text-[0.6rem] font-bold uppercase tracking-wider text-brand-600 dark:border-brand-400/50 dark:text-brand-400">
                            Nauja
                          </span>
                        )}
                      </h3>

                      {/* description */}
                      <p className="uzklausa-card__description mt-2 whitespace-pre-wrap text-[0.92rem] leading-relaxed text-surface-600 dark:text-surface-300">
                        {isOpenedRequest ? r.description : truncate(r.description, 150)}
                      </p>

                      {/* attachment photos */}
                      {r.attachmentUrls.length > 0 && (
                        <div className="uzklausa-card__photos mt-4">
                          <PinnedRequestPhotos urls={r.attachmentUrls} title={r.title} />
                        </div>
                      )}

                      {/* divider */}
                      <div className="mt-5 border-t border-[#d8cda6] dark:border-surface-700/70" />

                      {/* meta + cta */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.8rem] text-surface-600 dark:text-surface-300">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-surface-400" />
                            {r.location}
                          </span>
                          {r.budget && (
                            <span className="inline-flex items-center gap-1.5">
                              <Wallet className="h-3.5 w-3.5 text-surface-400" />
                              {budgetLabel(r.budget)}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-surface-400" />
                            {formatRelativeDate(r.createdAt)}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <MessageSquare className="h-3.5 w-3.5 text-surface-400" />
                            {r.responseCount} {offerNoun(r.responseCount)}
                          </span>
                        </div>

                        {isMatched && !isOwnRequest ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#ece6d7] px-4 py-2 font-serif text-[0.9rem] font-medium text-[#9b8f76] cursor-default dark:bg-surface-800 dark:text-surface-500">
                            Pasiūlymai nepriimami
                          </span>
                        ) : (
                          <Link
                            href={ctaHref}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 font-serif text-[0.9rem] font-medium transition-all active:translate-y-[2px] active:shadow-none ${ctaTone}`}
                          >
                            {ctaLabel}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {isMatched && (
                    <span className="found-stamp">
                      <span className="found-stamp__lead">Tiekėjas</span>
                      <span className="found-stamp__main">Rastas</span>
                    </span>
                  )}

                  <span aria-hidden className="pin absolute left-1/2 top-3 -translate-x-1/2" />
                </article>
              );
            })}
          </div>
        ) : (
          <article className="paper-note mx-auto max-w-xl">
            <div className="paper-note__shadow">
              <div className="paper-note__sheet px-8 pb-10 pt-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#ebe2cb] ring-1 ring-inset ring-[#d3c6a2]/70 dark:bg-surface-800 dark:ring-surface-700">
                  <Search className="h-5 w-5 text-surface-400" />
                </div>
                <p className="mt-4 font-serif text-[1.25rem] font-semibold text-surface-900 dark:text-white">
                  {hasFilters ? "Pagal pasirinktus filtrus nieko nerasta" : "Šiuo metu lenta tuščia"}
                </p>
                <p className="mt-1.5 text-[0.9rem] text-surface-600 dark:text-surface-300">
                  {hasFilters
                    ? "Pabandykite pakeisti filtrus"
                    : "Grįžkite netrukus — naujos užklausos prisegamos kasdien"}
                </p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  {hasFilters && (
                    <Link
                      href="/uzklausos"
                      className="inline-flex items-center justify-center rounded-lg bg-[#ebe3cc] px-5 py-2.5 font-serif text-[0.9rem] font-medium text-[#6c5d3c] shadow-[0_2.5px_0_#c7ba92] transition-all hover:bg-[#e1d8bd] active:translate-y-[2px] active:shadow-none"
                    >
                      Išvalyti filtrus
                    </Link>
                  )}
                  <Link
                    href="/tapti-tiekeju"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 font-serif text-[0.9rem] font-medium text-white shadow-[0_2.5px_0_#793821] transition-all hover:bg-brand-700 active:translate-y-[2px] active:shadow-none"
                  >
                    Tapti tiekėju
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            <span aria-hidden className="pin absolute left-1/2 top-3 -translate-x-1/2" />
          </article>
        )}

        {/* pagination */}
        {pages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            {page > 1 && (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                className="rounded-lg bg-[#efe8d3]/90 px-4 py-2 font-serif text-[0.9rem] font-medium text-surface-700 ring-1 ring-inset ring-[#d2c5a1]/70 transition-colors hover:bg-[#e7dec5] dark:bg-surface-800 dark:text-surface-200 dark:ring-surface-700"
              >
                Ankstesnis
              </Link>
            )}
            <span className="px-3 font-serif text-[0.9rem] text-surface-600 dark:text-surface-300">
              {page} / {pages}
            </span>
            {page < pages && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="rounded-lg bg-[#efe8d3]/90 px-4 py-2 font-serif text-[0.9rem] font-medium text-surface-700 ring-1 ring-inset ring-[#d2c5a1]/70 transition-colors hover:bg-[#e7dec5] dark:bg-surface-800 dark:text-surface-200 dark:ring-surface-700"
              >
                Kitas
              </Link>
            )}
          </div>
        )}

        {/* bottom CTA — pinned note */}
        <article className="paper-note mx-auto mt-12 max-w-xl">
          <div className="paper-note__shadow">
            <div className="paper-note__sheet px-8 pb-9 pt-11 text-center">
              <h3 className="font-serif text-[1.4rem] font-semibold text-surface-900 dark:text-white">
                Ieškote daugiau darbų?
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-[0.9rem] text-surface-600 dark:text-surface-300">
                Tapkite tiekėju ir gaukite užklausas tiesiai į savo paskyrą — pasiūlymus pateiksite
                vienu paspaudimu.
              </p>
              <Link
                href="/tapti-tiekeju"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 font-serif text-[0.95rem] font-medium text-white shadow-[0_2.5px_0_#793821] transition-all hover:bg-brand-700 active:translate-y-[2px] active:shadow-none"
              >
                Tapti tiekėju
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <span aria-hidden className="pin absolute left-1/2 top-3 -translate-x-1/2" />
        </article>
      </div>
    </div>
  );
}
