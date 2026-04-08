"use client";

import { useEffect, useState, useMemo, Suspense, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { SERVICE_CATEGORIES, BUDGET_OPTIONS, LITHUANIAN_CITIES } from "@/lib/constants";
import { formatRelativeDate, truncate } from "@/lib/utils";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Pagination from "@/components/ui/Pagination";
import {
  MapPin,
  Clock,
  FileText,
  Star,
  Search,
  X,
  Sparkles,
  ChevronRight,
  Flame,
  Users,
  Zap,
  ArrowDownUp,
} from "lucide-react";

interface Request {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  budget?: string;
  createdAt: string;
  relevance: number;
  _count: { responses: number };
}

export default function ProviderRequestsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProviderRequestsContent />
    </Suspense>
  );
}

function ProviderRequestsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const page = parseInt(searchParams.get("page") || "1");
  const category = searchParams.get("category") || "";
  const location = searchParams.get("location") || "";
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "relevance";

  const hasFilters = !!(category || location || search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const fetchRequests = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (category) params.set("category", category);
    if (location) params.set("location", location);
    if (search) params.set("search", search);
    if (sort && sort !== "relevance") params.set("sort", sort);

    fetch(`/api/tiekejas/uzklausos?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setRequests(data.data.requests);
          setTotal(data.data.total);
          setPages(data.data.pages);
        } else if (
          data.code === "EMAIL_NOT_VERIFIED" ||
          data.code === "ACCOUNT_NOT_ACTIVE"
        ) {
          router.push("/tiekejas");
        }
      })
      .finally(() => setLoading(false));
  }, [page, category, location, search, sort, router]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.delete("page");
    router.push(`/tiekejas/uzklausos?${params}`);
  }

  function clearFilters() {
    const params = new URLSearchParams();
    if (sort !== "relevance") params.set("sort", sort);
    router.push(`/tiekejas/uzklausos?${params}`);
    setSearchInput("");
  }

  function handleSearchInput(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateFilter("search", value);
    }, 400);
  }

  function isNew(createdAt: string) {
    return Date.now() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000;
  }

  // Summary stats derived from loaded requests (current page view)
  const stats = useMemo(() => {
    const newCount = requests.filter((r) => isNew(r.createdAt)).length;
    const matchCount = requests.filter((r) => r.relevance >= 2).length;
    const lowCompetition = requests.filter(
      (r) => r._count.responses <= 2
    ).length;
    return { newCount, matchCount, lowCompetition };
  }, [requests]);

  const categoryLabel = (val: string) =>
    SERVICE_CATEGORIES.find((c) => c.value === val)?.label || val;
  const budgetLabel = (val: string) =>
    BUDGET_OPTIONS.find((b) => b.value === val)?.label || val;

  // Active filter pills for display
  const activeFilters: { key: string; label: string; value: string }[] = [];
  if (category)
    activeFilters.push({
      key: "category",
      label: categoryLabel(category),
      value: category,
    });
  if (location)
    activeFilters.push({ key: "location", label: location, value: location });
  if (search)
    activeFilters.push({
      key: "search",
      label: `„${search}"`,
      value: search,
    });

  const selectClass =
    "h-10 w-full rounded-xl border border-surface-200 bg-white px-3 text-body-sm text-surface-900 appearance-none transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_12px_center] bg-no-repeat pr-10";

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* ─── Page header ─── */}
      <div className="border-b border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-surface-900 dark:text-white">
            Aktyvios užklausos
          </h1>
          <p className="mt-1 text-body-sm text-surface-500 dark:text-surface-400">
            Raskite tinkamas užklausas ir pateikite savo pasiūlymą
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        {/* ─── Control bar ─── */}
        <div className="rounded-2xl border border-surface-200/60 bg-white shadow-sm dark:border-surface-700/50 dark:bg-surface-900 mb-5">
          {/* Search row */}
          <div className="p-4 pb-0">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Ieškoti pagal pavadinimą ar aprašymą..."
                value={searchInput}
                onChange={(e) => handleSearchInput(e.target.value)}
                className="w-full h-11 rounded-xl border border-surface-200 bg-surface-50 pl-10 pr-4 text-body-sm text-surface-900 placeholder:text-surface-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:focus:bg-surface-800"
              />
            </div>
          </div>

          {/* Filters row */}
          <div className="p-4 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={category}
                onChange={(e) => updateFilter("category", e.target.value)}
                className={selectClass}
              >
                <option value="">Visos kategorijos</option>
                {SERVICE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>

              <select
                value={location}
                onChange={(e) => updateFilter("location", e.target.value)}
                className={selectClass}
              >
                <option value="">Visi miestai</option>
                {LITHUANIAN_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <select
                  value={sort}
                  onChange={(e) => updateFilter("sort", e.target.value)}
                  className={selectClass}
                >
                  <option value="relevance">Atitinkančios</option>
                  <option value="newest">Naujausios</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active filters pills */}
          {activeFilters.length > 0 && (
            <div className="px-4 pb-4 pt-0 flex flex-wrap items-center gap-2 border-t border-surface-100 dark:border-surface-800 mt-0 pt-3">
              <span className="text-micro text-surface-400">Aktyvūs:</span>
              {activeFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => updateFilter(f.key, "")}
                  className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-2.5 py-1 text-micro font-medium text-brand-700 hover:bg-brand-100 transition-colors dark:bg-brand-950 dark:border-brand-800 dark:text-brand-400 dark:hover:bg-brand-900"
                >
                  {f.label}
                  <X className="h-3 w-3" />
                </button>
              ))}
              <button
                onClick={clearFilters}
                className="text-micro text-surface-500 hover:text-surface-700 underline underline-offset-2 transition-colors dark:text-surface-400 dark:hover:text-surface-200"
              >
                Išvalyti viską
              </button>
            </div>
          )}
        </div>

        {/* ─── Summary stats ─── */}
        {!loading && requests.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <StatCard
              icon={<FileText className="h-4 w-4" />}
              value={total}
              label="Aktyvios"
              color="text-surface-600 dark:text-surface-300"
              bg="bg-surface-100 dark:bg-surface-800"
            />
            <StatCard
              icon={<Sparkles className="h-4 w-4" />}
              value={stats.newCount}
              label="Naujos (24h)"
              color="text-emerald-600 dark:text-emerald-400"
              bg="bg-emerald-50 dark:bg-emerald-500/10"
            />
            <StatCard
              icon={<Star className="h-4 w-4" />}
              value={stats.matchCount}
              label="Jums tinka"
              color="text-brand-600 dark:text-brand-400"
              bg="bg-brand-50 dark:bg-brand-500/10"
            />
            <StatCard
              icon={<Flame className="h-4 w-4" />}
              value={stats.lowCompetition}
              label="Maža konkurencija"
              color="text-amber-600 dark:text-amber-400"
              bg="bg-amber-50 dark:bg-amber-500/10"
            />
          </div>
        )}

        {/* ─── Content ─── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-surface-300 bg-white p-16 text-center dark:border-surface-700 dark:bg-surface-900">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-100 dark:bg-surface-800">
              <FileText className="h-8 w-8 text-surface-400 dark:text-surface-500" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
              {hasFilters
                ? "Pagal jūsų filtrus užklausų nerasta"
                : "Aktyvių užklausų šiuo metu nėra"}
            </h3>
            <p className="mt-2 text-body-sm text-surface-500 dark:text-surface-400 max-w-sm mx-auto">
              {hasFilters
                ? "Pabandykite pakeisti arba pašalinti filtrus."
                : "Kai klientai pateiks naujas užklausas, jos atsiras čia."}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-body-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
              >
                <X className="h-4 w-4" />
                Išvalyti filtrus
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Result count + sort indicator */}
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-micro text-surface-400 dark:text-surface-500">
                {total} {total === 1 ? "užklausa" : "užklausos"}
              </p>
              <div className="flex items-center gap-1 text-micro text-surface-400 dark:text-surface-500">
                <ArrowDownUp className="h-3 w-3" />
                {sort === "newest" ? "Naujausios" : "Pagal atitikimą"}
              </div>
            </div>

            {/* ─── Request cards ─── */}
            <div className="space-y-3">
              {requests.map((req) => {
                const isNewRequest = isNew(req.createdAt);
                const responses = req._count.responses;

                return (
                  <Link
                    key={req.id}
                    href={`/tiekejas/uzklausos/${req.id}`}
                    className="group block"
                  >
                    <article
                      className={`relative rounded-2xl border bg-white p-5 sm:p-6 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 dark:bg-surface-900 ${
                        isNewRequest
                          ? "border-brand-200 dark:border-brand-800/60"
                          : "border-surface-200/60 dark:border-surface-700/50"
                      }`}
                    >
                      {/* Top row: badges + budget */}
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          {/* Category — clickable */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              updateFilter(
                                "category",
                                category === req.category ? "" : req.category
                              );
                            }}
                            className={`inline-flex items-center rounded-lg px-2.5 py-1 text-micro font-semibold transition-colors ${
                              category === req.category
                                ? "bg-brand-600 text-white shadow-sm"
                                : "bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-400 dark:hover:bg-brand-900"
                            }`}
                          >
                            {categoryLabel(req.category)}
                          </button>

                          {/* Location — clickable */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              updateFilter(
                                "location",
                                location === req.location ? "" : req.location
                              );
                            }}
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-micro font-medium transition-colors ${
                              location === req.location
                                ? "bg-surface-800 text-white dark:bg-surface-200 dark:text-surface-900"
                                : "bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700"
                            }`}
                          >
                            <MapPin className="h-3 w-3" />
                            {req.location}
                          </button>

                          {isNewRequest && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-micro font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                              <Zap className="h-3 w-3" />
                              Nauja
                            </span>
                          )}

                          {req.relevance >= 2 && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-micro font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                              <Star className="h-3 w-3" />
                              Jums
                            </span>
                          )}
                        </div>

                        {/* Budget — prominent on right */}
                        {req.budget && (
                          <span className="shrink-0 rounded-lg bg-surface-50 px-3 py-1.5 text-body-sm font-bold text-surface-900 dark:bg-surface-800 dark:text-white">
                            {budgetLabel(req.budget)}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-body sm:text-lg font-semibold text-surface-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors leading-snug">
                        {req.title}
                      </h3>

                      {/* Description */}
                      <p className="mt-1.5 text-body-sm text-surface-500 dark:text-surface-400 line-clamp-2 leading-relaxed">
                        {truncate(req.description, 180)}
                      </p>

                      {/* Footer: meta + CTA */}
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 text-micro text-surface-400 dark:text-surface-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatRelativeDate(req.createdAt)}
                          </span>

                          <span
                            className={`inline-flex items-center gap-1 font-medium ${
                              responses === 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : responses <= 2
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-surface-400 dark:text-surface-500"
                            }`}
                          >
                            <Users className="h-3.5 w-3.5" />
                            {responses === 0
                              ? "Nėra pasiūlymų"
                              : `${responses} pasiūl.`}
                          </span>
                        </div>

                        <span className="hidden sm:inline-flex items-center gap-1 text-micro font-medium text-brand-600 group-hover:gap-2 transition-all dark:text-brand-400">
                          Peržiūrėti
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>

            <Pagination
              currentPage={page}
              totalPages={pages}
              onPageChange={(p) => updateFilter("page", String(p))}
              className="mt-8"
            />
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Stat card component ─── */
function StatCard({
  icon,
  value,
  label,
  color,
  bg,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-surface-200/60 bg-white p-3 sm:p-4 dark:border-surface-700/50 dark:bg-surface-900">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}
      >
        <span className={color}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className={`text-lg font-bold leading-none ${color}`}>{value}</p>
        <p className="text-micro text-surface-400 dark:text-surface-500 mt-0.5 truncate">
          {label}
        </p>
      </div>
    </div>
  );
}
