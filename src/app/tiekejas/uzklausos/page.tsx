"use client";

import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { BUDGET_OPTIONS, LITHUANIAN_CITIES } from "@/lib/constants";
import type { ServiceCategoryGroup } from "@/lib/service-categories";
import { formatRelativeDate, truncate, creditsLabel } from "@/lib/utils";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Pagination from "@/components/ui/Pagination";
import {
  MapPin,
  Clock,
  FileText,
  Star,
  Search,
  X,
  ChevronRight,
  Users,
  Zap,
  ArrowDownUp,
  CheckCircle2,
  Wallet,
  SlidersHorizontal,
  Coins,
  Lock,
  LockOpen,
} from "lucide-react";

interface Request {
  id: string;
  title: string;
  description: string;
  categoryRef: { id: string; name: string } | null;
  location: string;
  budget?: string;
  createdAt: string;
  relevance: number;
  hasResponded: boolean;
  isUnlocked: boolean;
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
  const [creditBalance, setCreditBalance] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoryGroups, setCategoryGroups] = useState<ServiceCategoryGroup[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lock body scroll when mobile filter sheet is open
  useEffect(() => {
    if (!filtersOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, [filtersOpen]);

  // Close on Escape
  useEffect(() => {
    if (!filtersOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFiltersOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [filtersOpen]);

  // Curated service taxonomy for the category filter.
  useEffect(() => {
    fetch("/api/service-categories")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setCategoryGroups(data.data || []);
      })
      .catch(() => {});
  }, []);

  const page = parseInt(searchParams.get("page") || "1");
  const category = searchParams.get("category") || "";
  const location = searchParams.get("location") || "";
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "relevance";

  const hasFilters = !!(category || location || search);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
          setCreditBalance(data.data.creditBalance ?? 0);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const now = new Date();
  function isNew(createdAt: string) {
    return now.getTime() - new Date(createdAt).getTime() < 24 * 60 * 60 * 1000;
  }

  const categoryLabel = (slug: string) => {
    for (const group of categoryGroups) {
      const match = group.categories.find((c) => c.slug === slug);
      if (match) return match.name;
    }
    return slug;
  };
  const budgetLabel = (val: string) =>
    BUDGET_OPTIONS.find((b) => b.value === val)?.label || val;

  // Active filter pills for display
  const activeFilters: { key: string; label: string }[] = [];
  if (category) activeFilters.push({ key: "category", label: categoryLabel(category) });
  if (location) activeFilters.push({ key: "location", label: location });
  if (search) activeFilters.push({ key: "search", label: `„${search}"` });

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        {/* Page header */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-surface-900 dark:text-white">
            Klientų užklausos
          </h1>
          <div className="flex items-center gap-2.5">
            <Link
              href="/tiekejas/planai"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-surface-200 bg-surface-50 px-2.5 text-micro font-semibold text-surface-700 transition-colors hover:border-brand-300 hover:text-brand-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
            >
              <Coins className="h-3.5 w-3.5 text-brand-500" />
              {creditBalance} {creditsLabel(creditBalance)}
            </Link>
            <ArrowDownUp className="h-3.5 w-3.5 text-surface-400" />
            <select
              value={sort}
              onChange={(e) => updateFilter("sort", e.target.value)}
              className="h-8 rounded-lg border border-surface-200 bg-surface-50 px-2 pr-7 text-micro font-medium text-surface-600 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_6px_center] bg-no-repeat"
            >
              <option value="relevance">Atitinkančios</option>
              <option value="newest">Naujausios</option>
            </select>
          </div>
        </div>

        {/* Search + filter trigger */}
        <div className="mb-5 space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Ieškoti užklausų..."
                value={searchInput}
                onChange={(e) => handleSearchInput(e.target.value)}
                className="w-full h-11 rounded-xl border border-surface-200 bg-surface-50 pl-10 pr-4 text-body-sm text-surface-900 placeholder:text-surface-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:focus:bg-surface-800"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`relative flex items-center gap-2 h-11 rounded-xl border px-4 text-body-sm font-medium transition-all duration-150 shrink-0 ${
                filtersOpen || activeFilters.length > 0
                  ? "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-400 dark:hover:bg-brand-900"
                  : "border-surface-200 bg-white text-surface-600 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filtrai</span>
              {activeFilters.length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {activeFilters.length}
                </span>
              )}
            </button>
          </div>

          {/* Filter panel — mobile: bottom sheet, desktop: inline dropdown */}
          {filtersOpen && (
            <>
              {/* Mobile backdrop */}
              <div
                className="sm:hidden fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-150"
                onClick={() => setFiltersOpen(false)}
              />
              {/* Mobile bottom sheet */}
              <div className="sm:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-surface-200 bg-white shadow-2xl dark:border-surface-700 dark:bg-surface-900 animate-in slide-in-from-bottom duration-200 max-h-[70vh] flex flex-col">
                <div className="flex justify-center pt-3 pb-1">
                  <div className="h-1 w-10 rounded-full bg-surface-200 dark:bg-surface-700" />
                </div>
                <div className="flex items-center justify-between px-5 pb-3">
                  <h3 className="text-body font-semibold text-surface-900 dark:text-white">Filtrai</h3>
                  <button onClick={() => setFiltersOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                    <X className="h-4 w-4 text-surface-500" />
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 px-5 pb-5 space-y-4">
                  <FilterSelects category={category} location={location} categoryGroups={categoryGroups} onUpdate={updateFilter} />
                  <FilterActions hasFilters={hasFilters} onClear={() => { clearFilters(); setFiltersOpen(false); }} />
                </div>
              </div>
              {/* Desktop inline panel */}
              <div className="hidden sm:block rounded-xl border border-surface-200 bg-white p-4 shadow-sm dark:border-surface-700 dark:bg-surface-900">
                <div className="flex items-end gap-3">
                  <FilterSelects category={category} location={location} categoryGroups={categoryGroups} onUpdate={updateFilter} />
                  <FilterActions hasFilters={hasFilters} onClear={() => { clearFilters(); setFiltersOpen(false); }} />
                </div>
              </div>
            </>
          )}

          {/* Active filter chips + result count */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {activeFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => updateFilter(f.key, "")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 border border-brand-100 px-2.5 py-1 text-caption font-medium text-brand-700 hover:bg-brand-100 transition-colors dark:bg-brand-950 dark:border-brand-900 dark:text-brand-400 dark:hover:bg-brand-900"
                >
                  {f.label}
                  <X className="h-3 w-3" />
                </button>
              ))}
              {activeFilters.length > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-caption text-surface-400 hover:text-surface-600 transition-colors dark:hover:text-surface-300"
                >
                  Išvalyti
                </button>
              )}
            </div>
            {!loading && (
              <p className="text-caption text-surface-400 shrink-0">
                {total === 0 ? "Nerasta" : `${total} ${total === 1 ? "užklausa" : total < 10 ? "užklausos" : "užklausų"}`}
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-surface-300 bg-white p-10 sm:p-14 text-center dark:border-surface-700 dark:bg-surface-900">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-100 dark:bg-surface-800">
              {hasFilters ? <Search className="h-6 w-6 text-surface-400" /> : <FileText className="h-6 w-6 text-surface-400" />}
            </div>
            <h3 className="text-body font-semibold text-surface-900 dark:text-white">
              {hasFilters
                ? "Pagal filtrus užklausų nerasta"
                : "Aktyvių užklausų šiuo metu nėra"}
            </h3>
            <p className="mt-1.5 text-body-sm text-surface-500 dark:text-surface-400 max-w-sm mx-auto">
              {hasFilters
                ? "Pabandykite pakeisti filtrus arba peržiūrėti visas užklausas."
                : "Kai klientai pateiks naujas užklausas, jos atsiras čia."}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-body-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
              >
                Išvalyti filtrus
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Request cards */}
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
                      className={`relative rounded-2xl border bg-white p-5 transition-shadow duration-200 hover:shadow-card dark:bg-surface-900 ${
                        req.hasResponded
                          ? "border-surface-200/40 dark:border-surface-700/30"
                          : isNewRequest
                            ? "border-brand-200 dark:border-brand-800/60"
                            : "border-surface-200/60 dark:border-surface-700/50"
                      } ${req.hasResponded ? "opacity-75 hover:opacity-100" : ""}`}
                    >
                      {/* Top: category + status badges (left), budget (right) */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {req.categoryRef && (
                            <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-micro font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-400">
                              {req.categoryRef.name}
                            </span>
                          )}
                          {!req.isUnlocked ? (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2 py-1 text-micro font-semibold text-white dark:bg-brand-500">
                              <Lock className="h-3 w-3" />
                              Užrakinta
                            </span>
                          ) : !req.hasResponded ? (
                            <span
                              role="img"
                              aria-label="Atrakinta"
                              title="Atrakinta"
                              className="inline-flex items-center"
                            >
                              <LockOpen className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                            </span>
                          ) : null}
                          {isNewRequest && !req.hasResponded && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-micro font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                              <Zap className="h-3 w-3" />
                              Nauja
                            </span>
                          )}
                          {req.relevance >= 2 && !req.hasResponded && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-micro font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                              <Star className="h-3 w-3" />
                              Jums tinka
                            </span>
                          )}
                          {req.hasResponded && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-surface-100 px-2 py-1 text-micro font-medium text-surface-500 dark:bg-surface-800 dark:text-surface-400">
                              <CheckCircle2 className="h-3 w-3" />
                              Atsakyta
                            </span>
                          )}
                        </div>
                        {req.budget && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-surface-50 px-2 py-1 text-micro font-bold text-surface-700 ring-1 ring-inset ring-surface-200/80 dark:bg-surface-800 dark:text-surface-200 dark:ring-surface-700">
                            <Wallet className="h-3 w-3 text-surface-400" />
                            {budgetLabel(req.budget)}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-body font-semibold text-surface-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors leading-snug">
                        {req.title}
                      </h3>

                      {/* Description */}
                      <p className="mt-1 text-body-sm text-surface-500 dark:text-surface-400 line-clamp-2 leading-relaxed">
                        {truncate(req.description, 160)}
                      </p>

                      {/* Footer: meta left, CTA right */}
                      <div className="mt-3 flex items-center justify-between gap-3 pt-3 border-t border-surface-100 dark:border-surface-800">
                        <div className="flex items-center gap-3 text-micro text-surface-400 dark:text-surface-500">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {req.location}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatRelativeDate(req.createdAt)}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 font-medium ${
                              responses === 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : responses <= 2
                                  ? "text-blue-600 dark:text-blue-400"
                                  : "text-surface-400 dark:text-surface-500"
                            }`}
                          >
                            <Users className="h-3.5 w-3.5" />
                            {responses}
                          </span>
                        </div>

                        <span className="inline-flex shrink-0 items-center gap-1 text-micro font-medium text-brand-600 dark:text-brand-400 group-hover:gap-1.5 transition-all">
                          {req.hasResponded ? (
                            "Peržiūrėti"
                          ) : req.isUnlocked ? (
                            "Atsakyti"
                          ) : (
                            <>
                              <Lock className="h-3 w-3" />
                              Atrakinti
                            </>
                          )}
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

/* ─── Filter panel helpers ─── */

const filterSelectClass =
  "h-10 w-full rounded-xl border border-surface-200 bg-white px-3 text-body-sm text-surface-900 appearance-none transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_12px_center] bg-no-repeat pr-10";

function FilterSelects({
  category,
  location,
  categoryGroups,
  onUpdate,
}: {
  category: string;
  location: string;
  categoryGroups: ServiceCategoryGroup[];
  onUpdate: (key: string, value: string) => void;
}) {
  return (
    <>
      <div className="flex-1 min-w-0">
        <label className="text-caption font-medium text-surface-500 dark:text-surface-400 mb-1.5 block">Kategorija</label>
        <select value={category} onChange={(e) => onUpdate("category", e.target.value)} className={filterSelectClass}>
          <option value="">Visos</option>
          {categoryGroups.map((group) => (
            <optgroup key={group.root.id} label={group.root.name}>
              {group.categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="flex-1 min-w-0">
        <label className="text-caption font-medium text-surface-500 dark:text-surface-400 mb-1.5 block">Miestas</label>
        <select value={location} onChange={(e) => onUpdate("location", e.target.value)} className={filterSelectClass}>
          <option value="">Visa Lietuva</option>
          {LITHUANIAN_CITIES.filter((c) => c !== "Visa Lietuva").map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </>
  );
}

function FilterActions({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  if (!hasFilters) return null;
  return (
    <div className="flex items-center pt-4 sm:pt-0">
      <button type="button" onClick={onClear} className="flex-1 sm:flex-none h-10 rounded-xl border border-surface-200 px-4 text-body-sm font-medium text-surface-600 hover:bg-surface-50 transition-colors dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 whitespace-nowrap">
        Išvalyti
      </button>
    </div>
  );
}
