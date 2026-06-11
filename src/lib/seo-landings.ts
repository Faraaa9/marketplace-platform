// Registry of keyword-targeted service landing pages under /paslaugos/*
// (one page per file). Single source of truth for the sitemap, the
// /paslaugos hub page and footer links — keep in sync when adding a landing.

export type LandingCity =
  | "Kaunas"
  | "Vilnius"
  | "Klaipėda"
  | "Šiauliai"
  | "Panevėžys";

export interface SeoLanding {
  slug: string;
  label: string;
  city: LandingCity;
}

export const SEO_LANDINGS: SeoLanding[] = [
  { slug: "elektrikas-kaune", label: "Elektrikas", city: "Kaunas" },
  { slug: "santechnikas-kaune", label: "Santechnikas", city: "Kaunas" },
  { slug: "stogo-dengimas-kaune", label: "Stogo dengimas", city: "Kaunas" },
  { slug: "kondicionieriu-montavimas-kaune", label: "Kondicionierių montavimas", city: "Kaunas" },
  { slug: "apdailos-darbai-kaune", label: "Apdailos darbai", city: "Kaunas" },
  { slug: "trinkeliu-klojimas-kaune", label: "Trinkelių klojimas", city: "Kaunas" },
  { slug: "plyteliu-klijavimas-kaune", label: "Plytelių klijavimas", city: "Kaunas" },
  { slug: "kanalizacijos-valymas-kaune", label: "Kanalizacijos valymas", city: "Kaunas" },
  { slug: "gipso-kartono-montavimas-kaune", label: "Gipso kartono montavimas", city: "Kaunas" },
  { slug: "langu-valymas-kaune", label: "Langų valymas", city: "Kaunas" },
  { slug: "grindu-betonavimas-kaune", label: "Grindų betonavimas", city: "Kaunas" },
  { slug: "laminato-klojimas-kaune", label: "Laminato klojimas", city: "Kaunas" },
  { slug: "fasado-siltinimas-kaune", label: "Fasado šiltinimas", city: "Kaunas" },
  { slug: "tvoros-montavimas-kaune", label: "Tvoros montavimas", city: "Kaunas" },
  { slug: "duru-montavimas-kaune", label: "Durų montavimas", city: "Kaunas" },
  { slug: "kaminu-valymas-kaune", label: "Kaminų valymas", city: "Kaunas" },
  { slug: "elektros-instaliacija-kaune", label: "Elektros instaliacija", city: "Kaunas" },
  { slug: "perkraustymo-paslaugos-kaune", label: "Perkraustymo paslaugos", city: "Kaunas" },
  { slug: "parketo-klojimas-kaune", label: "Parketo klojimas", city: "Kaunas" },
  { slug: "langu-keitimas-kaune", label: "Langų keitimas", city: "Kaunas" },
  { slug: "elektrikas-vilniuje", label: "Elektrikas", city: "Vilnius" },
  { slug: "santechnikas-vilniuje", label: "Santechnikas", city: "Vilnius" },
  { slug: "stogo-dengimas-vilniuje", label: "Stogo dengimas", city: "Vilnius" },
  { slug: "kondicionieriu-montavimas-vilniuje", label: "Kondicionierių montavimas", city: "Vilnius" },
  { slug: "apdailos-darbai-vilniuje", label: "Apdailos darbai", city: "Vilnius" },
  { slug: "kanalizacijos-valymas-vilniuje", label: "Kanalizacijos valymas", city: "Vilnius" },
  { slug: "grindu-betonavimas-vilniuje", label: "Grindų betonavimas", city: "Vilnius" },
  { slug: "plyteliu-klijavimas-vilniuje", label: "Plytelių klijavimas", city: "Vilnius" },
  { slug: "laminato-klojimas-vilniuje", label: "Laminato klojimas", city: "Vilnius" },
  { slug: "fasado-siltinimas-vilniuje", label: "Fasado šiltinimas", city: "Vilnius" },
  { slug: "tvoros-montavimas-vilniuje", label: "Tvoros montavimas", city: "Vilnius" },
  { slug: "duru-montavimas-vilniuje", label: "Durų montavimas", city: "Vilnius" },
  { slug: "baldu-surinkimas-vilniuje", label: "Baldų surinkimas", city: "Vilnius" },
  { slug: "buto-valymas-vilniuje", label: "Buto valymas", city: "Vilnius" },
  { slug: "elektrikas-klaipedoje", label: "Elektrikas", city: "Klaipėda" },
  { slug: "santechnikas-klaipedoje", label: "Santechnikas", city: "Klaipėda" },
  { slug: "stogo-dengimas-klaipedoje", label: "Stogo dengimas", city: "Klaipėda" },
  { slug: "apdailos-darbai-klaipedoje", label: "Apdailos darbai", city: "Klaipėda" },
  { slug: "plyteliu-klijavimas-klaipedoje", label: "Plytelių klijavimas", city: "Klaipėda" },
  { slug: "elektrikas-siauliuose", label: "Elektrikas", city: "Šiauliai" },
  { slug: "santechnikas-siauliuose", label: "Santechnikas", city: "Šiauliai" },
  { slug: "elektrikas-panevezyje", label: "Elektrikas", city: "Panevėžys" },
  { slug: "santechnikas-panevezyje", label: "Santechnikas", city: "Panevėžys" },
];

export const LANDING_CITIES: LandingCity[] = [
  "Kaunas",
  "Vilnius",
  "Klaipėda",
  "Šiauliai",
  "Panevėžys",
];

// Locative ("-e/-je") forms for link/heading copy. Shared by the hub page and
// the per-landing cross-link section so the two never drift apart.
export const CITY_LOCATIVE: Record<LandingCity, string> = {
  Kaunas: "Kaune",
  Vilnius: "Vilniuje",
  "Klaipėda": "Klaipėdoje",
  "Šiauliai": "Šiauliuose",
  "Panevėžys": "Panevėžyje",
};

export function landingsByCity(city: LandingCity): SeoLanding[] {
  return SEO_LANDINGS.filter((l) => l.city === city);
}

export function landingBySlug(slug: string): SeoLanding | undefined {
  return SEO_LANDINGS.find((l) => l.slug === slug);
}

/**
 * Internal-linking helper for the landing template. Returns siblings to link to
 * so no landing is left with a single incoming link (Semrush #213): a full mesh
 * within the same city + the same service in other cities.
 */
export function relatedLandings(slug: string): {
  sameCity: SeoLanding[];
  sameService: SeoLanding[];
} {
  const current = landingBySlug(slug);
  if (!current) return { sameCity: [], sameService: [] };
  return {
    sameCity: SEO_LANDINGS.filter(
      (l) => l.city === current.city && l.slug !== slug,
    ),
    sameService: SEO_LANDINGS.filter(
      (l) => l.label === current.label && l.slug !== slug,
    ),
  };
}
