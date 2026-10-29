import type { Metadata } from "next";
import { passesIndexGate } from "./index-gate";

/**
 * Central SEO contract — every route type funnels through `buildPageSeo`, so a
 * page is SEO-correct *by construction*: it cannot emit an empty title, a
 * missing canonical, or an indexation signal that disagrees with the sitemap.
 *
 * The key invariant: `metadata.robots` and `verdict.index` are derived from the
 * same facts in the same place. The sitemap calls this builder and filters on
 * `verdict.index`, so a noindex URL can never appear in the sitemap.
 *
 * This module is PURE — it performs no IO. Routes fetch the facts (provider
 * counts, word counts, category labels) and pass them in.
 */

export const SITE_NAME = "paslaugurinka.lt";
const TITLE_SUFFIX = "Paslaugų rinka";
const DESCRIPTION_MAX = 157;

export const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || `https://${SITE_NAME}`;

export type IndexVerdict =
  | { index: true }
  | { index: false; reason: "below-threshold" | "transient" | "utility-param" };

export interface PageSeoResult {
  metadata: Metadata;
  verdict: IndexVerdict;
  /** Optional JSON-LD blocks. Only emitted when valid (caller renders via <JsonLd>). */
  jsonLd?: Array<Record<string, unknown>>;
}

interface CategoryFacet {
  name: string;
  slug: string;
}

/**
 * Discriminated input — one variant per route type. Adding a new indexable
 * route means adding a variant here, which forces every SEO field to be
 * considered (the compiler will not let a variant ship without a title path).
 */
export type SeoInput =
  | { kind: "provider-profile"; title: string; description: string; path: string; heroImageUrl?: string | null; jsonLd?: Array<Record<string, unknown>>; noindex?: boolean }
  | { kind: "providers-index" }
  | { kind: "providers-category"; category: CategoryFacet; providerCount: number; wordCount: number; currentlyIndexed?: boolean }
  | { kind: "providers-category-city"; category: CategoryFacet; city: string; providerCount: number; wordCount: number; currentlyIndexed?: boolean }
  | { kind: "requests-index" }
  | { kind: "requests-combo"; category?: CategoryFacet; city?: string }
  | { kind: "static"; title: string; description: string; path: string }
  | {
      kind: "landing";
      title: string;
      description: string;
      path: string;
      heroImageUrl?: string;
    }
  | { kind: "article"; title: string; description: string; path: string; heroImageUrl?: string };

// --- helpers (single source for each formatting rule) -----------------------

/** Appends the site suffix unless the title already ends with it. */
function withSuffix(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return TITLE_SUFFIX;
  if (trimmed.includes(TITLE_SUFFIX) || trimmed.includes(SITE_NAME)) return trimmed;
  return `${trimmed} | ${TITLE_SUFFIX}`;
}

/** Collapses whitespace and clamps to DESCRIPTION_MAX with an ellipsis. */
function clampDescription(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= DESCRIPTION_MAX) return clean;
  return clean.slice(0, DESCRIPTION_MAX - 1).trimEnd() + "…";
}

function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function absoluteImageUrl(url: string): string {
  if (url.startsWith("http")) return url;
  return absoluteUrl(url);
}

function robotsFor(verdict: IndexVerdict): Metadata["robots"] {
  // Always explicit — never rely on Next's index-by-default. noindex pages stay
  // crawlable (follow) so internal links still pass equity.
  return verdict.index
    ? { index: true, follow: true }
    : { index: false, follow: true };
}

/** Assembles the final Metadata once title/description/canonical/verdict are known. */
function assemble(opts: {
  title: string;
  description: string;
  canonical: string;
  verdict: IndexVerdict;
  heroImageUrl?: string | null;
  ogType?: "website" | "profile";
}): Metadata {
  const title = withSuffix(opts.title);
  const description = clampDescription(opts.description);
  const images = opts.heroImageUrl ? [absoluteImageUrl(opts.heroImageUrl)] : undefined;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: opts.canonical },
    robots: robotsFor(opts.verdict),
    openGraph: {
      title,
      description,
      url: opts.canonical,
      siteName: SITE_NAME,
      type: opts.ogType ?? "website",
      locale: "lt_LT",
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      ...(images ? { images } : {}),
    },
  };
}

// --- the contract -----------------------------------------------------------

export function buildPageSeo(input: SeoInput): PageSeoResult {
  switch (input.kind) {
    case "provider-profile": {
      // Seed/demo profiles ("(DEMO)"/"(TEST)") are still publicly visible but
      // must stay out of the index until they are deleted — caller flags them.
      const verdict: IndexVerdict = input.noindex
        ? { index: false, reason: "transient" }
        : { index: true };
      return {
        verdict,
        jsonLd: input.jsonLd,
        metadata: assemble({
          title: input.title,
          description: input.description,
          canonical: absoluteUrl(input.path),
          verdict,
          heroImageUrl: input.heroImageUrl,
          ogType: "profile",
        }),
      };
    }

    case "providers-index": {
      const verdict: IndexVerdict = { index: true };
      return {
        verdict,
        metadata: assemble({
          title: "Meistrai ir paslaugų teikėjai",
          description:
            "Raskite patikimus paslaugų tiekėjus Lietuvoje. Peržiūrėkite profilius, specializacijas ir atsiliepimus.",
          canonical: absoluteUrl("/meistrai"),
          verdict,
        }),
      };
    }

    case "providers-category": {
      const indexable = passesIndexGate({
        count: input.providerCount,
        wordCount: input.wordCount,
        currentlyIndexed: input.currentlyIndexed,
      });
      const verdict: IndexVerdict = indexable
        ? { index: true }
        : { index: false, reason: "below-threshold" };
      const cat = input.category;
      const path = indexable
        ? `/meistrai?category=${encodeURIComponent(cat.slug)}`
        : "/meistrai"; // below threshold → canonical to base
      return {
        verdict,
        metadata: assemble({
          title: `${cat.name} — meistrai ir paslaugų teikėjai Lietuvoje`,
          description: `Raskite ${cat.name.toLowerCase()} specialistus Lietuvoje. ${input.providerCount} tiekėjų: profiliai, atsiliepimai, kainos. Susisiekite tiesiogiai per paslaugurinka.lt.`,
          canonical: absoluteUrl(path),
          verdict,
        }),
      };
    }

    case "providers-category-city": {
      const indexable = passesIndexGate({
        count: input.providerCount,
        wordCount: input.wordCount,
        currentlyIndexed: input.currentlyIndexed,
      });
      const verdict: IndexVerdict = indexable
        ? { index: true }
        : { index: false, reason: "below-threshold" };
      const cat = input.category;
      const qs = `category=${encodeURIComponent(cat.slug)}&location=${encodeURIComponent(input.city)}`;
      const path = indexable ? `/meistrai?${qs}` : "/meistrai";
      return {
        verdict,
        metadata: assemble({
          title: `${cat.name} ${input.city}e — meistrai ir paslaugų teikėjai`,
          description: `${cat.name} ${input.city}e: ${input.providerCount} patikimų tiekėjų. Peržiūrėkite profilius, atsiliepimus ir kainas, susisiekite tiesiogiai.`,
          canonical: absoluteUrl(path),
          verdict,
        }),
      };
    }

    case "requests-index": {
      const verdict: IndexVerdict = { index: true };
      return {
        verdict,
        metadata: assemble({
          title: "Viešos užklausos — Paslaugų rinka",
          description:
            "Peržiūrėkite aktyvias paslaugų užklausas Lietuvoje. Raskite darbus ir pateikite pasiūlymus.",
          canonical: absoluteUrl("/uzklausos"),
          verdict,
        }),
      };
    }

    case "requests-combo": {
      // Request listings are transient inventory — never the indexed asset.
      // Always noindex + canonical to the base board. (See NOTES.md Q1.)
      const verdict: IndexVerdict = { index: false, reason: "transient" };
      const cat = input.category;
      const titleParts = [
        cat?.name ?? "Paslaugų užklausos",
        input.city ? `${input.city}e` : null,
      ].filter(Boolean);
      return {
        verdict,
        metadata: assemble({
          title: `${titleParts.join(" ")} — viešos užklausos`,
          description: cat
            ? `Aktyvios ${cat.name.toLowerCase()} užklausos${input.city ? ` ${input.city}e` : ""}. Raskite darbus ir pateikite pasiūlymus per paslaugurinka.lt.`
            : "Peržiūrėkite aktyvias paslaugų užklausas Lietuvoje.",
          canonical: absoluteUrl("/uzklausos"),
          verdict,
        }),
      };
    }

    case "static": {
      const verdict: IndexVerdict = { index: true };
      return {
        verdict,
        metadata: assemble({
          title: input.title,
          description: input.description,
          canonical: absoluteUrl(input.path),
          verdict,
        }),
      };
    }

    case "landing": {
      const verdict: IndexVerdict = { index: true };
      return {
        verdict,
        metadata: assemble({
          title: input.title,
          description: input.description,
          canonical: absoluteUrl(input.path),
          verdict,
          heroImageUrl: input.heroImageUrl,
        }),
      };
    }

    case "article": {
      const verdict: IndexVerdict = { index: true };
      return {
        verdict,
        metadata: assemble({
          title: input.title,
          description: input.description,
          canonical: absoluteUrl(input.path),
          verdict,
          heroImageUrl: input.heroImageUrl,
          ogType: "website",
        }),
      };
    }
  }
}
