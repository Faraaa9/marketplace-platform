/**
 * SEO gate — crawls one URL per route type and asserts the invariants the
 * central SEO contract is supposed to guarantee (see src/lib/seo/). Fails loud
 * (exit 1) so it can run in CI or against production after a deploy.
 *
 * Checks per page:
 *   - exactly one non-empty <title>
 *   - a non-empty <meta name="description">
 *   - a <link rel="canonical">
 *   - exactly one <h1>
 *   - every application/ld+json block parses and has @context
 * Cross-page:
 *   - titles are unique across the sampled route types
 *   - any URL present in sitemap.xml must NOT be noindex (sitemap = indexable)
 *
 * Usage:
 *   npx ts-node scripts/seo-check.ts [baseUrl]
 *   SEO_CHECK_BASE_URL=https://www.paslaugurinka.lt npx ts-node scripts/seo-check.ts
 */

import * as cheerio from "cheerio";

const BASE_URL = (
  process.argv[2] ||
  process.env.SEO_CHECK_BASE_URL ||
  "https://www.paslaugurinka.lt"
).replace(/\/$/, "");

interface Failure {
  url: string;
  message: string;
}

const failures: Failure[] = [];
function fail(url: string, message: string) {
  failures.push({ url, message });
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "paslaugurinka-seo-check" },
      redirect: "follow",
    });
    if (!res.ok) {
      fail(url, `HTTP ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    fail(url, `fetch error: ${(err as Error).message}`);
    return null;
  }
}

/** Pulls a sample of indexable URLs from the sitemap, one per shape. */
async function discoverFromSitemap(): Promise<{
  sitemapUrls: Set<string>;
  categoryUrl: string | null;
  profileUrl: string | null;
}> {
  const xml = await fetchText(`${BASE_URL}/sitemap.xml`);
  const sitemapUrls = new Set<string>();
  if (!xml) return { sitemapUrls, categoryUrl: null, profileUrl: null };

  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    m[1]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'"),
  );
  for (const loc of locs) sitemapUrls.add(loc);

  const categoryUrl = locs.find((u) => u.includes("/meistrai?category=")) ?? null;
  const profileUrl =
    locs.find((u) => /\/meistrai\/[^?]+$/.test(u) && !u.endsWith("/meistrai")) ??
    null;
  return { sitemapUrls, categoryUrl, profileUrl };
}

interface PageCheckOpts {
  requireJsonLd?: boolean;
  inSitemap?: boolean;
}

const seenTitles = new Map<string, string>(); // title -> url

async function checkPage(url: string, opts: PageCheckOpts = {}) {
  const html = await fetchText(url);
  if (!html) return;
  const $ = cheerio.load(html);

  // title
  const titles = $("title");
  if (titles.length !== 1) fail(url, `expected 1 <title>, found ${titles.length}`);
  const title = titles.first().text().trim();
  if (!title) fail(url, "empty <title>");
  else {
    const prior = seenTitles.get(title);
    if (prior) fail(url, `duplicate <title> "${title}" (also on ${prior})`);
    else seenTitles.set(title, url);
  }

  // description
  const desc = $('meta[name="description"]').attr("content")?.trim();
  if (!desc) fail(url, "missing/empty <meta name=description>");

  // canonical
  if ($('link[rel="canonical"]').length === 0) fail(url, "missing <link rel=canonical>");

  // single H1
  const h1 = $("h1");
  if (h1.length !== 1) fail(url, `expected 1 <h1>, found ${h1.length}`);

  // robots noindex must not appear on sitemap-listed URLs
  const robots = $('meta[name="robots"]').attr("content")?.toLowerCase() ?? "";
  const isNoindex = robots.includes("noindex");
  if (opts.inSitemap && isNoindex)
    fail(url, "sitemap URL is marked noindex (contradiction)");

  // JSON-LD validity
  const blocks = $('script[type="application/ld+json"]');
  if (opts.requireJsonLd && blocks.length === 0)
    fail(url, "expected JSON-LD, found none");
  blocks.each((_, el) => {
    const raw = $(el).contents().text();
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (!item || typeof item !== "object" || !("@context" in item))
          fail(url, "JSON-LD block missing @context");
      }
    } catch {
      fail(url, "JSON-LD block does not parse");
    }
  });
}

async function main() {
  console.log(`[seo-check] base = ${BASE_URL}`);
  const { sitemapUrls, categoryUrl, profileUrl } = await discoverFromSitemap();

  const targets: Array<{ url: string; opts: PageCheckOpts }> = [
    { url: `${BASE_URL}/`, opts: { inSitemap: sitemapUrls.has(`${BASE_URL}/`) } },
    { url: `${BASE_URL}/meistrai`, opts: { inSitemap: true } },
    { url: `${BASE_URL}/uzklausos`, opts: { inSitemap: true } },
  ];
  if (profileUrl)
    targets.push({ url: profileUrl, opts: { requireJsonLd: true, inSitemap: true } });
  else console.warn("[seo-check] no provider profile URL in sitemap — skipping");
  if (categoryUrl)
    targets.push({ url: categoryUrl, opts: { requireJsonLd: false, inSitemap: true } });
  else
    console.warn(
      "[seo-check] no indexable /meistrai?category= URL in sitemap yet — skipping",
    );

  for (const t of targets) await checkPage(t.url, t.opts);

  if (failures.length > 0) {
    console.error(`\n[seo-check] ${failures.length} failure(s):`);
    for (const f of failures) console.error(`  ✗ ${f.url}\n    ${f.message}`);
    process.exit(1);
  }
  console.log(`[seo-check] OK — ${targets.length} URL(s) passed all checks.`);
}

main();
