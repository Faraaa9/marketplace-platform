import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
import { prisma } from "@/lib/prisma";
import { SEO_LANDINGS } from "@/lib/seo-landings";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://paslaugurinka.lt";

// Google sitemap limit per file is 50k URLs. If we ever cross that, we should
// switch to a sitemap index. Keep a safety budget so we fail loudly before then.
const SITEMAP_URL_LIMIT = 50_000;

type SitemapEntry = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Refresh hourly so newly verified providers / new supplier slugs appear quickly
  // without re-running expensive DB queries on every Googlebot hit. Segment-level
  // `revalidate` is rejected under cacheComponents in Next >= 16.4.
  "use cache";
  cacheLife({ revalidate: 3600 });

  // Pull the minimum surface area from DB: slug + updatedAt only.
  const [activeProviderProfiles, latestRequest] = await Promise.all([
    prisma.providerProfile.findMany({
      where: {
        isActive: true,
        moderationStatus: "APPROVED",
        user: { role: "PROVIDER", emailVerified: { not: null } },
        // Seed/demo fixtures are noindex (see meistrai/[slug] isSeedProfile);
        // a noindex page must never appear in the sitemap.
        NOT: {
          OR: [
            { displayName: { contains: "(DEMO)" } },
            { displayName: { contains: "(TEST)" } },
            { user: { name: { contains: "(DEMO)" } } },
            { user: { name: { contains: "(TEST)" } } },
            { user: { email: { endsWith: "@test.lt" } } },
            { user: { email: { contains: "@example." } } },
          ],
        },
      },
      select: { slug: true, updatedAt: true },
    }),
    prisma.serviceRequest.findFirst({
      where: { moderationStatus: "APPROVED" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  // Only pages backed by data get a lastModified; a fake "now" on every URL
  // teaches crawlers to ignore the field. Static pages simply omit it.
  const providersUpdatedAt = activeProviderProfiles.reduce<Date | undefined>(
    (max, p) => (!max || p.updatedAt > max ? p.updatedAt : max),
    undefined,
  );
  const requestsUpdatedAt = latestRequest?.createdAt;
  const homeUpdatedAt =
    providersUpdatedAt && requestsUpdatedAt && requestsUpdatedAt > providersUpdatedAt
      ? requestsUpdatedAt
      : providersUpdatedAt ?? requestsUpdatedAt;

  const staticEntries: SitemapEntry[] = [
    {
      url: BASE_URL,
      lastModified: homeUpdatedAt,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/meistrai`,
      lastModified: providersUpdatedAt,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/uzklausos`,
      lastModified: requestsUpdatedAt,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/tiekejams`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/paslaugos`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...SEO_LANDINGS.map(({ slug }) => ({
      url: `${BASE_URL}/paslaugos/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    {
      url: `${BASE_URL}/straipsniai/stogo-darbai`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/kontaktai`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/privatumas`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

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
