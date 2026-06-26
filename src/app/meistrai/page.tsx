import type { Metadata } from "next";
import { Users } from "lucide-react";
import ProvidersExperience from "@/components/tiekejai/ProvidersExperience";
import { getProvidersListingData, buildProviderCards } from "@/lib/providers-listing";
import type { ServiceCategoryItem } from "@/lib/service-categories";
import type { ProviderFilters } from "@/lib/provider-filters";
import { LITHUANIAN_CITIES } from "@/lib/constants";
import { buildPageSeo } from "@/lib/seo/page-seo";
import { isUtilityParam } from "@/lib/seo/index-gate";
import { buildCategoryView, type CategoryView } from "@/lib/seo/category-view";
import { isProfilePreviewEnabled } from "@/lib/platform-settings";

type ListingData = Awaited<ReturnType<typeof getProvidersListingData>>;

/**
 * Resolves the URL params to a single `/meistrai?category=` view (shared by
 * `generateMetadata` and the page render). Returns null when there is no single
 * resolvable category facet — i.e. the base index page.
 */
function deriveCategoryView(
  data: ListingData,
  params: Awaited<PageProps["searchParams"]>,
): CategoryView | null {
  const categoryRaw = params.category?.includes(",") ? "" : params.category;
  const locationRaw = params.location?.includes(",") ? "" : params.location;
  const hasOnlyUtility =
    !categoryRaw &&
    Object.keys(params).every(
      (key) => isUtilityParam(key) || !params[key as keyof typeof params],
    );
  if (!categoryRaw || hasOnlyUtility) return null;

  const city =
    locationRaw && (LITHUANIAN_CITIES as readonly string[]).includes(locationRaw)
      ? locationRaw
      : null;

  return buildCategoryView(data, categoryRaw, city);
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const data = await getProvidersListingData();
  const view = deriveCategoryView(data, params);

  if (!view) {
    return buildPageSeo({ kind: "providers-index" }).metadata;
  }

  // Category filter pages carry no on-page SEO prose (that content now lives on
  // dedicated /paslaugos/* landing pages). They are functional faceted-search
  // views → noindex + canonical to /meistrai. wordCount 0 enforces that via the
  // gate; the dynamic title/H1 stay for a clear browser tab and shared links.
  return buildPageSeo(
    view.city
      ? {
          kind: "providers-category-city",
          category: view.facet,
          city: view.city,
          providerCount: view.providerCount,
          wordCount: 0,
        }
      : {
          kind: "providers-category",
          category: view.facet,
          providerCount: view.providerCount,
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
  const previewEnabled = await isProfilePreviewEnabled();

  // Build only the visible slice; the rest is hydrated client-side. Heavy
  // transform work (image URL builds, presence labels) for 480 unseen rows
  // would otherwise burn server CPU + balloon the RSC payload.
  const initialProviders = buildProviderCards(data, providers.slice(0, SSR_INITIAL_COUNT));
  const totalProviderCount = providers.length;

  // Category-specific server content (same builder the index gate measures).
  // When present it supplies the page's single H1 + indexable prose.
  const categoryView = deriveCategoryView(data, params);

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
              {categoryView ? categoryView.content.heading : "Meistrai ir paslaugų teikėjai"}
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
        {/* Key by the URL-driven filters: on soft navigation Next reuses the
            client instance, and ProvidersExperience seeds its filter state from
            useState(initialFilters) — which only reads on mount. Without a key,
            navigating /meistrai?category=A → ?category=B keeps showing A (the
            stale state even rewrites the URL back). Remounting on filter change
            re-seeds the state from the new params. */}
        <ProvidersExperience
          key={JSON.stringify(initialFilters)}
          initialProviders={initialProviders}
          initialFilters={initialFilters}
          totalProviderCount={totalProviderCount}
          previewEnabled={previewEnabled}
        />

      </div>
    </div>
  );
}
