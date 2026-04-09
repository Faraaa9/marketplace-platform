import type { Metadata } from "next";
import Link from "next/link";
import { SERVICE_CATEGORIES, LITHUANIAN_CITIES, BUDGET_OPTIONS } from "@/lib/constants";
import { formatRelativeDate, truncate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import {
  MapPin, Clock, MessageSquare, ArrowRight, Search,
  SlidersHorizontal, Zap, FileText, Users, Wallet,
  TrendingUp, ArrowUpDown, Sparkles, Briefcase,
} from "lucide-react";
import SearchInput from "@/components/uzklausos/SearchInput";

export const metadata: Metadata = {
  title: "Viešos užklausos — PaslaugųRinka",
  description:
    "Peržiūrėkite aktyvias paslaugų užklausas Lietuvoje. Raskite darbus ir pateikite pasiūlymus.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
    location?: string;
    search?: string;
    budget?: string;
    sort?: string;
  }>;
}

export default async function PublicRequestsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1"));
  const category = params.category || "";
  const location = params.location || "";
  const search = params.search || "";
  const budget = params.budget || "";
  const sort = params.sort || "newest";
  const perPage = 20;

  const where: Record<string, unknown> = { status: "OPEN" };
  if (category) where.category = category;
  if (location) where.location = location;
  if (budget) where.budget = budget;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  // Sort options
  let orderBy: Record<string, string> = { createdAt: "desc" };
  if (sort === "responses-asc" || sort === "responses-desc") {
    orderBy = { createdAt: "desc" };
  }

  const [requests, total] = await Promise.all([
    prisma.serviceRequest.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        location: true,
        budget: true,
        createdAt: true,
        _count: { select: { responses: true } },
      },
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.serviceRequest.count({ where }),
  ]);

  // Client-side sort for response count
  if (sort === "responses-asc") {
    requests.sort((a, b) => a._count.responses - b._count.responses);
  } else if (sort === "responses-desc") {
    requests.sort((a, b) => b._count.responses - a._count.responses);
  }

  const pages = Math.ceil(total / perPage);

  const categoryLabel = (val: string) =>
    SERVICE_CATEGORIES.find((c) => c.value === val)?.label || val;

  const budgetLabel = (val: string) =>
    BUDGET_OPTIONS.find((b) => b.value === val)?.label || val;

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    const newCategory = overrides.category ?? category;
    const newLocation = overrides.location ?? location;
    const newSearch = overrides.search ?? search;
    const newBudget = overrides.budget ?? budget;
    const newSort = overrides.sort ?? sort;
    const newPage = overrides.page ?? "1";
    if (newCategory) p.set("category", newCategory);
    if (newLocation) p.set("location", newLocation);
    if (newSearch) p.set("search", newSearch);
    if (newBudget) p.set("budget", newBudget);
    if (newSort && newSort !== "newest") p.set("sort", newSort);
    if (newPage !== "1") p.set("page", newPage);
    const qs = p.toString();
    return `/uzklausos${qs ? `?${qs}` : ""}`;
  }

  const hasFilters = category || location || search || budget;
  const activeFilterCount = [category, location, search, budget].filter(Boolean).length;

  // Stats for social proof
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [totalActive, newToday, totalProviderResponses] = await Promise.all([
    prisma.serviceRequest.count({ where: { status: "OPEN" } }),
    prisma.serviceRequest.count({ where: { status: "OPEN", createdAt: { gte: oneDayAgo } } }),
    prisma.response.count(),
  ]);

  function isNew(createdAt: Date) {
    return now.getTime() - createdAt.getTime() < 24 * 60 * 60 * 1000;
  }

  function competitionLevel(responseCount: number) {
    if (responseCount === 0) return { label: "Galimybė!", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" };
    if (responseCount <= 2) return { label: "Maža konkurencija", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" };
    if (responseCount <= 5) return { label: "Vidutinė", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" };
    return { label: "Didelė konkurencija", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10" };
  }

  const SORT_OPTIONS = [
    { value: "newest", label: "Naujausios" },
    { value: "responses-asc", label: "Mažiausia konkurencija" },
    { value: "responses-desc", label: "Populiariausios" },
  ];

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* Header */}
      <div className="relative overflow-hidden bg-white dark:bg-surface-900 border-b border-surface-200/50 dark:border-surface-800/50">
        <div className="absolute inset-0 bg-radial-brand-subtle" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950">
              <Briefcase className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">
              Aktyvios užklausos
            </h1>
          </div>
          <p className="text-body text-surface-500 dark:text-surface-400 ml-[52px]">
            Raskite darbus ir pateikite savo pasiūlymą
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats bar — responsive: stack on small, row on sm+ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="flex items-center gap-3 rounded-xl border border-surface-200/60 bg-white px-4 py-3.5 dark:border-surface-700/50 dark:bg-surface-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950">
              <FileText className="h-4 w-4 text-brand-500" />
            </div>
            <div>
              <p className="text-heading-3 font-bold text-surface-900 dark:text-white">{totalActive}</p>
              <p className="text-micro text-surface-400">Aktyvios užklausos</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-surface-200/60 bg-white px-4 py-3.5 dark:border-surface-700/50 dark:bg-surface-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
              <Zap className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-heading-3 font-bold text-surface-900 dark:text-white">{newToday}</p>
              <p className="text-micro text-surface-400">Naujos šiandien</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-surface-200/60 bg-white px-4 py-3.5 dark:border-surface-700/50 dark:bg-surface-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-500/10">
              <Users className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-heading-3 font-bold text-surface-900 dark:text-white">{totalProviderResponses}</p>
              <p className="text-micro text-surface-400">Pateikti pasiūlymai</p>
            </div>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="rounded-2xl border border-surface-200/60 bg-white p-5 mb-8 dark:border-surface-700/50 dark:bg-surface-900/50">
          <div className="mb-4">
            <SearchInput defaultValue={search} />
          </div>

          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal className="h-4 w-4 text-surface-400" />
            <span className="text-body-sm font-medium text-surface-600 dark:text-surface-300">Filtrai</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
            {hasFilters && (
              <Link
                href={buildUrl({ category: "", location: "", search: "", budget: "", page: "1" })}
                className="ml-auto text-micro text-brand-600 hover:text-brand-700 font-medium"
              >
                Išvalyti filtrus
              </Link>
            )}
          </div>

          {/* Category filter */}
          <div className="mb-4">
            <span className="text-micro font-medium text-surface-400 uppercase tracking-wider mb-2 block">Kategorija</span>
            <div className="flex flex-wrap gap-1.5">
              <Link
                href={buildUrl({ category: "", page: "1" })}
                className={`rounded-lg px-3 py-1.5 text-caption font-medium transition-all duration-200 ${
                  !category
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
                }`}
              >
                Visos
              </Link>
              {SERVICE_CATEGORIES.map((cat) => (
                <Link
                  key={cat.value}
                  href={buildUrl({ category: cat.value, page: "1" })}
                  className={`rounded-lg px-3 py-1.5 text-caption font-medium transition-all duration-200 ${
                    category === cat.value
                      ? "bg-brand-600 text-white shadow-sm"
                      : "bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
                  }`}
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Location + Budget side by side on larger screens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Location filter */}
            <div>
              <span className="text-micro font-medium text-surface-400 uppercase tracking-wider mb-2 block">Miestas</span>
              <div className="flex flex-wrap gap-1.5">
                <Link
                  href={buildUrl({ location: "", page: "1" })}
                  className={`rounded-lg px-3 py-1.5 text-caption font-medium transition-all duration-200 ${
                    !location
                      ? "bg-brand-600 text-white shadow-sm"
                      : "bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
                  }`}
                >
                  Visi
                </Link>
                {LITHUANIAN_CITIES.map((city) => (
                  <Link
                    key={city}
                    href={buildUrl({ location: city, page: "1" })}
                    className={`rounded-lg px-3 py-1.5 text-caption font-medium transition-all duration-200 ${
                      location === city
                        ? "bg-brand-600 text-white shadow-sm"
                        : "bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
                    }`}
                  >
                    {city}
                  </Link>
                ))}
              </div>
            </div>

            {/* Budget filter */}
            <div>
              <span className="text-micro font-medium text-surface-400 uppercase tracking-wider mb-2 block">Biudžetas</span>
              <div className="flex flex-wrap gap-1.5">
                <Link
                  href={buildUrl({ budget: "", page: "1" })}
                  className={`rounded-lg px-3 py-1.5 text-caption font-medium transition-all duration-200 ${
                    !budget
                      ? "bg-brand-600 text-white shadow-sm"
                      : "bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
                  }`}
                >
                  Visi
                </Link>
                {BUDGET_OPTIONS.map((b) => (
                  <Link
                    key={b.value}
                    href={buildUrl({ budget: b.value, page: "1" })}
                    className={`rounded-lg px-3 py-1.5 text-caption font-medium transition-all duration-200 ${
                      budget === b.value
                        ? "bg-brand-600 text-white shadow-sm"
                        : "bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
                    }`}
                  >
                    {b.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results count + sort */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <p className="text-body-sm text-surface-500 dark:text-surface-400">
            {total === 0
              ? "Užklausų nerasta"
              : `Rasta: ${total} ${total === 1 ? "užklausa" : total < 10 ? "užklausos" : "užklausų"}`}
          </p>
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-surface-400 shrink-0" />
            <div className="flex gap-1 flex-wrap">
              {SORT_OPTIONS.map((opt) => (
                <Link
                  key={opt.value}
                  href={buildUrl({ sort: opt.value, page: "1" })}
                  className={`rounded-lg px-2.5 py-1.5 text-caption font-medium transition-all whitespace-nowrap ${
                    sort === opt.value
                      ? "bg-brand-600 text-white"
                      : "text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800"
                  }`}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Request cards */}
        {requests.length > 0 ? (
          <div className="grid gap-4">
            {requests.map((r) => {
              const competition = competitionLevel(r._count.responses);
              return (
                <article
                  key={r.id}
                  className="group rounded-2xl border border-surface-200/60 bg-white p-5 sm:p-6 transition-all duration-200 hover:shadow-lg hover:border-brand-200/60 dark:border-surface-700/50 dark:bg-surface-900/50 dark:hover:border-brand-700/50"
                >
                  {/* Top row: category chip + competition badge */}
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-micro font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                      {categoryLabel(r.category)}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-micro font-medium ${competition.bg} ${competition.color}`}>
                      {r._count.responses === 0 ? (
                        <Sparkles className="h-3 w-3" />
                      ) : (
                        <TrendingUp className="h-3 w-3" />
                      )}
                      {competition.label}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white mb-1.5 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {r.title}
                    {isNew(r.createdAt) && (
                      <span className="ml-2 inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-micro font-semibold text-emerald-700 align-middle dark:bg-emerald-500/10 dark:text-emerald-400">
                        <Zap className="h-2.5 w-2.5" />
                        Nauja
                      </span>
                    )}
                  </h3>

                  {/* Description */}
                  <p className="text-body-sm text-surface-500 dark:text-surface-400 leading-relaxed mb-3">
                    {truncate(r.description, 150)}
                  </p>

                  {/* Meta row + CTA */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-surface-100 dark:border-surface-800">
                    <div className="flex flex-wrap items-center gap-2.5 text-micro text-surface-400">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {r.location}
                      </span>
                      {r.budget && (
                        <span className="inline-flex items-center gap-1">
                          <Wallet className="h-3.5 w-3.5" />
                          {budgetLabel(r.budget)}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatRelativeDate(r.createdAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {r._count.responses} {r._count.responses === 1 ? "pasiūlymas" : r._count.responses < 10 ? "pasiūlymai" : "pasiūlymų"}
                      </span>
                    </div>
                    <Link
                      href="/prisijungti"
                      className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-micro font-semibold text-white hover:bg-brand-700 transition-colors shadow-sm"
                    >
                      Pateikti pasiūlymą
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-surface-300 bg-white p-12 sm:p-16 text-center dark:border-surface-700 dark:bg-surface-900">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-100 dark:bg-surface-800">
              <Search className="h-6 w-6 text-surface-400" />
            </div>
            <p className="text-body font-medium text-surface-600 dark:text-surface-300">
              {hasFilters ? "Užklausų pagal pasirinktus filtrus nerasta" : "Šiuo metu aktyvių užklausų nėra"}
            </p>
            <p className="mt-1 text-body-sm text-surface-400">
              {hasFilters ? "Pabandykite pakeisti filtrus" : "Grįžkite netrukus — naujos užklausos pateikiamos kiekvieną dieną"}
            </p>
            <div className="mt-5 flex flex-col sm:flex-row justify-center gap-3">
              {hasFilters && (
                <Link
                  href="/uzklausos"
                  className="inline-flex items-center justify-center rounded-xl border border-surface-200 bg-white px-5 py-2.5 text-body-sm font-medium text-surface-600 hover:bg-surface-50 transition-all dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
                >
                  Išvalyti filtrus
                </Link>
              )}
              <Link
                href="/tapti-tiekeju"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-body-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-all"
              >
                Tapti tiekėju
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
                className="rounded-xl border border-surface-200 bg-white px-5 py-2.5 text-body-sm font-medium text-surface-600 hover:bg-surface-50 hover:border-surface-300 transition-all dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
              >
                Ankstesnis
              </Link>
            )}
            <span className="flex items-center px-4 text-body-sm text-surface-500 font-medium">
              {page} / {pages}
            </span>
            {page < pages && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="rounded-xl border border-surface-200 bg-white px-5 py-2.5 text-body-sm font-medium text-surface-600 hover:bg-surface-50 hover:border-surface-300 transition-all dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
              >
                Kitas
              </Link>
            )}
          </div>
        )}

        {/* Bottom CTA — provider-facing */}
        <div className="mt-12 rounded-2xl border border-brand-200/60 bg-gradient-to-br from-brand-50/80 to-white p-8 sm:p-10 dark:border-brand-800/40 dark:from-brand-950/50 dark:to-surface-900/50">
          <div className="text-center max-w-lg mx-auto">
            <h3 className="text-heading-3 font-bold text-surface-900 dark:text-white mb-2">
              Ieškote daugiau darbų?
            </h3>
            <p className="text-body-sm text-surface-500 dark:text-surface-400 mb-5">
              Tapkite tiekėju ir gaukite užklausas tiesiai į savo paskyrą. Pasiūlymus pateiksite vienu paspaudimu.
            </p>
            <Link
              href="/tapti-tiekeju"
              className="group inline-flex items-center rounded-2xl bg-brand-600 px-6 py-3 text-body font-semibold text-white shadow-sm hover:bg-brand-700 hover:shadow-md transition-all"
            >
              Tapti tiekėju
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
