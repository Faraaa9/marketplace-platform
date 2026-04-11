"use client";

import { create } from "zustand";

export interface ProviderCardData {
  id: string;
  name: string | null;
  profileImage: string | null;
  description: string | null;
  specializations: string[];
  location: string | null;
  planType: string;
  badge: string | null;
  responseCount: number;
  acceptedCount: number;
  isRecentlyActive: boolean;
  avgRating: number | null;
  reviewCount: number;
  hasActiveStory: boolean;
}

interface ProviderFilterState {
  /** Full unfiltered page of providers from the server */
  serverProviders: ProviderCardData[];
  /** Active client-side category filter (not in URL) */
  clientCategory: string;
  /** Active client-side location filter (not in URL) */
  clientLocation: string;

  /** Hydrate the store with new server data */
  setServerProviders: (providers: ProviderCardData[]) => void;
  setClientCategory: (category: string) => void;
  setClientLocation: (location: string) => void;
  clearClientFilters: () => void;

  /** Derived: filtered list */
  getFilteredProviders: () => ProviderCardData[];
}

export const useProviderFilterStore = create<ProviderFilterState>((set, get) => ({
  serverProviders: [],
  clientCategory: "",
  clientLocation: "",

  setServerProviders: (providers) =>
    set({ serverProviders: providers, clientCategory: "", clientLocation: "" }),

  setClientCategory: (category) => set({ clientCategory: category }),
  setClientLocation: (location) => set({ clientLocation: location }),
  clearClientFilters: () => set({ clientCategory: "", clientLocation: "" }),

  getFilteredProviders: () => {
    const { serverProviders, clientCategory, clientLocation } = get();
    let result = serverProviders;

    if (clientCategory) {
      result = result.filter((p) =>
        p.specializations.includes(clientCategory)
      );
    }
    if (clientLocation) {
      result = result.filter(
        (p) => p.location?.toLowerCase().includes(clientLocation.toLowerCase())
      );
    }

    return result;
  },
}));
