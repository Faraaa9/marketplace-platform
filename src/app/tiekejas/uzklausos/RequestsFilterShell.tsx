"use client";

import { useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { LITHUANIAN_CITIES } from "@/lib/constants";
import type { ServiceCategoryGroup } from "@/lib/service-categories";
import GroupedCategoryPicker from "@/components/categories/GroupedCategoryPicker";
import { Search, X, ArrowDownUp, SlidersHorizontal } from "lucide-react";

/**
 * Client island owning the request-list search / sort / filter state. It pushes
 * all state to the URL; the server `RequestsList` (passed as `children`) reads
 * those params and re-streams on navigation. The credit badge (a server
 * component) is slotted into the header via `creditBadge`.
 */
export default function RequestsFilterShell({
  creditBadge,
  children,
}: {
  creditBadge: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoryGroups, setCategoryGroups] = useState<ServiceCategoryGroup[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lock body scroll when the mobile filter sheet is open.
  useEffect(() => {
    if (!filtersOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [filtersOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!filtersOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFiltersOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [filtersOpen]);

  // Curated service taxonomy for the category filter (cached endpoint).
  useEffect(() => {
    fetch("/api/service-categories")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setCategoryGroups(data.data || []);
      })
      .catch(() => {});
  }, []);

  const category = searchParams.get("category") || "";
  const location = searchParams.get("location") || "";
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "relevance";

  const hasFilters = !!(category || location || search);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchInput(search);
  }, [search]);

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      if (key !== "page") params.delete("page");
      router.push(`/tiekejas/uzklausos?${params}`);
    },
    [router, searchParams],
  );

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (sort !== "relevance") params.set("sort", sort);
    router.push(`/tiekejas/uzklausos?${params}`);
    setSearchInput("");
  }, [router, sort]);

  function handleSearchInput(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateFilter("search", value);
    }, 400);
  }

  const categoryLabel = (slug: string) => {
    for (const group of categoryGroups) {
      const match = group.categories.find((c) => c.slug === slug);
      if (match) return match.name;
    }
    return slug;
  };

  const activeFilters: { key: string; label: string }[] = [];
  if (category) activeFilters.push({ key: "category", label: categoryLabel(category) });
  if (location) activeFilters.push({ key: "location", label: location });
  if (search) activeFilters.push({ key: "search", label: `„${search}"` });

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Page header */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight text-surface-900 sm:text-2xl dark:text-white">
            Užklausos
          </h1>
          <div className="flex items-center gap-2.5">
            {creditBadge}
            <ArrowDownUp className="h-3.5 w-3.5 text-surface-400" />
            <select
              value={sort}
              onChange={(e) => updateFilter("sort", e.target.value)}
              className="h-8 appearance-none rounded-lg border border-surface-200 bg-surface-50 px-2 pr-7 text-micro font-medium text-surface-600 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_6px_center] bg-no-repeat"
            >
              <option value="relevance">Atitinkančios</option>
              <option value="newest">Naujausios</option>
            </select>
          </div>
        </div>

        <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-surface-100 p-1 dark:bg-surface-800">
          <span
            aria-current="page"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center whitespace-nowrap rounded-lg bg-white px-3 text-body-sm font-semibold text-surface-900 shadow-sm sm:flex-none dark:bg-surface-700 dark:text-white"
          >
            Klientų
          </span>
          <Link
            href="/paskyra/uzklausos"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center whitespace-nowrap rounded-lg px-3 text-body-sm font-medium text-surface-500 transition-colors hover:text-surface-700 sm:flex-none dark:text-surface-400 dark:hover:text-surface-200"
          >
            Mano pateiktos
          </Link>
        </div>

        {/* Search + filter trigger */}
        <div className="mb-5 space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                type="text"
                placeholder="Ieškoti užklausų..."
                value={searchInput}
                onChange={(e) => handleSearchInput(e.target.value)}
                className="h-11 w-full rounded-xl border border-surface-200 bg-surface-50 pl-10 pr-4 text-body-sm text-surface-900 transition-all duration-150 placeholder:text-surface-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:focus:bg-surface-800"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`relative flex h-11 shrink-0 items-center gap-2 rounded-xl border px-4 text-body-sm font-medium transition-all duration-150 ${
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
              <div
                className="fixed inset-0 z-40 animate-in bg-black/40 fade-in duration-150 sm:hidden"
                onClick={() => setFiltersOpen(false)}
              />
              <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[70vh] animate-in flex-col rounded-t-2xl border-t border-surface-200 bg-white shadow-2xl duration-200 slide-in-from-bottom sm:hidden dark:border-surface-700 dark:bg-surface-900">
                <div className="flex justify-center pb-1 pt-3">
                  <div className="h-1 w-10 rounded-full bg-surface-200 dark:bg-surface-700" />
                </div>
                <div className="flex items-center justify-between px-5 pb-3">
                  <h3 className="text-body font-semibold text-surface-900 dark:text-white">
                    Filtrai
                  </h3>
                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
                  >
                    <X className="h-4 w-4 text-surface-500" />
                  </button>
                </div>
                <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-5">
                  <FilterSelects
                    category={category}
                    location={location}
                    categoryGroups={categoryGroups}
                    onUpdate={updateFilter}
                  />
                  <FilterActions
                    hasFilters={hasFilters}
                    onClear={() => {
                      clearFilters();
                      setFiltersOpen(false);
                    }}
                  />
                </div>
              </div>
              <div className="hidden rounded-xl border border-surface-200 bg-white p-4 shadow-sm sm:block dark:border-surface-700 dark:bg-surface-900">
                <div className="flex items-end gap-3">
                  <FilterSelects
                    category={category}
                    location={location}
                    categoryGroups={categoryGroups}
                    onUpdate={updateFilter}
                  />
                  <FilterActions
                    hasFilters={hasFilters}
                    onClear={() => {
                      clearFilters();
                      setFiltersOpen(false);
                    }}
                  />
                </div>
              </div>
            </>
          )}

          {/* Active filter chips */}
          <div className="flex flex-wrap items-center gap-2">
            {activeFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => updateFilter(f.key, "")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-100 bg-brand-50 px-2.5 py-1 text-caption font-medium text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-400 dark:hover:bg-brand-900"
              >
                {f.label}
                <X className="h-3 w-3" />
              </button>
            ))}
            {activeFilters.length > 0 && (
              <button
                onClick={clearFilters}
                className="text-caption text-surface-400 transition-colors hover:text-surface-600 dark:hover:text-surface-300"
              >
                Išvalyti
              </button>
            )}
          </div>
        </div>

        {children}
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
      <div className="relative min-w-0 flex-1">
        <label className="mb-1.5 block text-caption font-medium text-surface-500 dark:text-surface-400">
          Kategorija
        </label>
        <GroupedCategoryPicker
          groups={categoryGroups}
          value={category}
          onChange={(v) => onUpdate("category", v)}
          mode="slug"
          placeholder="Visos kategorijos"
        />
      </div>
      <div className="min-w-0 flex-1">
        <label className="mb-1.5 block text-caption font-medium text-surface-500 dark:text-surface-400">
          Miestas
        </label>
        <select
          value={location}
          onChange={(e) => onUpdate("location", e.target.value)}
          className={filterSelectClass}
        >
          <option value="">Visa Lietuva</option>
          {LITHUANIAN_CITIES.filter((c) => c !== "Visa Lietuva").map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
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
      <button
        type="button"
        onClick={onClear}
        className="h-10 flex-1 whitespace-nowrap rounded-xl border border-surface-200 px-4 text-body-sm font-medium text-surface-600 transition-colors hover:bg-surface-50 sm:flex-none dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800"
      >
        Išvalyti
      </button>
    </div>
  );
}
