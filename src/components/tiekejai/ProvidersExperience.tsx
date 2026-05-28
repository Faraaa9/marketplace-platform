"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ProviderFilterBar from "./ProviderFilterBar";
import ProviderListingClient from "./ProviderListingClient";
import {
  EMPTY_PROVIDER_FILTERS,
  filterAndSortProviders,
  hasActiveProviderFilters,
  type ProviderCardData,
  type ProviderFilters,
} from "@/lib/provider-filters";

const PER_PAGE = 20;
const FILTER_PARAM_KEYS = ["search", "location", "category", "presence", "active", "urgent", "top"];
const VIEW_STORAGE_KEY = "meistrai-view";
export type ProvidersView = "grid" | "list";

interface ProvidersExperienceProps {
  initialProviders: ProviderCardData[];
  initialFilters: ProviderFilters;
  /** Full count from the server. The initialProviders array typically only
   *  carries the top slice (page-1 worth) — we lazy-fetch the rest so the
   *  initial HTML payload stays small. */
  totalProviderCount: number;
}

export default function ProvidersExperience({
  initialProviders,
  initialFilters,
  totalProviderCount,
}: ProvidersExperienceProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<ProviderFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ProvidersView>("grid");
  const [providers, setProviders] = useState<ProviderCardData[]>(initialProviders);

  // Lazy-fetch the rest of the listing after hydration so navigation/filter
  // beyond the first page still feels local-first. Skipped when the initial
  // slice already covers everything.
  useEffect(() => {
    if (providers.length >= totalProviderCount) return;

    const controller = new AbortController();
    fetch("/api/meistrai/providers", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { providers: ProviderCardData[] } | null) => {
        if (data?.providers) setProviders(data.providers);
      })
      .catch(() => {
        // Network/abort — keep showing the initial slice silently.
      });

    return () => controller.abort();
    // Intentionally only runs once on mount; totalProviderCount is a render
    // input, not a re-fetch trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const saved = typeof window === "undefined" ? null : localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved !== "list" && saved !== "grid") return;

    const frame = window.requestAnimationFrame(() => {
      setView(saved);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function handleViewChange(next: ProvidersView) {
    setView(next);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // localStorage may be unavailable (private mode, quota) — ignore.
    }
  }

  const filtered = useMemo(
    () => filterAndSortProviders(providers, filters),
    [providers, filters],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageProviders = filtered.slice(
    (currentPage - 1) * PER_PAGE,
    currentPage * PER_PAGE,
  );

  // Keep the URL shareable without triggering a Next.js navigation —
  // replaceState updates the address bar with no server round-trip.
  // Debounced so fast typing in the search box doesn't spam history.
  useEffect(() => {
    const timeout = setTimeout(() => {
      const url = new URL(window.location.href);
      for (const key of FILTER_PARAM_KEYS) url.searchParams.delete(key);
      if (filters.search) url.searchParams.set("search", filters.search);
      if (filters.locations.length) url.searchParams.set("location", filters.locations.join(","));
      if (filters.categories.length) url.searchParams.set("category", filters.categories.join(","));
      if (filters.presence !== "all") url.searchParams.set("presence", filters.presence);
      if (filters.urgent) url.searchParams.set("urgent", "1");
      if (filters.top) url.searchParams.set("top", "1");
      const qs = url.searchParams.toString();
      window.history.replaceState(null, "", `${url.pathname}${qs ? `?${qs}` : ""}`);
    }, 300);
    return () => clearTimeout(timeout);
  }, [filters]);

  function handleFiltersChange(patch: Partial<ProviderFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
    // Presence is a wall-clock signal — pull fresh server data so that
    // anyone who logged in (or went idle) after this page first rendered
    // shows the right state immediately, not just on a manual reload.
    if (patch.presence !== undefined) {
      router.refresh();
    }
  }

  function handleClearFilters() {
    setFilters(EMPTY_PROVIDER_FILTERS);
    setPage(1);
  }

  function handlePageChange(next: number) {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <div className="mb-6">
        <ProviderFilterBar
          filters={filters}
          resultCount={filtered.length}
          view={view}
          onChange={handleFiltersChange}
          onClear={handleClearFilters}
          onViewChange={handleViewChange}
        />
      </div>
      <ProviderListingClient
        providers={pageProviders}
        page={currentPage}
        totalPages={totalPages}
        hasActiveFilters={hasActiveProviderFilters(filters)}
        view={view}
        presence={filters.presence}
        onPageChange={handlePageChange}
        onClearFilters={handleClearFilters}
        onPresenceChange={(next) => handleFiltersChange({ presence: next })}
      />
    </>
  );
}
