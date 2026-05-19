"use client";

import { create } from "zustand";

export interface ProviderCardData {
  id: string;
  name: string | null;
  profileImage: string | null;
  coverImage: string | null;
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
  availableForUrgent: boolean;
  priceFrom: number | null;
}

/** Minimal store — filtering is now URL/server-driven */
interface ProviderFilterState {
  serverProviders: ProviderCardData[];
  setServerProviders: (providers: ProviderCardData[]) => void;
}

export const useProviderFilterStore = create<ProviderFilterState>((set) => ({
  serverProviders: [],
  setServerProviders: (providers) => set({ serverProviders: providers }),
}));
