import type { ProviderProfileData } from "./types";

export interface ProviderCategory {
  id: string;
  name: string;
  slug: string;
}

/** ProviderProfileData plus the provider's curated categories. */
export type ProviderProfileWithCategories = ProviderProfileData & {
  categories: ProviderCategory[];
};
