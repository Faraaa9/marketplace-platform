"use client";

import { useEffect, useMemo, useState } from "react";
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
const FILTER_PARAM_KEYS = ["search", "location", "category", "active", "urgent", "top"];
const VIEW_STORAGE_KEY = "meistrai-view";
export type ProvidersView = "grid" | "list";

interface ProvidersExperienceProps {
  initialProviders: ProviderCardData[];
  initialFilters: ProviderFilters;
}

export default function ProvidersExperience({
  initialProviders,
  initialFilters,
}: ProvidersExperienceProps) {
  const [filters, setFilters] = useState<ProviderFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ProvidersView>("grid");

  useEffect(() => {
    const saved = typeof window === "undefined" ? null : localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved === "list" || saved === "grid") setView(saved);
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
    () => filterAndSortProviders(initialProviders, filters),
    [initialProviders, filters],
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
      if (filters.location) url.searchParams.set("location", filters.location);
      if (filters.category) url.searchParams.set("category", filters.category);
      if (filters.active) url.searchParams.set("active", "1");
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
        onPageChange={handlePageChange}
        onClearFilters={handleClearFilters}
      />
    </>
  );
}
