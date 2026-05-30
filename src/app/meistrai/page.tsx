import type { Metadata } from "next";
import Link from "next/link";
import { Users, ArrowRight } from "lucide-react";
import ProvidersExperience from "@/components/tiekejai/ProvidersExperience";
import { getProvidersListingData, buildProviderCards } from "@/lib/providers-listing";
import type {
  ServiceCategoryItem,
  ServiceCategoryGroup,
} from "@/lib/service-categories";
import type { ProviderFilters } from "@/lib/provider-filters";
import { LITHUANIAN_CITIES } from "@/lib/constants";
import { buildPageSeo } from "@/lib/seo/page-seo";
import { isUtilityParam } from "@/lib/seo/index-gate";

/**
 * Resolves a `?category=` slug to its display name + the set of its own and
 * descendant slugs, walking the in-memory category tree (no extra DB query).
 * Returns null for unknown slugs so the route falls back to the base index.
 */
function resolveCategoryFacet(
  groups: ServiceCategoryGroup[],
  slug: string,
): { name: string; matchSlugs: Set<string> } | null {
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
    if (!node) continue;
    const matchSlugs = new Set<string>();
    (function collect(item: ServiceCategoryItem) {
      matchSlugs.add(item.slug);
      for (const child of item.children ?? []) collect(child);
    })(node);
    return { name: node.name, matchSlugs };
  }
  return null;
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = await searchParams;

  // A single content facet (`?category=`) makes this a category page. Anything
  // else — no params, multi-value, or only utility params — is the base index.
  const categoryRaw = params.category?.includes(",") ? "" : params.category;
  const locationRaw = params.location?.includes(",") ? "" : params.location;
  const hasOnlyUtility =
    !categoryRaw &&
    Object.keys(params).every((key) => isUtilityParam(key) || !params[key as keyof typeof params]);

  if (!categoryRaw || hasOnlyUtility) {
    return buildPageSeo({ kind: "providers-index" }).metadata;
  }

  const data = await getProvidersListingData();
  const facet = resolveCategoryFacet(data.categoryGroups, categoryRaw);
  if (!facet) {
    return buildPageSeo({ kind: "providers-index" }).metadata;
  }

  const providerCount = data.providers.filter((p) =>
    (p.providerProfile?.categories ?? []).some((c) =>
      facet.matchSlugs.has(c.category.slug),
    ),
  ).length;

  // wordCount is 0 until the page renders category-specific server content
  // (SEO plan step 5). Until then the gate keeps category pages noindex, which
  // is correct: the server HTML is not yet differentiated per category.
  const city =
    locationRaw && (LITHUANIAN_CITIES as readonly string[]).includes(locationRaw)
      ? locationRaw
      : null;

  return buildPageSeo(
    city
      ? {
          kind: "providers-category-city",
          category: { name: facet.name, slug: categoryRaw },
          city,
          providerCount,
          wordCount: 0,
        }
      : {
          kind: "providers-category",
          category: { name: facet.name, slug: categoryRaw },
          providerCount,
          wordCount: 0,
        },
  ).metadata;
}

// Top slice we render server-side. The rest of the (up to 500) cached
// providers ship via /api/meistrai/providers after hydration, restoring the
// local-first filtering UX without paying the full payload cost on FCP.
const SSR_INITIAL_COUNT = 20;

interface PageProps {
  searchParams: Promise<{
    search?: string;
    location?: string;
    category?: string;
    presence?: string;
    active?: string;
    urgent?: string;
    top?: string;
  }>;
}

export default async function ProvidersListingPage({ searchParams }: PageProps) {
  const params = await searchParams;

  const data = await getProvidersListingData();
  const { categoryGroups, providers } = data;

  // Build only the visible slice; the rest is hydrated client-side. Heavy
  // transform work (image URL builds, presence labels) for 480 unseen rows
  // would otherwise burn server CPU + balloon the RSC payload.
  const initialProviders = buildProviderCards(data, providers.slice(0, SSR_INITIAL_COUNT));
  const totalProviderCount = providers.length;

  // Initial filters come from the URL so shared/deep links keep working.
  // `?category=` is validated against the curated depth-1 category slugs —
  // these are the only values the provider category filter can match.
  const validCategorySlugs = new Set(
    categoryGroups.flatMap((group) => {
      const slugs: string[] = [];
      function add(category: ServiceCategoryItem) {
        slugs.push(category.slug);
        for (const child of category.children ?? []) add(child);
      }
      add(group.root);
      return slugs;
    }),
  );
  // Both filters accept several comma-separated values (e.g. `?location=Vilnius,Kaunas`).
  // Single-value legacy links still parse to a one-item array. Unknown values are
  // dropped so the filter state always reflects real cities / curated slugs.
  const validCities = new Set<string>(LITHUANIAN_CITIES as readonly string[]);
  const locations = [
    ...new Set(
      (params.location ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter((city) => validCities.has(city)),
    ),
  ];
  const categories = [
    ...new Set(
      (params.category ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter((slug) => validCategorySlugs.has(slug)),
    ),
  ];
  // `?active=1` is the legacy alias — old bookmarks land on the closest
  // present-day equivalent ('today' bucket) instead of breaking.
  const presence: ProviderFilters["presence"] =
    params.presence === "online"
      ? "online"
      : params.presence === "today" || params.active === "1"
        ? "today"
        : "all";
  const initialFilters: ProviderFilters = {
    search: params.search?.trim() || "",
    locations,
    categories,
    presence,
    urgent: params.urgent === "1",
    top: params.top === "1",
  };

  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden border-b border-surface-200/50 dark:border-surface-800/50">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950">
              <Users className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">
              Meistrai ir paslaugų teikėjai
            </h1>
          </div>
          <p className="text-body text-surface-500 dark:text-surface-400 ml-[52px]">
            {totalProviderCount > 0
              ? `${totalProviderCount} ${totalProviderCount === 1 ? "patikimas specialistas" : totalProviderCount < 10 ? "patikimi specialistai" : "patikimų specialistų"} jūsų paslaugoms`
              : "Raskite patikimus specialistus savo mieste"}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <ProvidersExperience
          initialProviders={initialProviders}
          initialFilters={initialFilters}
          totalProviderCount={totalProviderCount}
        />

        <div className="mt-6 rounded-2xl border border-surface-200/60 bg-white p-8 text-center dark:border-surface-700/50 dark:bg-surface-900/50">
          <p className="text-body font-semibold text-surface-900 dark:text-white">
            Nerandate tinkamo specialisto?
          </p>
          <p className="mt-1 text-body-sm text-surface-500 dark:text-surface-400 max-w-md mx-auto">
            Paskelbkite užklausą nemokamai — tiekėjai patys pateiks pasiūlymus ir jūs galėsite palyginti.
          </p>
          <Link
            href="/uzklausos/nauja"
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-6 py-2.5 text-body-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
          >
            Paskelbti užklausą
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
