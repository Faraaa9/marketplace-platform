"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, Search, SlidersHorizontal, X } from "lucide-react";
import type { ServiceCategoryGroup } from "@/lib/service-categories";
import CategoryFilter from "./CategoryFilter";
import CityFilter from "./CityFilter";
import DensityToggle from "./DensityToggle";

interface FilterBarProps {
  activeCategory: string;
  /** Server-resolved name for the active category slug, so the chip renders
   *  correctly before the (lazy-loaded) category tree arrives. */
  activeCategoryName?: string;
  activeLocation: string;
  activeSearch: string;
  activeSort: string;
  cities: string[];
  sortOptions: { value: string; label: string }[];
  totalResults: number;
}

// Cache Components wrap — every useSearchParams caller needs to live inside
// a Suspense, so we put the boundary right here at the component export.
export default function RequestFilterBar(props: FilterBarProps) {
  return (
    <Suspense fallback={null}>
      <RequestFilterBarInner {...props} />
    </Suspense>
  );
}

function RequestFilterBarInner({
  activeCategory,
  activeCategoryName,
  activeLocation,
  activeSearch,
  activeSort,
  cities,
  sortOptions,
  totalResults,
}: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [searchValue, setSearchValue] = useState(activeSearch);
  const [isOpen, setIsOpen] = useState(false);
  // The curated taxonomy is ~4k nodes; serializing it into the board's initial
  // HTML shipped ~2 MB. Instead, fetch it client-side the first time the filter
  // panel opens.
  const [groups, setGroups] = useState<ServiceCategoryGroup[] | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const activeFilterCount = [activeCategory, activeLocation].filter(Boolean).length;

  // Lock body scroll while the mobile sheet is open.
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  // Close on a click outside the trigger, dropdown and sheet.
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      if (sheetRef.current?.contains(target)) return;
      setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const buildUrl = useCallback(
    (overrides: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(overrides)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      params.delete("page");
      const qs = params.toString();
      return `/uzklausos${qs ? `?${qs}` : ""}`;
    },
    [searchParams],
  );

  function handleSearch(value: string) {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.push(buildUrl({ search: value }));
    }, 400);
  }

  function removeFilter(key: string) {
    router.push(buildUrl({ [key]: "" }));
  }

  function clearAll() {
    router.push("/uzklausos");
    setSearchValue("");
    setIsOpen(false);
  }

  function handleSort(value: string) {
    router.push(buildUrl({ sort: value === "newest" ? "" : value }));
  }

  // Lazy-load the category tree the first time the panel opens.
  useEffect(() => {
    if (!isOpen || groups || loadingGroups) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag must flip before the fetch so the guard above blocks re-entry
    setLoadingGroups(true);
    fetch("/api/service-categories")
      .then((r) => r.json())
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) {
          setGroups(json.data as ServiceCategoryGroup[]);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingGroups(false));
  }, [isOpen, groups, loadingGroups]);

  // Prefer the server-resolved name; fall back to the loaded tree once present.
  const categoryLabel = useMemo(() => {
    if (activeCategoryName) return activeCategoryName;
    if (!activeCategory || !groups) return undefined;
    for (const group of groups) {
      for (const cat of group.categories) {
        if (cat.slug === activeCategory) return cat.name;
      }
    }
    return undefined;
  }, [activeCategoryName, activeCategory, groups]);

  const resultLabel =
    totalResults === 0
      ? "Nerasta"
      : `${totalResults} ${
          totalResults === 1
            ? "užklausa"
            : totalResults < 10
              ? "užklausos"
              : "užklausų"
        }`;

  return (
    <div className="space-y-2">
      {/* Search + filter trigger */}
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            placeholder="Ieškoti užklausos..."
            value={searchValue}
            onChange={(event) => handleSearch(event.target.value)}
            className="h-11 w-full rounded-lg border border-surface-200 bg-surface-50 pl-10 pr-4 text-body-sm text-surface-900 placeholder:text-surface-400 transition-all duration-150 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
          />
        </div>
        <CityFilter cities={cities} activeLocation={activeLocation} />
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-label={`Filtrai${activeFilterCount > 0 ? ` (${activeFilterCount} aktyvūs)` : ""}`}
            className={`relative flex h-11 shrink-0 items-center gap-2 rounded-lg border px-4 text-body-sm font-medium transition-all duration-150 ${
              isOpen || activeFilterCount > 0
                ? "border-brand-300 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-400 dark:hover:bg-brand-900"
                : "border-surface-200 bg-surface-50 text-surface-600 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filtrai</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Desktop / tablet dropdown — category picker (+ city below lg) */}
          {isOpen && (
            <div
              ref={panelRef}
              className="absolute right-0 top-full z-50 mt-2 hidden max-h-[72vh] w-96 overflow-y-auto overscroll-contain rounded-xl border border-surface-200 bg-surface-50 shadow-lg dark:border-surface-700 dark:bg-surface-900 sm:block"
            >
              <CategoryFilter
                categoryGroups={groups ?? []}
                activeCategory={activeCategory}
                loading={loadingGroups || !groups}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile sheet — category + city */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 animate-in fade-in duration-150 sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div
            ref={sheetRef}
            className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col rounded-t-2xl border-t border-surface-200 bg-surface-50 shadow-2xl animate-in slide-in-from-bottom duration-200 dark:border-surface-700 dark:bg-surface-900 sm:hidden"
          >
            <div className="flex justify-center pb-1 pt-3">
              <div className="h-1 w-10 rounded-full bg-surface-200 dark:bg-surface-700" />
            </div>
            <div className="flex items-center justify-between px-5 pb-1">
              <h3 className="text-body font-semibold text-surface-900 dark:text-white">
                Filtrai
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Uždaryti"
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
              >
                <X className="h-4 w-4 text-surface-500" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <CategoryFilter
                categoryGroups={groups ?? []}
                activeCategory={activeCategory}
                loading={loadingGroups || !groups}
              />
            </div>
            <div className="border-t border-surface-100 p-3 dark:border-surface-800">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-11 w-full rounded-xl bg-brand-600 text-body-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                {totalResults === 0 ? "Uždaryti" : `Rodyti ${resultLabel}`}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Active filters + sort + result count */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {activeCategory && (
            <button
              type="button"
              onClick={() => removeFilter("category")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-100 bg-brand-50 px-2.5 py-1 text-caption font-medium text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-400 dark:hover:bg-brand-900"
            >
              {categoryLabel || activeCategory}
              <X className="h-3 w-3" />
            </button>
          )}
          {activeLocation && (
            <button
              type="button"
              onClick={() => removeFilter("location")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-100 bg-brand-50 px-2.5 py-1 text-caption font-medium text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-400 dark:hover:bg-brand-900"
            >
              {activeLocation}
              <X className="h-3 w-3" />
            </button>
          )}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-caption text-surface-400 transition-colors hover:text-surface-600 dark:hover:text-surface-300"
            >
              Išvalyti
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <DensityToggle />
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-surface-400" />
            <div className="flex gap-1">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSort(opt.value)}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 font-serif text-caption transition-all ${
                    activeSort === opt.value
                      ? "bg-surface-50 font-semibold text-surface-900 shadow-sm ring-1 ring-inset ring-surface-200 dark:bg-surface-800 dark:text-white dark:ring-surface-600"
                      : "font-medium text-surface-500 hover:bg-surface-50/70 hover:text-surface-800 dark:hover:bg-surface-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-caption text-surface-400">{resultLabel}</p>
        </div>
      </div>
    </div>
  );
}
