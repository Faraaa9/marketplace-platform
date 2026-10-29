"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import {
  Search,
  X,
  MapPin,
  SlidersHorizontal,
  Zap,
  Star,
  ChevronDown,
  Tag,
  LayoutGrid,
  List,
} from "lucide-react";
import { LITHUANIAN_CITIES } from "@/lib/constants";
import type { ServiceCategoryGroup } from "@/lib/service-categories";
import type { PresenceFilter, ProviderFilters } from "@/lib/provider-filters";
import GroupedCategoryPicker from "@/components/categories/GroupedCategoryPicker";
import type { ProvidersView } from "./ProvidersExperience";

interface FilterBarProps {
  filters: ProviderFilters;
  resultCount: number;
  view: ProvidersView;
  onChange: (patch: Partial<ProviderFilters>) => void;
  onClear: () => void;
  onViewChange: (view: ProvidersView) => void;
}

function resultLabel(count: number) {
  if (count === 0) return "Nerasta";
  const noun = count === 1 ? "tiekėjas" : count < 10 ? "tiekėjai" : "tiekėjų";
  return `${count} ${noun}`;
}

export default function ProviderFilterBar({
  filters,
  resultCount,
  view,
  onChange,
  onClear,
  onViewChange,
}: FilterBarProps) {
  const { search, locations, categories, presence, urgent, top } = filters;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const locationRef = useRef<HTMLDivElement>(null);

  const [mobileLocations, setMobileLocations] = useState<string[]>(locations);
  const [mobileCategories, setMobileCategories] = useState<string[]>(categories);
  const [mobilePresence, setMobilePresence] = useState<PresenceFilter>(presence);
  const [mobileUrgent, setMobileUrgent] = useState(urgent);
  const [mobileTop, setMobileTop] = useState(top);
  const [categoryGroups, setCategoryGroups] = useState<ServiceCategoryGroup[]>([]);

  useEffect(() => {
    fetch("/api/service-categories")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setCategoryGroups(data.data || []);
      })
      .catch(() => {});
  }, []);

  const activeFilterCount =
    locations.length +
    categories.length +
    (presence !== "all" ? 1 : 0) +
    (urgent ? 1 : 0) +
    (top ? 1 : 0);

  // Flat slug → display-name lookup so selected categories render readable chips.
  const categoryLabelBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of categoryGroups) {
      const stack = [group.root];
      while (stack.length > 0) {
        const item = stack.shift();
        if (!item) continue;
        map.set(item.slug, item.name);
        stack.push(...(item.children ?? []));
      }
    }
    return map;
  }, [categoryGroups]);
  const categoryLabel = (slug: string) => categoryLabelBySlug.get(slug) ?? slug;

  const availableCities = LITHUANIAN_CITIES.filter((city) => city !== "Visa Lietuva");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMobileLocations(locations);
    setMobileCategories(categories);
    setMobilePresence(presence);
    setMobileUrgent(urgent);
    setMobileTop(top);
  }, [locations, categories, presence, urgent, top]);

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

  function toggleLocation(city: string) {
    onChange({
      locations: locations.includes(city)
        ? locations.filter((c) => c !== city)
        : [...locations, city],
    });
    // Keep the dropdown open so several cities can be added in a row.
  }

  function toggleCategory(slug: string) {
    onChange({
      categories: categories.includes(slug)
        ? categories.filter((c) => c !== slug)
        : [...categories, slug],
    });
  }

  function toggleMobileLocation(city: string) {
    setMobileLocations((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city],
    );
  }

  function toggleMobileCategory(slug: string) {
    setMobileCategories((prev) =>
      prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug],
    );
  }

  function applyMobileFilters() {
    onChange({
      locations: mobileLocations,
      categories: mobileCategories,
      presence: mobilePresence,
      urgent: mobileUrgent,
      top: mobileTop,
    });
    setMobileOpen(false);
  }

  function clearMobileFilters() {
    setMobileLocations([]);
    setMobileCategories([]);
    setMobilePresence("all");
    setMobileUrgent(false);
    setMobileTop(false);
    onClear();
    setMobileOpen(false);
  }

  function handleClearAll() {
    onClear();
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
            value={search}
            onChange={(e) => onChange({ search: e.target.value })}
            className="w-full h-14 rounded-full border border-surface-200/80 bg-white pl-14 pr-12 text-body text-surface-900 shadow-sm placeholder:text-surface-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-300 focus:shadow-lg dark:border-surface-700 dark:bg-surface-800 dark:text-white dark:focus:border-brand-500"
          />
          {search && (
            <button
              onClick={() => onChange({ search: "" })}
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
                locations.length > 0
                  ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-300"
                  : "border-surface-200 bg-white text-surface-600 hover:bg-surface-50 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              {locations.length === 0
                ? "Miestas"
                : locations.length === 1
                  ? locations[0]
                  : `Miestai (${locations.length})`}
              <ChevronDown className={`h-3.5 w-3.5 text-surface-400 transition-transform ${locationOpen ? "rotate-180" : ""}`} />
            </button>

            {locationOpen && (
              <div className="absolute left-0 top-full z-50 mt-1.5 max-h-72 w-52 overflow-y-auto rounded-xl border border-surface-200/80 bg-white p-1.5 shadow-xl dark:border-surface-700 dark:bg-surface-900">
                {availableCities.filter((city) => !locations.includes(city)).length === 0 ? (
                  <p className="px-3 py-2 text-body-sm text-surface-400">Visi miestai pasirinkti</p>
                ) : (
                  availableCities
                    .filter((city) => !locations.includes(city))
                    .map((city) => (
                      <button
                        key={city}
                        onClick={() => toggleLocation(city)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-body-sm text-surface-600 transition-colors hover:bg-surface-50 dark:text-surface-400 dark:hover:bg-surface-800"
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-surface-400" />
                        {city}
                      </button>
                    ))
                )}
              </div>
            )}
          </div>

          {/* Category chip / dropdown — unified across the app */}
          <GroupedCategoryPicker
            groups={categoryGroups}
            multiple
            selectedValues={categories}
            onToggle={toggleCategory}
            onClearAll={() => onChange({ categories: [] })}
            mode="slug"
            variant="chip"
            placeholder="Kategorija"
          />

          <div className="h-5 w-px bg-surface-200 dark:bg-surface-700" />

          {/* Presence segmented control */}
          <PresenceChip
            level="online"
            active={presence === "online"}
            onClick={() => onChange({ presence: presence === "online" ? "all" : "online" })}
          />
          <PresenceChip
            level="today"
            active={presence === "today"}
            onClick={() => onChange({ presence: presence === "today" ? "all" : "today" })}
          />
          <FilterToggle active={urgent} onClick={() => onChange({ urgent: !urgent })} icon={<Zap className="h-3.5 w-3.5" />}>
            Skubūs
          </FilterToggle>
          <FilterToggle active={top} onClick={() => onChange({ top: !top })} icon={<Star className="h-3.5 w-3.5" />}>
            Įvertinimas 4,5+
          </FilterToggle>

          {/* Spacer + count + view toggle */}
          <div className="ml-auto flex items-center gap-3">
            <span className="text-body-sm text-surface-400">{resultLabel(resultCount)}</span>
            <ViewToggle view={view} onChange={onViewChange} />
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
              value={search}
              onChange={(e) => onChange({ search: e.target.value })}
              className="w-full h-11 rounded-full border border-surface-200/80 bg-white pl-10 pr-9 text-body-sm text-surface-900 shadow-sm placeholder:text-surface-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400 dark:border-surface-700 dark:bg-surface-800 dark:text-white"
            />
            {search && (
              <button
                onClick={() => onChange({ search: "" })}
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
          <span className="text-body-sm text-surface-400 shrink-0">{resultLabel(resultCount)}</span>
          {(activeFilterCount > 0 || search) && (
            <>
              <div className="h-3.5 w-px bg-surface-200 dark:bg-surface-700" />
              {locations.map((loc) => (
                <ActiveChip
                  key={`loc-${loc}`}
                  label={loc}
                  onRemove={() => onChange({ locations: locations.filter((c) => c !== loc) })}
                />
              ))}
              {categories.map((slug) => (
                <ActiveChip
                  key={`cat-${slug}`}
                  label={categoryLabel(slug)}
                  onRemove={() => onChange({ categories: categories.filter((c) => c !== slug) })}
                />
              ))}
              {presence !== "all" && (
                <ActiveChip
                  label={presence === "online" ? "Prisijungę dabar" : "Šiandien"}
                  onRemove={() => onChange({ presence: "all" })}
                />
              )}
              {urgent && <ActiveChip label="Skubūs" onRemove={() => onChange({ urgent: false })} />}
              {top && <ActiveChip label="Aukštas įvertinimas" onRemove={() => onChange({ top: false })} />}
            </>
          )}
          <div className="ml-auto">
            <ViewToggle view={view} onChange={onViewChange} />
          </div>
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
                  {availableCities.map((city) => {
                    const isActive = mobileLocations.includes(city);
                    return (
                      <button
                        key={city}
                        onClick={() => toggleMobileLocation(city)}
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
                {categoryGroups.length === 0 ? (
                  <p className="text-body-sm text-surface-400">Kraunama…</p>
                ) : (
                  <div className="space-y-4">
                    {categoryGroups.map((group) => (
                      <div key={group.root.id}>
                        <p className="mb-2 text-micro font-semibold uppercase tracking-wider text-surface-400">
                          {group.root.name}
                        </p>
                        <div className="space-y-2">
                          {group.categories.map((cat) => {
                            const isActive = mobileCategories.includes(cat.slug);
                            return (
                              <div key={cat.id}>
                                <MobileCategoryButton
                                  name={cat.name}
                                  childCount={cat.childCount}
                                  active={isActive}
                                  onClick={() => toggleMobileCategory(cat.slug)}
                                />
                                {(cat.children?.length ?? 0) > 0 && (
                                  <div className="mt-1 grid grid-cols-2 gap-1.5 pl-3">
                                    {cat.children?.map((child) => {
                                      const childActive = mobileCategories.includes(child.slug);
                                      return (
                                        <MobileCategoryButton
                                          key={child.id}
                                          name={child.name}
                                          active={childActive}
                                          compact
                                          onClick={() => toggleMobileCategory(child.slug)}
                                        />
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Presence segmented */}
              <div>
                <label className="text-body-sm font-semibold text-surface-700 dark:text-surface-200 mb-3 block">
                  Aktyvumas
                </label>
                <div className="inline-flex w-full rounded-2xl bg-surface-100 p-1 dark:bg-surface-800">
                  {(["all", "online", "today"] as const).map((option) => {
                    const isActive = mobilePresence === option;
                    const label =
                      option === "all" ? "Visi" : option === "online" ? "Prisijungę" : "Šiandien";
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setMobilePresence(option)}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-body-sm font-semibold transition-all ${
                          isActive
                            ? "bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-white"
                            : "text-surface-500 dark:text-surface-400"
                        }`}
                      >
                        {option === "online" && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                        )}
                        {option === "today" && (
                          <span
                            className="h-1.5 w-1.5 rounded-full bg-surface-400 dark:bg-surface-500"
                            aria-hidden
                          />
                        )}
                        {label}
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
                  <MobileToggle active={mobileUrgent} onClick={() => setMobileUrgent(!mobileUrgent)} icon={<Zap className="h-4 w-4" />} label="Skubūs darbai" sublabel="Priima skubius užsakymus" />
                  <MobileToggle active={mobileTop} onClick={() => setMobileTop(!mobileTop)} icon={<Star className="h-4 w-4" />} label="Aukštas įvertinimas" sublabel="4,5+ žvaigždučių vertinimas" />
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
                  Rodyti rezultatus
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════
          Desktop active chips row (shown below search when filters active)
         ═══════════════════════════════════════════════════════════ */}
      {(activeFilterCount > 0 || search) && (
        <div className="hidden md:flex items-center gap-2 flex-wrap">
          {search && <ActiveChip label={`"${search}"`} onRemove={() => onChange({ search: "" })} />}
          {locations.map((loc) => (
            <ActiveChip
              key={`loc-${loc}`}
              label={loc}
              onRemove={() => onChange({ locations: locations.filter((c) => c !== loc) })}
            />
          ))}
          {categories.map((slug) => (
            <ActiveChip
              key={`cat-${slug}`}
              label={categoryLabel(slug)}
              onRemove={() => onChange({ categories: categories.filter((c) => c !== slug) })}
            />
          ))}
          {presence !== "all" && (
            <ActiveChip
              label={presence === "online" ? "Prisijungę dabar" : "Aktyvūs šiandien"}
              onRemove={() => onChange({ presence: "all" })}
            />
          )}
          {urgent && <ActiveChip label="Skubūs" onRemove={() => onChange({ urgent: false })} />}
          {top && <ActiveChip label="Aukštas įvertinimas" onRemove={() => onChange({ top: false })} />}
          <button
            onClick={handleClearAll}
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

function MobileCategoryButton({
  name,
  childCount,
  active,
  onClick,
  compact = false,
}: {
  name: string;
  childCount?: number;
  active: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-xl px-3 text-left font-medium transition-all ${
        compact ? "py-2 text-caption" : "py-2.5 text-body-sm"
      } ${
        active
          ? "bg-brand-600 text-white shadow-sm dark:bg-brand-500"
          : "bg-surface-50 text-surface-600 hover:bg-surface-100 dark:bg-surface-800 dark:text-surface-300"
      }`}
    >
      <Tag className="h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {typeof childCount === "number" && childCount > 0 && (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
            active
              ? "bg-white/20 text-white"
              : "bg-white text-surface-400 dark:bg-surface-700 dark:text-surface-300"
          }`}
        >
          {childCount}
        </span>
      )}
    </button>
  );
}

function PresenceChip({
  level,
  active,
  onClick,
}: {
  level: "online" | "today";
  active: boolean;
  onClick: () => void;
}) {
  const label = level === "online" ? "Prisijungę dabar" : "Šiandien";
  const dotClass =
    level === "online" ? "bg-emerald-500" : "bg-surface-400 dark:bg-surface-500";
  return (
    <button
      onClick={onClick}
      className={`flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-body-sm font-medium transition-all duration-150 ${
        active
          ? "border-brand-200 bg-brand-50 text-brand-700 shadow-sm dark:border-brand-700 dark:bg-brand-950 dark:text-brand-300"
          : "border-surface-200 bg-white text-surface-600 hover:bg-surface-50 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden />
      {label}
    </button>
  );
}

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

function ViewToggle({
  view,
  onChange,
}: {
  view: ProvidersView;
  onChange: (view: ProvidersView) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-surface-200 bg-white p-0.5 shadow-sm dark:border-surface-700 dark:bg-surface-800">
      <button
        type="button"
        onClick={() => onChange("grid")}
        aria-pressed={view === "grid"}
        aria-label="Tinklelio vaizdas"
        title="Tinklelio vaizdas"
        className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
          view === "grid"
            ? "bg-surface-100 text-surface-900 dark:bg-surface-700 dark:text-white"
            : "text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
        }`}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        aria-pressed={view === "list"}
        aria-label="Sąrašo vaizdas"
        title="Sąrašo vaizdas"
        className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
          view === "list"
            ? "bg-surface-100 text-surface-900 dark:bg-surface-700 dark:text-white"
            : "text-surface-400 hover:text-surface-600 dark:hover:text-surface-200"
        }`}
      >
        <List className="h-3.5 w-3.5" />
      </button>
    </div>
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
