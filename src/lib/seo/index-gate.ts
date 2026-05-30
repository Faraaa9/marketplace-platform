/**
 * Indexing gate — the single source of truth for "should this URL be indexed?".
 *
 * Used by BOTH route `generateMetadata` (to emit robots noindex) AND the sitemap
 * (to decide inclusion). Because both call the same predicate, it is impossible
 * for the sitemap to list a URL that marks itself noindex, or vice versa.
 *
 * Two design rules, both grounded in marketplace-SEO research (see NOTES.md
 * "SEO architektūros planas"):
 *
 *  1. Threshold ("brandos vartai"): a programmatic page is only indexable once it
 *     has enough real inventory + content to not be thin. Below that → noindex,
 *     200, excluded from sitemap. The page still works for users and filters.
 *
 *  2. Hysteresis: indexation must NOT flip-flop around the threshold. Search
 *     engines distrust pages that toggle index⇄noindex. So the gate opens at
 *     `enableAt` but only closes below `disableBelow` (< enableAt). A page that
 *     is already indexed needs to drop meaningfully before we pull it.
 */

export const INDEX_GATE = {
  /** Inventory count (providers / open requests) at which indexing turns ON. */
  enableAt: 3,
  /** Drop strictly below this to turn indexing OFF — buffer prevents flip-flop. */
  disableBelow: 2,
  /** Minimum meaningful word count of unique on-page content. */
  minWords: 300,
} as const;

/**
 * Query-string params that NEVER make a URL indexable on their own. These are
 * UI state / transient signals, not content facets. A URL carrying any of these
 * (without an indexable facet) gets noindex + canonical to the base path.
 */
export const UTILITY_PARAMS = new Set<string>([
  "welcome",
  "inquiry",
  "sort",
  "page",
  "open",
  "active",
  "urgent",
  "top",
  "presence",
  "search",
]);

export interface GateFacts {
  /** Real inventory on the page: provider count, or open-request count. */
  count: number;
  /** Word count of unique, meaningful on-page content (excludes boilerplate). */
  wordCount: number;
  /**
   * Whether the URL is *currently* treated as indexed. Drives hysteresis: an
   * already-indexed page survives a dip to `disableBelow`, a fresh page must
   * clear `enableAt`. Pass the previous verdict when known; default false is
   * the safe (stricter) choice for first evaluation.
   */
  currentlyIndexed?: boolean;
}

/**
 * The core predicate. Returns true when the page should be indexed + in sitemap.
 */
export function passesIndexGate(facts: GateFacts): boolean {
  if (facts.wordCount < INDEX_GATE.minWords) return false;

  const inventoryFloor = facts.currentlyIndexed
    ? INDEX_GATE.disableBelow
    : INDEX_GATE.enableAt;

  return facts.count >= inventoryFloor;
}

/**
 * True when a search-param key is pure UI/transient state (never a content facet).
 */
export function isUtilityParam(key: string): boolean {
  return UTILITY_PARAMS.has(key);
}

/**
 * Given a parsed search-param object, returns true if ANY non-utility param is
 * present — i.e. there is a real content facet (category / location) in play.
 * An empty object, or one containing only utility params, returns false.
 */
export function hasContentFacet(params: Record<string, string | undefined>): boolean {
  return Object.entries(params).some(
    ([key, value]) => Boolean(value) && !isUtilityParam(key),
  );
}
