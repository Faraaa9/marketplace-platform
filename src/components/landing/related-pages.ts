/**
 * Registry of every /paslaugos/* service landing page, used to cross-link
 * related pages from the ServiceLanding template. Without these internal links
 * the pages are orphans: present in the sitemap but unreachable by link-following
 * crawlers, so they get crawled rarely and pass no internal link equity.
 *
 * Authored as service -> cities (slug is always `${service}-${city}`) so the set
 * stays in sync with the page directories under src/app/paslaugos/ by
 * construction. The seo-landing-pages test asserts this matches the filesystem.
 */

/** Locative city label as it appears in page titles, e.g. "Santechnikas Kaune". */
const CITY_LABELS = {
  kaune: "Kaune",
  vilniuje: "Vilniuje",
  klaipedoje: "Klaipėdoje",
  siauliuose: "Šiauliuose",
  panevezyje: "Panevėžyje",
} as const;

type CitySlug = keyof typeof CITY_LABELS;

interface ServiceGroup {
  /** Slug stem, e.g. "santechnikas" in "santechnikas-kaune". */
  service: string;
  /** Display noun used in anchors, e.g. "Santechnikas". */
  label: string;
  /** Cities this service has a page for, ordered by audience size. */
  cities: CitySlug[];
}

// Ordered alphabetically by label for predictable cross-link ordering.
const SERVICE_GROUPS: ServiceGroup[] = [
  { service: "apdailos-darbai", label: "Apdailos darbai", cities: ["kaune", "vilniuje", "klaipedoje"] },
  { service: "baldu-surinkimas", label: "Baldų surinkimas", cities: ["vilniuje"] },
  { service: "buto-valymas", label: "Buto valymas", cities: ["vilniuje"] },
  { service: "duru-montavimas", label: "Durų montavimas", cities: ["kaune", "vilniuje"] },
  { service: "elektrikas", label: "Elektrikas", cities: ["kaune", "vilniuje", "klaipedoje", "siauliuose", "panevezyje"] },
  { service: "elektros-instaliacija", label: "Elektros instaliacija", cities: ["kaune"] },
  { service: "fasado-siltinimas", label: "Fasado šiltinimas", cities: ["kaune", "vilniuje"] },
  { service: "gipso-kartono-montavimas", label: "Gipso kartono montavimas", cities: ["kaune"] },
  { service: "grindu-betonavimas", label: "Grindų betonavimas", cities: ["kaune", "vilniuje"] },
  { service: "kaminu-valymas", label: "Kaminų valymas", cities: ["kaune"] },
  { service: "kanalizacijos-valymas", label: "Kanalizacijos valymas", cities: ["kaune", "vilniuje"] },
  { service: "kondicionieriu-montavimas", label: "Kondicionierių montavimas", cities: ["kaune", "vilniuje"] },
  { service: "laminato-klojimas", label: "Laminato klojimas", cities: ["kaune", "vilniuje"] },
  { service: "langu-keitimas", label: "Langų keitimas", cities: ["kaune"] },
  { service: "langu-valymas", label: "Langų valymas", cities: ["kaune"] },
  { service: "parketo-klojimas", label: "Parketo klojimas", cities: ["kaune"] },
  { service: "perkraustymo-paslaugos", label: "Perkraustymo paslaugos", cities: ["kaune"] },
  { service: "plyteliu-klijavimas", label: "Plytelių klijavimas", cities: ["kaune", "vilniuje", "klaipedoje"] },
  { service: "santechnikas", label: "Santechnikas", cities: ["kaune", "vilniuje", "klaipedoje", "siauliuose", "panevezyje"] },
  { service: "stogo-dengimas", label: "Stogo dengimas", cities: ["kaune", "vilniuje", "klaipedoje"] },
  { service: "trinkeliu-klojimas", label: "Trinkelių klojimas", cities: ["kaune"] },
  { service: "tvoros-montavimas", label: "Tvoros montavimas", cities: ["kaune", "vilniuje"] },
];

export interface LandingPageMeta {
  slug: string;
  service: string;
  serviceLabel: string;
  city: CitySlug;
  cityLabel: string;
}

export const LANDING_PAGES: LandingPageMeta[] = SERVICE_GROUPS.flatMap((g) =>
  g.cities.map((city) => ({
    slug: `${g.service}-${city}`,
    service: g.service,
    serviceLabel: g.label,
    city,
    cityLabel: CITY_LABELS[city],
  })),
);

export interface RelatedLink {
  href: string;
  label: string;
}

export interface RelatedLinkGroup {
  heading: string;
  links: RelatedLink[];
}

const toLink = (p: LandingPageMeta): RelatedLink => ({
  href: `/paslaugos/${p.slug}`,
  label: `${p.serviceLabel} ${p.cityLabel}`,
});

/**
 * Given a landing page slug, return the same service in other cities and other
 * services in the same city. Empty groups when the page is unknown or has no
 * siblings on that axis.
 */
export function getRelatedLandingLinks(slug: string): {
  sameService: RelatedLinkGroup;
  sameCity: RelatedLinkGroup;
} {
  const current = LANDING_PAGES.find((p) => p.slug === slug);
  if (!current) {
    return { sameService: { heading: "", links: [] }, sameCity: { heading: "", links: [] } };
  }

  const sameService = LANDING_PAGES
    .filter((p) => p.service === current.service && p.slug !== current.slug)
    .map(toLink);
  const sameCity = LANDING_PAGES
    .filter((p) => p.city === current.city && p.service !== current.service)
    .map(toLink);

  return {
    sameService: { heading: `${current.serviceLabel} kituose miestuose`, links: sameService },
    sameCity: { heading: `Kitos paslaugos ${current.cityLabel}`, links: sameCity },
  };
}
