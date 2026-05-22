import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { LITHUANIAN_CITIES } from "@/lib/constants";
import { getServiceCategoryGroups } from "@/lib/service-categories";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://paslaugurinka.lt";

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
      url: `${BASE_URL}/meistrai/katalogas`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
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
  // Parallelize to keep total sitemap response under ~3s.
  const [activeProviderProfiles, supplierSlugs, categoryGroups] = await Promise.all([
    prisma.providerProfile.findMany({
      where: {
        isActive: true,
        moderationStatus: "APPROVED",
        user: { role: "PROVIDER", emailVerified: { not: null } },
      },
      select: { slug: true, updatedAt: true },
    }),
    prisma.supplierRecord.findMany({
      where: { status: { in: ["unclaimed", "claimed"] } },
      select: { slug: true, updatedAt: true },
    }),
    getServiceCategoryGroups(),
  ]);

  const providerEntries: SitemapEntry[] = activeProviderProfiles
    .filter((p): p is typeof p & { slug: string } => Boolean(p.slug))
    .map((p) => ({
      url: `${BASE_URL}/meistrai/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

  const supplierEntries: SitemapEntry[] = supplierSlugs.map((s) => ({
    url: `${BASE_URL}/meistrai/katalogas/${s.slug}`,
    lastModified: s.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  // Category × city combo URLs targeting the public requests listing
  // (where category + location are real, indexable query params).
  // Uses the curated depth-1 category slugs — the granular services users
  // actually filter by. depth-1 categories × LITHUANIAN_CITIES combos.
  const categorySlugs = categoryGroups.flatMap((group) =>
    group.categories.map((category) => category.slug),
  );
  const comboEntries: SitemapEntry[] = [];
  for (const categorySlug of categorySlugs) {
    for (const city of LITHUANIAN_CITIES) {
      const qs = new URLSearchParams({ category: categorySlug, location: city }).toString();
      comboEntries.push({
        url: `${BASE_URL}/uzklausos?${qs}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  }

  const all: SitemapEntry[] = [
    ...staticEntries,
    ...providerEntries,
    ...supplierEntries,
    ...comboEntries,
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
