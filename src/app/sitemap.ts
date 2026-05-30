import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://paslaugurinka.lt";

// Keyword-targeted service landing pages under /paslaugos/* (one per file).
// Keep in sync when adding a new landing page.
const LANDING_SLUGS = [
  "elektrikas-kaune",
  "santechnikas-kaune",
  "stogo-dengimas-kaune",
  "kondicionieriu-montavimas-kaune",
  "apdailos-darbai-kaune",
  "santechnikas-vilniuje",
  "santechnikas-klaipedoje",
  "elektrikas-vilniuje",
  "elektrikas-klaipedoje",
  "trinkeliu-klojimas-kaune",
  "plyteliu-klijavimas-kaune",
  "kanalizacijos-valymas-kaune",
  "kanalizacijos-valymas-vilniuje",
  "gipso-kartono-montavimas-kaune",
  "langu-valymas-kaune",
  "grindu-betonavimas-kaune",
  "laminato-klojimas-kaune",
  "fasado-siltinimas-kaune",
  "tvoros-montavimas-kaune",
  "duru-montavimas-kaune",
  "kaminu-valymas-kaune",
  "baldu-surinkimas-vilniuje",
  "stogo-dengimas-vilniuje",
  "elektros-instaliacija-kaune",
  "grindu-betonavimas-vilniuje",
  "plyteliu-klijavimas-vilniuje",
  "laminato-klojimas-vilniuje",
  "apdailos-darbai-vilniuje",
  "fasado-siltinimas-vilniuje",
  "tvoros-montavimas-vilniuje",
  "duru-montavimas-vilniuje",
  "elektrikas-siauliuose",
  "santechnikas-panevezyje",
  "perkraustymo-paslaugos-kaune",
  "parketo-klojimas-kaune",
  "buto-valymas-vilniuje",
  "langu-keitimas-kaune",
  "kondicionieriu-montavimas-vilniuje",
  "stogo-dengimas-klaipedoje",
  "apdailos-darbai-klaipedoje",
  "elektrikas-panevezyje",
  "santechnikas-siauliuose",
  "plyteliu-klijavimas-klaipedoje",
] as const;

// Google sitemap limit per file is 50k URLs. If we ever cross that, we should
// switch to a sitemap index. Keep a safety budget so we fail loudly before then.
const SITEMAP_URL_LIMIT = 50_000;

// Refresh hourly so newly verified providers / new supplier slugs appear quickly
// without re-running expensive DB queries on every Googlebot hit.
export const revalidate = 3600;

type SitemapEntry = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: SitemapEntry[] = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/meistrai`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/uzklausos`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/uzklausos/nauja`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/tiekejams`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...LANDING_SLUGS.map((slug) => ({
      url: `${BASE_URL}/paslaugos/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    {
      url: `${BASE_URL}/kontaktai`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/privatumas`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/prisijungti`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/registruotis`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  // Pull the minimum surface area from DB: slug + updatedAt only.
  const activeProviderProfiles = await prisma.providerProfile.findMany({
    where: {
      isActive: true,
      moderationStatus: "APPROVED",
      user: { role: "PROVIDER", emailVerified: { not: null } },
    },
    select: { slug: true, updatedAt: true },
  });

  const providerEntries: SitemapEntry[] = activeProviderProfiles
    .filter((p): p is typeof p & { slug: string } => Boolean(p.slug))
    .map((p) => ({
      url: `${BASE_URL}/meistrai/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  // Faceted /meistrai?category= pages are functional search views, not SEO
  // assets — they carry no on-page prose, so they are noindex and intentionally
  // NOT in the sitemap. Keyword SEO lives on dedicated /paslaugos/* landing
  // pages (added as static entries). Request combos (/uzklausos?...) stay
  // permanently transient → noindex → never here.
  const all: SitemapEntry[] = [
    ...staticEntries,
    ...providerEntries,
  ];

  if (all.length > SITEMAP_URL_LIMIT) {
    // Loud warning surfaces in Vercel logs so we know to split into a sitemap index.
    console.warn(
      `[sitemap] ${all.length} URLs exceeds Google's 50k limit; switch to sitemap index.`,
    );
    return all.slice(0, SITEMAP_URL_LIMIT);
  }

  return all;
}
