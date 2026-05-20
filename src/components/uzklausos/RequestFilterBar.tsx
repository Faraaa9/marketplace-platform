"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X, Check, ArrowUpDown } from "lucide-react";

interface CategoryOption {
  value: string;
  label: string;
}

interface BudgetOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  activeCategory: string;
  activeLocation: string;
  activeSearch: string;
  activeBudget: string;
  activeSort: string;
  categories: CategoryOption[];
  cities: string[];
  budgets: BudgetOption[];
  sortOptions: { value: string; label: string }[];
  totalResults: number;
}

export default function RequestFilterBar({
  activeCategory,
  activeLocation,
  activeSearch,
  activeBudget,
  activeSort,
  categories,
  cities,
  budgets,
  sortOptions,
  totalResults,
}: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const [searchValue, setSearchValue] = useState(activeSearch);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingCategory, setPendingCategory] = useState(activeCategory);
  const [pendingLocation, setPendingLocation] = useState(activeLocation);
  const [pendingBudget, setPendingBudget] = useState(activeBudget);

  const activeFilterCount = [activeCategory, activeLocation, activeBudget].filter(Boolean).length;

  // Sync pending state when URL params change
  useEffect(() => {
    setPendingCategory(activeCategory);
    setPendingLocation(activeLocation);
    setPendingBudget(activeBudget);
  }, [activeCategory, activeLocation, activeBudget]);

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
      p.delete("page");
      const qs = p.toString();
      return `/uzklausos${qs ? `?${qs}` : ""}`;
    },
    [searchParams]
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

  function applyFilters() {
    router.push(
      buildUrl({
        category: pendingCategory,
        location: pendingLocation,
        budget: pendingBudget,
      })
    );
    setIsOpen(false);
  }

  function clearPending() {
    setPendingCategory("");
    setPendingLocation("");
    setPendingBudget("");
  }

  function handleSort(value: string) {
    router.push(buildUrl({ sort: value === "newest" ? "" : value }));
  }

  const pendingChanged =
    pendingCategory !== activeCategory ||
    pendingLocation !== activeLocation ||
    pendingBudget !== activeBudget;
  const pendingCount = [pendingCategory, pendingLocation, pendingBudget].filter(Boolean).length;

  const categoryLabel = categories.find((c) => c.value === activeCategory)?.label;
  const budgetLabelActive = budgets.find((b) => b.value === activeBudget)?.label;

  return (
    <div className="space-y-2">
      {/* Search + Filter button + Sort row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Ieškoti užklausos..."
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full h-11 rounded-lg border border-[#cdc09f] bg-[#fbfaf6] pl-10 pr-4 text-body-sm text-surface-900 placeholder:text-surface-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/25 focus:border-brand-500 focus:bg-white dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
          />
        </div>
        <div className="relative">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-label={`Filtrai${activeFilterCount > 0 ? ` (${activeFilterCount} aktyvūs)` : ""}`}
            className={`relative flex items-center gap-2 h-11 rounded-lg border px-4 text-body-sm font-medium transition-all duration-150 shrink-0 ${
              isOpen || activeFilterCount > 0
                ? "border-brand-300 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-400 dark:hover:bg-brand-900"
                : "border-[#cdc09f] bg-[#fbfaf6] text-surface-600 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
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
              className="hidden sm:block absolute right-0 top-full mt-2 w-96 rounded-xl border border-[#d2c5a1] bg-[#fbfaf6] shadow-lg z-50 dark:border-surface-700 dark:bg-surface-900"
            >
              <FilterPanelContent
                categories={categories}
                cities={cities}
                budgets={budgets}
                pendingCategory={pendingCategory}
                pendingLocation={pendingLocation}
                pendingBudget={pendingBudget}
                setPendingCategory={setPendingCategory}
                setPendingLocation={setPendingLocation}
                setPendingBudget={setPendingBudget}
                onApply={applyFilters}
                onClear={clearPending}
                pendingChanged={pendingChanged}
                pendingCount={pendingCount}
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
          <div className="sm:hidden fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-[#d2c5a1] bg-[#fbfaf6] shadow-2xl dark:border-surface-700 dark:bg-surface-900 animate-in slide-in-from-bottom duration-200 max-h-[80vh] flex flex-col">
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
                budgets={budgets}
                pendingCategory={pendingCategory}
                pendingLocation={pendingLocation}
                pendingBudget={pendingBudget}
                setPendingCategory={setPendingCategory}
                setPendingLocation={setPendingLocation}
                setPendingBudget={setPendingBudget}
                onApply={applyFilters}
                onClear={clearPending}
                pendingChanged={pendingChanged}
                pendingCount={pendingCount}
              />
            </div>
          </div>
        </>
      )}

      {/* Active filter chips + sort + result count row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {activeCategory && (
            <button
              onClick={() => removeFilter("category")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 border border-brand-100 px-2.5 py-1 text-caption font-medium text-brand-700 hover:bg-brand-100 transition-colors dark:bg-brand-950 dark:border-brand-900 dark:text-brand-400 dark:hover:bg-brand-900"
            >
              {categoryLabel || activeCategory}
              <X className="h-3 w-3" />
            </button>
          )}
          {activeLocation && (
            <button
              onClick={() => removeFilter("location")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 border border-brand-100 px-2.5 py-1 text-caption font-medium text-brand-700 hover:bg-brand-100 transition-colors dark:bg-brand-950 dark:border-brand-900 dark:text-brand-400 dark:hover:bg-brand-900"
            >
              {activeLocation}
              <X className="h-3 w-3" />
            </button>
          )}
          {activeBudget && (
            <button
              onClick={() => removeFilter("budget")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 border border-brand-100 px-2.5 py-1 text-caption font-medium text-brand-700 hover:bg-brand-100 transition-colors dark:bg-brand-950 dark:border-brand-900 dark:text-brand-400 dark:hover:bg-brand-900"
            >
              {budgetLabelActive || activeBudget}
              <X className="h-3 w-3" />
            </button>
          )}
          {activeFilterCount > 0 && (
            <button
              onClick={clearAll}
              className="text-caption text-surface-400 hover:text-surface-600 transition-colors dark:hover:text-surface-300"
            >
              Išvalyti
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="h-3.5 w-3.5 text-surface-400" />
            <div className="flex gap-1">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSort(opt.value)}
                  className={`rounded-lg px-3 py-1.5 font-serif text-caption transition-all whitespace-nowrap ${
                    activeSort === opt.value
                      ? "bg-[#fbfaf6] font-semibold text-surface-900 shadow-sm ring-1 ring-inset ring-[#cdc09f] dark:bg-surface-800 dark:text-white dark:ring-surface-600"
                      : "font-medium text-surface-500 hover:bg-surface-50/70 hover:text-surface-800 dark:hover:bg-surface-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Result count */}
          <p className="text-caption text-surface-400">
            {totalResults === 0
              ? "Nerasta"
              : `${totalResults} ${totalResults === 1 ? "užklausa" : totalResults < 10 ? "užklausos" : "užklausų"}`}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── Filter panel content (shared between desktop dropdown and mobile sheet) ─── */

function FilterPanelContent({
  categories,
  cities,
  budgets,
  pendingCategory,
  pendingLocation,
  pendingBudget,
  setPendingCategory,
  setPendingLocation,
  setPendingBudget,
  onApply,
  onClear,
  pendingChanged,
  pendingCount,
}: {
  categories: CategoryOption[];
  cities: string[];
  budgets: BudgetOption[];
  pendingCategory: string;
  pendingLocation: string;
  pendingBudget: string;
  setPendingCategory: (v: string) => void;
  setPendingLocation: (v: string) => void;
  setPendingBudget: (v: string) => void;
  onApply: () => void;
  onClear: () => void;
  pendingChanged: boolean;
  pendingCount: number;
}) {
  return (
    <div className="p-4 space-y-4">
      {/* Category select */}
      <div>
        <label className="text-caption font-medium text-surface-500 dark:text-surface-400 mb-2 block">
          Kategorija
        </label>
        <div className="grid grid-cols-2 gap-1 max-h-44 overflow-y-auto overscroll-contain rounded-lg">
          {categories.map((cat) => {
            const isSelected = pendingCategory === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setPendingCategory(isSelected ? "" : cat.value)}
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
        <div className="grid grid-cols-2 gap-1 max-h-44 overflow-y-auto overscroll-contain rounded-lg">
          {cities.map((city) => {
            const isSelected = pendingLocation === city;
            return (
              <button
                key={city}
                type="button"
                onClick={() => setPendingLocation(isSelected ? "" : city)}
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

      {/* Divider */}
      <div className="border-t border-surface-100 dark:border-surface-800" />

      {/* Budget select */}
      <div>
        <label className="text-caption font-medium text-surface-500 dark:text-surface-400 mb-2 block">
          Biudžetas
        </label>
        <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto overscroll-contain rounded-lg">
          {budgets.map((b) => {
            const isSelected = pendingBudget === b.value;
            return (
              <button
                key={b.value}
                type="button"
                onClick={() => setPendingBudget(isSelected ? "" : b.value)}
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
                <span className="truncate">{b.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-surface-100 dark:border-surface-800">
        {pendingCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="flex-1 h-10 rounded-xl border border-[#d2c5a1] text-body-sm font-medium text-surface-600 hover:bg-surface-50 transition-colors dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800"
          >
            Išvalyti
          </button>
        )}
        <button
          type="button"
          onClick={onApply}
          className={`flex-1 h-10 rounded-xl text-body-sm font-semibold transition-colors ${
            pendingChanged
              ? "bg-brand-600 text-white hover:bg-brand-700 shadow-sm"
              : "bg-brand-600 text-white hover:bg-brand-700"
          }`}
        >
          {pendingChanged ? "Taikyti filtrus" : "Uždaryti"}
        </button>
      </div>
    </div>
  );
}
