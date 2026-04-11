"use client";

import { useState, useRef, useCallback, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X, Check, Loader2 } from "lucide-react";
import { useProviderFilterStore } from "@/store/useProviderFilterStore";

interface CategoryOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  activeSearch: string;
  categories: CategoryOption[];
  cities: string[];
  serverTotal: number;
}

export default function ProviderFilterBar({
  activeSearch,
  categories,
  cities,
  serverTotal,
}: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const lastPushedSearch = useRef(activeSearch);

  const [searchValue, setSearchValue] = useState(activeSearch);
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Store selectors — client-side filters
  const clientCategory = useProviderFilterStore((s) => s.clientCategory);
  const clientLocation = useProviderFilterStore((s) => s.clientLocation);
  const setClientCategory = useProviderFilterStore((s) => s.setClientCategory);
  const setClientLocation = useProviderFilterStore((s) => s.setClientLocation);
  const clearClientFilters = useProviderFilterStore((s) => s.clearClientFilters);
  const getFilteredProviders = useProviderFilterStore((s) => s.getFilteredProviders);

  const activeFilterCount = [clientCategory, clientLocation].filter(Boolean).length;
  const filteredCount = getFilteredProviders().length;

  // Sync search input when URL param changes externally
  useEffect(() => {
    setSearchValue(activeSearch);
    lastPushedSearch.current = activeSearch;
  }, [activeSearch]);

  // Clear debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Lock body scroll when mobile sheet is open
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const buildUrl = useCallback(
    (overrides: Record<string, string>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(overrides)) {
        if (v) p.set(k, v);
        else p.delete(k);
      }
      // Category/location no longer in URL
      p.delete("category");
      p.delete("location");
      p.delete("page");
      const qs = p.toString();
      return `/tiekejai${qs ? `?${qs}` : ""}`;
    },
    [searchParams]
  );

  function handleSearch(value: string) {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (value === lastPushedSearch.current) return;
      lastPushedSearch.current = value;
      startTransition(() => {
        router.push(buildUrl({ search: value }));
      });
    }, 400);
  }

  function clearAll() {
    clearClientFilters();
    if (activeSearch) {
      startTransition(() => {
        router.push("/tiekejai");
      });
    }
    setSearchValue("");
    lastPushedSearch.current = "";
    setIsOpen(false);
  }

  const categoryLabelFor = (val: string) =>
    categories.find((c) => c.value === val)?.label || val;

  // Show filtered count when client filters are active, otherwise server total
  const displayCount = activeFilterCount > 0 ? filteredCount : serverTotal;

  return (
    <div className="space-y-2">
      {/* Search + Filter button row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Ieškoti tiekėjo..."
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full h-11 rounded-xl border border-surface-200 bg-surface-50 pl-10 pr-4 text-body-sm text-surface-900 placeholder:text-surface-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:focus:bg-surface-800"
          />
          {isPending && (
            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-500 animate-spin" />
          )}
        </div>
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-label={`Filtrai${activeFilterCount > 0 ? ` (${activeFilterCount} aktyvūs)` : ""}`}
            className={`relative flex items-center gap-2 h-11 rounded-xl border px-4 text-body-sm font-medium transition-all duration-150 shrink-0 ${
              isOpen || activeFilterCount > 0
                ? "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-400 dark:hover:bg-brand-900"
                : "border-surface-200 bg-white text-surface-600 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
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

          {/* Desktop dropdown panel */}
          {isOpen && (
            <div
              ref={panelRef}
              className="hidden sm:block absolute right-0 top-full mt-2 w-80 rounded-xl border border-surface-200 bg-white shadow-lg z-50 dark:border-surface-700 dark:bg-surface-900"
            >
              <FilterPanelContent
                categories={categories}
                cities={cities}
                selectedCategory={clientCategory}
                selectedLocation={clientLocation}
                onCategoryChange={setClientCategory}
                onLocationChange={setClientLocation}
                onClear={() => clearClientFilters()}
                onClose={() => setIsOpen(false)}
                filterCount={activeFilterCount}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      {isOpen && (
        <>
          <div
            className="sm:hidden fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
          />
          <div className="sm:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-surface-200 bg-white shadow-2xl dark:border-surface-700 dark:bg-surface-900 animate-in slide-in-from-bottom duration-200 max-h-[75vh] flex flex-col">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-surface-200 dark:bg-surface-700" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3">
              <h3 className="text-body font-semibold text-surface-900 dark:text-white">
                Filtrai
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              >
                <X className="h-4 w-4 text-surface-500" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <FilterPanelContent
                categories={categories}
                cities={cities}
                selectedCategory={clientCategory}
                selectedLocation={clientLocation}
                onCategoryChange={setClientCategory}
                onLocationChange={setClientLocation}
                onClear={() => clearClientFilters()}
                onClose={() => setIsOpen(false)}
                filterCount={activeFilterCount}
              />
            </div>
          </div>
        </>
      )}

      {/* Active filter chips + result count row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {clientCategory && (
            <button
              onClick={() => setClientCategory("")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 border border-brand-100 px-2.5 py-1 text-caption font-medium text-brand-700 hover:bg-brand-100 transition-colors dark:bg-brand-950 dark:border-brand-900 dark:text-brand-400 dark:hover:bg-brand-900"
            >
              {categoryLabelFor(clientCategory)}
              <X className="h-3 w-3" />
            </button>
          )}
          {clientLocation && (
            <button
              onClick={() => setClientLocation("")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 border border-brand-100 px-2.5 py-1 text-caption font-medium text-brand-700 hover:bg-brand-100 transition-colors dark:bg-brand-950 dark:border-brand-900 dark:text-brand-400 dark:hover:bg-brand-900"
            >
              {clientLocation}
              <X className="h-3 w-3" />
            </button>
          )}
          {(activeFilterCount > 0 || activeSearch) && (
            <button
              onClick={clearAll}
              className="text-caption text-surface-400 hover:text-surface-600 transition-colors dark:hover:text-surface-300"
            >
              Išvalyti
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isPending && (
            <Loader2 className="h-3.5 w-3.5 text-brand-500 animate-spin" />
          )}
          <p className="text-caption text-surface-400 shrink-0">
            {displayCount === 0
              ? "Nerasta"
              : `${displayCount} ${displayCount === 1 ? "tiekėjas" : displayCount < 10 ? "tiekėjai" : "tiekėjų"}`}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Filter panel content (shared between desktop dropdown and mobile sheet) ─── */

interface CategoryOption {
  value: string;
  label: string;
}

function FilterPanelContent({
  categories,
  cities,
  selectedCategory,
  selectedLocation,
  onCategoryChange,
  onLocationChange,
  onClear,
  onClose,
  filterCount,
}: {
  categories: CategoryOption[];
  cities: string[];
  selectedCategory: string;
  selectedLocation: string;
  onCategoryChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onClear: () => void;
  onClose: () => void;
  filterCount: number;
}) {
  return (
    <div className="p-4 space-y-4">
      {/* Category select */}
      <div>
        <label className="text-caption font-medium text-surface-500 dark:text-surface-400 mb-2 block">
          Specializacija
        </label>
        <div className="grid grid-cols-2 gap-1 max-h-52 overflow-y-auto overscroll-contain rounded-lg">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => onCategoryChange(isSelected ? "" : cat.value)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-caption font-medium text-left transition-colors ${
                  isSelected
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400"
                    : "text-surface-600 hover:bg-surface-50 dark:text-surface-400 dark:hover:bg-surface-800"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    isSelected
                      ? "border-brand-600 bg-brand-600 dark:border-brand-500 dark:bg-brand-500"
                      : "border-surface-300 dark:border-surface-600"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </span>
                <span className="truncate">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-surface-100 dark:border-surface-800" />

      {/* City select */}
      <div>
        <label className="text-caption font-medium text-surface-500 dark:text-surface-400 mb-2 block">
          Miestas
        </label>
        <div className="grid grid-cols-2 gap-1 max-h-52 overflow-y-auto overscroll-contain rounded-lg">
          {cities.map((city) => {
            const isSelected = selectedLocation === city;
            return (
              <button
                key={city}
                type="button"
                onClick={() => onLocationChange(isSelected ? "" : city)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-caption font-medium text-left transition-colors ${
                  isSelected
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400"
                    : "text-surface-600 hover:bg-surface-50 dark:text-surface-400 dark:hover:bg-surface-800"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    isSelected
                      ? "border-brand-600 bg-brand-600 dark:border-brand-500 dark:bg-brand-500"
                      : "border-surface-300 dark:border-surface-600"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3 text-white" />}
                </span>
                <span className="truncate">{city}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-surface-100 dark:border-surface-800">
        {filterCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="flex-1 h-10 rounded-xl border border-surface-200 text-body-sm font-medium text-surface-600 hover:bg-surface-50 transition-colors dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800"
          >
            Išvalyti
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex-1 h-10 rounded-xl bg-brand-600 text-body-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          Uždaryti
        </button>
      </div>
    </div>
  );
}
