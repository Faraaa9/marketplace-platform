"use client";

import { useState, useRef, useCallback, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  X,
  Check,
  Loader2,
  MapPin,
  SlidersHorizontal,
  Zap,
  Clock,
  Star,
  ChevronDown,
  Tag,
} from "lucide-react";

interface CategoryOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  activeSearch: string;
  activeLocation: string;
  activeCategory: string;
  activeNow: boolean;
  urgentWork: boolean;
  topRated: boolean;
  cities: string[];
  categories: CategoryOption[];
  serverTotal: number;
}

export default function ProviderFilterBar({
  activeSearch,
  activeLocation,
  activeCategory,
  activeNow,
  urgentWork,
  topRated,
  cities,
  categories,
  serverTotal,
}: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPushedSearch = useRef(activeSearch);

  const [searchValue, setSearchValue] = useState(activeSearch);
  const [isPending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);

  const [mobileLocation, setMobileLocation] = useState(activeLocation);
  const [mobileCategory, setMobileCategory] = useState(activeCategory);
  const [mobileActive, setMobileActive] = useState(activeNow);
  const [mobileUrgent, setMobileUrgent] = useState(urgentWork);
  const [mobileTop, setMobileTop] = useState(topRated);

  const activeFilterCount = [activeLocation, activeCategory, activeNow, urgentWork, topRated].filter(Boolean).length;
  const activeCategoryLabel = categories.find((c) => c.value === activeCategory)?.label ?? "";

  useEffect(() => {
    setSearchValue(activeSearch);
    lastPushedSearch.current = activeSearch;
  }, [activeSearch]);

  useEffect(() => {
    setMobileLocation(activeLocation);
    setMobileCategory(activeCategory);
    setMobileActive(activeNow);
    setMobileUrgent(urgentWork);
    setMobileTop(topRated);
  }, [activeLocation, activeCategory, activeNow, urgentWork, topRated]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!locationOpen) return;
    function handleClick(e: MouseEvent) {
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setLocationOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [locationOpen]);

  useEffect(() => {
    if (!categoryOpen) return;
    function handleClick(e: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [categoryOpen]);

  const buildUrl = useCallback(
    (overrides: Record<string, string>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(overrides)) {
        if (v) p.set(k, v);
        else p.delete(k);
      }
      p.delete("page");
      const qs = p.toString();
      return `/tiekejai${qs ? `?${qs}` : ""}`;
    },
    [searchParams]
  );

  function navigate(overrides: Record<string, string>) {
    startTransition(() => { router.push(buildUrl(overrides)); });
  }

  function handleSearch(value: string) {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (value === lastPushedSearch.current) return;
      lastPushedSearch.current = value;
      navigate({ search: value });
    }, 400);
  }

  function clearSearch() {
    setSearchValue("");
    if (lastPushedSearch.current) {
      lastPushedSearch.current = "";
      navigate({ search: "" });
    }
  }

  function toggleFilter(key: string, currentlyActive: boolean) {
    navigate({ [key]: currentlyActive ? "" : "1" });
  }

  function setLocation(city: string) {
    navigate({ location: activeLocation === city ? "" : city });
    setLocationOpen(false);
  }

  function setCategory(value: string) {
    navigate({ category: activeCategory === value ? "" : value });
    setCategoryOpen(false);
  }

  function clearAll() {
    setSearchValue("");
    lastPushedSearch.current = "";
    startTransition(() => { router.push("/tiekejai"); });
    setMobileOpen(false);
  }

  function applyMobileFilters() {
    const p = new URLSearchParams();
    if (searchValue) p.set("search", searchValue);
    if (mobileLocation) p.set("location", mobileLocation);
    if (mobileCategory) p.set("category", mobileCategory);
    if (mobileActive) p.set("active", "1");
    if (mobileUrgent) p.set("urgent", "1");
    if (mobileTop) p.set("top", "1");
    const qs = p.toString();
    startTransition(() => { router.push(`/tiekejai${qs ? `?${qs}` : ""}`); });
    setMobileOpen(false);
  }

  function clearMobileFilters() {
    setMobileLocation("");
    setMobileCategory("");
    setMobileActive(false);
    setMobileUrgent(false);
    setMobileTop(false);
    setSearchValue("");
    lastPushedSearch.current = "";
    startTransition(() => { router.push("/tiekejai"); });
    setMobileOpen(false);
  }

  return (
    <div className="space-y-3">
      {/* ═══════════════════════════════════════════════════════════
          Desktop — Google Flights inspired
         ═══════════════════════════════════════════════════════════ */}
      <div className="hidden md:block">
        {/* Search bar — full width, prominent */}
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Ieškoti tiekėjo pagal vardą ar aprašymą..."
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full h-14 rounded-full border border-surface-200/80 bg-white pl-14 pr-12 text-body text-surface-900 shadow-sm placeholder:text-surface-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 focus:shadow-lg dark:border-surface-700 dark:bg-surface-800 dark:text-white dark:focus:border-brand-500"
          />
          {isPending && (
            <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-brand-500 animate-spin" />
          )}
          {searchValue && !isPending && (
            <button
              onClick={clearSearch}
              className="absolute right-5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-700"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter chips row */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {/* Location chip / dropdown */}
          <div className="relative" ref={locationRef}>
            <button
              onClick={() => setLocationOpen(!locationOpen)}
              className={`flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-body-sm font-medium transition-all duration-150 ${
                activeLocation
                  ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-300"
                  : "border-surface-200 bg-white text-surface-600 hover:bg-surface-50 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              {activeLocation || "Miestas"}
              {activeLocation ? (
                <span
                  onClick={(e) => { e.stopPropagation(); navigate({ location: "" }); }}
                  className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-brand-200/60 dark:hover:bg-brand-800/60"
                >
                  <X className="h-3 w-3" />
                </span>
              ) : (
                <ChevronDown className={`h-3.5 w-3.5 text-surface-400 transition-transform ${locationOpen ? "rotate-180" : ""}`} />
              )}
            </button>

            {locationOpen && (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-52 rounded-xl border border-surface-200/80 bg-white p-1.5 shadow-xl dark:border-surface-700 dark:bg-surface-900">
                {cities.map((city) => (
                  <button
                    key={city}
                    onClick={() => setLocation(city)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-body-sm transition-colors ${
                      activeLocation === city
                        ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                        : "text-surface-600 hover:bg-surface-50 dark:text-surface-400 dark:hover:bg-surface-800"
                    }`}
                  >
                    {activeLocation === city && <Check className="h-3.5 w-3.5 shrink-0" />}
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category chip / dropdown */}
          <div className="relative" ref={categoryRef}>
            <button
              onClick={() => setCategoryOpen(!categoryOpen)}
              className={`flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-body-sm font-medium transition-all duration-150 ${
                activeCategory
                  ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-300"
                  : "border-surface-200 bg-white text-surface-600 hover:bg-surface-50 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
              }`}
            >
              <Tag className="h-3.5 w-3.5" />
              {activeCategoryLabel || "Kategorija"}
              {activeCategory ? (
                <span
                  onClick={(e) => { e.stopPropagation(); navigate({ category: "" }); }}
                  className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-brand-200/60 dark:hover:bg-brand-800/60"
                >
                  <X className="h-3 w-3" />
                </span>
              ) : (
                <ChevronDown className={`h-3.5 w-3.5 text-surface-400 transition-transform ${categoryOpen ? "rotate-180" : ""}`} />
              )}
            </button>

            {categoryOpen && (
              <div className="absolute left-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-surface-200/80 bg-white p-1.5 shadow-xl dark:border-surface-700 dark:bg-surface-900">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCategory(cat.value)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-body-sm transition-colors ${
                      activeCategory === cat.value
                        ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                        : "text-surface-600 hover:bg-surface-50 dark:text-surface-400 dark:hover:bg-surface-800"
                    }`}
                  >
                    {activeCategory === cat.value && <Check className="h-3.5 w-3.5 shrink-0" />}
                    {cat.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-surface-200 dark:bg-surface-700" />

          {/* Toggle chips */}
          <FilterToggle active={activeNow} onClick={() => toggleFilter("active", activeNow)} icon={<Clock className="h-3.5 w-3.5" />}>
            Aktyvus
          </FilterToggle>
          <FilterToggle active={urgentWork} onClick={() => toggleFilter("urgent", urgentWork)} icon={<Zap className="h-3.5 w-3.5" />}>
            Skubūs
          </FilterToggle>
          <FilterToggle active={topRated} onClick={() => toggleFilter("top", topRated)} icon={<Star className="h-3.5 w-3.5" />}>
            Top
          </FilterToggle>

          {/* Spacer + count */}
          <div className="ml-auto flex items-center gap-2">
            {isPending && <Loader2 className="h-3.5 w-3.5 text-brand-500 animate-spin" />}
            <span className="text-body-sm text-surface-400">
              {serverTotal === 0
                ? "Nerasta"
                : `${serverTotal} ${serverTotal === 1 ? "tiekėjas" : serverTotal < 10 ? "tiekėjai" : "tiekėjų"}`}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          Mobile — Search + Filtrai button
         ═══════════════════════════════════════════════════════════ */}
      <div className="md:hidden space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Ieškoti tiekėjo..."
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full h-11 rounded-full border border-surface-200/80 bg-white pl-10 pr-9 text-body-sm text-surface-900 shadow-sm placeholder:text-surface-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 dark:border-surface-700 dark:bg-surface-800 dark:text-white"
            />
            {searchValue && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full text-surface-400"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className={`relative flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-body-sm font-medium transition-all ${
              activeFilterCount > 0
                ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300"
                : "border-surface-200/80 bg-white text-surface-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtrai
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Mobile result count + active chips inline */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-body-sm text-surface-400 shrink-0">
            {serverTotal === 0
              ? "Nerasta"
              : `${serverTotal} ${serverTotal === 1 ? "tiekėjas" : serverTotal < 10 ? "tiekėjai" : "tiekėjų"}`}
          </span>
          {(activeFilterCount > 0 || activeSearch) && (
            <>
              <div className="h-3.5 w-px bg-surface-200 dark:bg-surface-700" />
              {activeLocation && <ActiveChip label={activeLocation} onRemove={() => navigate({ location: "" })} />}
              {activeCategory && <ActiveChip label={activeCategoryLabel} onRemove={() => navigate({ category: "" })} />}
              {activeNow && <ActiveChip label="Aktyvus" onRemove={() => toggleFilter("active", true)} />}
              {urgentWork && <ActiveChip label="Skubūs" onRemove={() => toggleFilter("urgent", true)} />}
              {topRated && <ActiveChip label="Top" onRemove={() => toggleFilter("top", true)} />}
            </>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          Mobile Full-screen Drawer
         ═══════════════════════════════════════════════════════════ */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40 animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
          />
          <div className="md:hidden fixed inset-x-0 bottom-0 top-12 z-50 flex flex-col rounded-t-3xl bg-white shadow-2xl dark:bg-surface-900 animate-in slide-in-from-bottom duration-300">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-surface-200 dark:bg-surface-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-4">
              <h2 className="text-lg font-bold text-surface-900 dark:text-white">Filtrai</h2>
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-100 transition-colors hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700"
              >
                <X className="h-4 w-4 text-surface-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-6">
              {/* Location */}
              <div>
                <label className="text-body-sm font-semibold text-surface-700 dark:text-surface-200 mb-3 block">
                  Miestas
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {cities.map((city) => {
                    const isActive = mobileLocation === city;
                    return (
                      <button
                        key={city}
                        onClick={() => setMobileLocation(isActive ? "" : city)}
                        className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-body-sm font-medium transition-all ${
                          isActive
                            ? "bg-brand-600 text-white shadow-sm dark:bg-brand-500"
                            : "bg-surface-50 text-surface-600 hover:bg-surface-100 dark:bg-surface-800 dark:text-surface-300"
                        }`}
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        {city}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-body-sm font-semibold text-surface-700 dark:text-surface-200 mb-3 block">
                  Kategorija
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => {
                    const isActive = mobileCategory === cat.value;
                    return (
                      <button
                        key={cat.value}
                        onClick={() => setMobileCategory(isActive ? "" : cat.value)}
                        className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-body-sm font-medium transition-all ${
                          isActive
                            ? "bg-brand-600 text-white shadow-sm dark:bg-brand-500"
                            : "bg-surface-50 text-surface-600 hover:bg-surface-100 dark:bg-surface-800 dark:text-surface-300"
                        }`}
                      >
                        <Tag className="h-3.5 w-3.5" />
                        <span className="truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggle filters */}
              <div>
                <label className="text-body-sm font-semibold text-surface-700 dark:text-surface-200 mb-3 block">
                  Greiti filtrai
                </label>
                <div className="space-y-2">
                  <MobileToggle active={mobileActive} onClick={() => setMobileActive(!mobileActive)} icon={<Clock className="h-4 w-4" />} label="Aktyvus dabar" sublabel="Prisijungę per pastarąją savaitę" />
                  <MobileToggle active={mobileUrgent} onClick={() => setMobileUrgent(!mobileUrgent)} icon={<Zap className="h-4 w-4" />} label="Skubūs darbai" sublabel="Priima skubius užsakymus" />
                  <MobileToggle active={mobileTop} onClick={() => setMobileTop(!mobileTop)} icon={<Star className="h-4 w-4" />} label="Top reitingas" sublabel="4.5+ žvaigždučių vertinimas" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-surface-100 px-5 py-4 dark:border-surface-800 safe-area-bottom">
              <div className="flex items-center gap-3">
                <button
                  onClick={clearMobileFilters}
                  className="flex-1 h-12 rounded-xl border border-surface-200 text-body-sm font-semibold text-surface-600 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:text-surface-400"
                >
                  Išvalyti
                </button>
                <button
                  onClick={applyMobileFilters}
                  className="flex-1 h-12 rounded-xl bg-brand-600 text-body-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
                >
                  Rodyti ({serverTotal})
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
          Desktop active chips row (shown below search when filters active)
         ═══════════════════════════════════════════════════════════ */}
      {(activeFilterCount > 0 || activeSearch) && (
        <div className="hidden md:flex items-center gap-2 flex-wrap">
          {activeSearch && <ActiveChip label={`"${activeSearch}"`} onRemove={() => { clearSearch(); navigate({ search: "" }); }} />}
          {activeLocation && <ActiveChip label={activeLocation} onRemove={() => navigate({ location: "" })} />}
          {activeCategory && <ActiveChip label={activeCategoryLabel} onRemove={() => navigate({ category: "" })} />}
          {activeNow && <ActiveChip label="Aktyvus" onRemove={() => toggleFilter("active", true)} />}
          {urgentWork && <ActiveChip label="Skubūs" onRemove={() => toggleFilter("urgent", true)} />}
          {topRated && <ActiveChip label="Top reitingas" onRemove={() => toggleFilter("top", true)} />}
          <button
            onClick={clearAll}
            className="text-body-sm text-surface-400 hover:text-surface-600 transition-colors dark:hover:text-surface-300 ml-1"
          >
            Išvalyti viską
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────

function FilterToggle({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-body-sm font-medium transition-all duration-150 ${
        active
          ? "border-brand-200 bg-brand-50 text-brand-700 shadow-sm dark:border-brand-700 dark:bg-brand-950 dark:text-brand-300"
          : "border-surface-200 bg-white text-surface-600 hover:bg-surface-50 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      className="inline-flex items-center gap-1 rounded-full bg-surface-100 px-2.5 py-1 text-micro font-medium text-surface-600 transition-colors hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700"
    >
      {label}
      <X className="h-3 w-3" />
    </button>
  );
}

function MobileToggle({
  active,
  onClick,
  icon,
  label,
  sublabel,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 transition-all ${
        active
          ? "bg-brand-50 ring-2 ring-brand-500 dark:bg-brand-950 dark:ring-brand-400"
          : "bg-surface-50 dark:bg-surface-800"
      }`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
        active
          ? "bg-brand-600 text-white dark:bg-brand-500"
          : "bg-white text-surface-500 shadow-sm dark:bg-surface-700 dark:text-surface-400"
      }`}>
        {icon}
      </div>
      <div className="min-w-0 text-left">
        <p className={`text-body-sm font-semibold ${active ? "text-brand-700 dark:text-brand-300" : "text-surface-900 dark:text-white"}`}>
          {label}
        </p>
        <p className="text-micro text-surface-400">{sublabel}</p>
      </div>
      <div className={`ml-auto flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
        active ? "bg-brand-600 dark:bg-brand-500" : "bg-surface-200 dark:bg-surface-700"
      }`}>
        <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${active ? "translate-x-5" : "translate-x-0"}`} />
      </div>
    </button>
  );
}
