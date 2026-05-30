import type {
  ServiceCategoryGroup,
  ServiceCategoryItem,
} from "@/lib/service-categories";
import { buildCategoryContent } from "@/lib/seo/category-content";

/**
 * Shared `/meistrai?category=` view derivation, used by BOTH the page render
 * and the sitemap so they agree on what is indexable. Pure given its inputs —
 * the caller supplies already-fetched listing data.
 */

interface ListingLike {
  categoryGroups: ServiceCategoryGroup[];
  providers: Array<{
    name?: string | null;
    providerProfile: {
      location?: string | null;
      categories: Array<{ category: { slug: string } }>;
    } | null;
  }>;
}

export interface CategoryView {
  facet: { name: string; slug: string };
  city: string | null;
  providerCount: number;
  content: ReturnType<typeof buildCategoryContent>;
}

/** Finds a category tree node by slug (own + descendant search). */
export function resolveCategoryNode(
  groups: ServiceCategoryGroup[],
  slug: string,
): ServiceCategoryItem | null {
  function find(item: ServiceCategoryItem): ServiceCategoryItem | null {
    if (item.slug === slug) return item;
    for (const child of item.children ?? []) {
      const hit = find(child);
      if (hit) return hit;
    }
    return null;
  }
  for (const group of groups) {
    const node = find(group.root);
    if (node) return node;
  }
  return null;
}

/**
 * Builds the view for a specific category slug (+ optional city), counting
 * matching providers and generating the deterministic prose. Returns null when
 * the slug does not resolve to a category.
 */
export function buildCategoryView(
  data: ListingLike,
  categorySlug: string,
  city: string | null,
): CategoryView | null {
  const node = resolveCategoryNode(data.categoryGroups, categorySlug);
  if (!node) return null;

  const matchSlugs = new Set<string>();
  (function collect(item: ServiceCategoryItem) {
    matchSlugs.add(item.slug);
    for (const child of item.children ?? []) collect(child);
  })(node);

  const matched = data.providers.filter((p) => {
    const inCategory = (p.providerProfile?.categories ?? []).some((c) =>
      matchSlugs.has(c.category.slug),
    );
    if (!inCategory) return false;
    if (city) return p.providerProfile?.location === city;
    return true;
  });

  const content = buildCategoryContent({
    categoryName: node.name,
    city,
    providerCount: matched.length,
    subcategoryNames: (node.children ?? []).map((c) => c.name),
    topProviderNames: matched
      .map((p) => p.name)
      .filter((n): n is string => Boolean(n))
      .slice(0, 5),
    cities: [
      ...new Set(
        matched
          .map((p) => p.providerProfile?.location)
          .filter((l): l is string => Boolean(l)),
      ),
    ],
  });

  return {
    facet: { name: node.name, slug: categorySlug },
    city,
    providerCount: matched.length,
    content,
  };
}
