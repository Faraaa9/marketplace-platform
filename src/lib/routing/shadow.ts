/**
 * Phase 1 SHADOW routing for multi-routing v4.
 *
 * Computes v4 routing for a freshly-created request and writes a
 * `RoutingDecisionLog` row comparing the OLD (current production) categories
 * with the v4 shadow output. It is OBSERVATIONAL ONLY:
 *   - does NOT notify providers, change lead visibility, or touch payments;
 *   - is gated by `ROUTING_SHADOW_ENABLED` (default OFF);
 *   - is fully error-isolated — a failure here can never break request creation.
 *
 * Candidate source for Phase 1 = the request's already-curated category names.
 * v4's contribution here is catch-all suppression + project_type / routing_tags /
 * routing_confidence signals. Broadening candidates from free text is Phase 2.
 * See `docs/ai-routing/marketplace-platform-routing-integration-audit.md`.
 */

import { prisma } from "@/lib/prisma";
import { classifyMultiRouting, ROUTING_VERSION } from "./multi-routing-v4";
import {
  buildCategoryNameIndex,
  mapNamesToCategoryIds,
  namesForIds,
  type CategoryNameIndex,
} from "./taxonomy-map";

/** Default OFF — production behavior is unchanged unless this is explicitly set. */
export function isShadowRoutingEnabled(): boolean {
  const v = (process.env.ROUTING_SHADOW_ENABLED ?? "").toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

// Small in-process TTL cache for the category index (the taxonomy changes rarely;
// shadow accuracy tolerates a few minutes of staleness). Mirrors the repo's other
// short-lived config caches.
const INDEX_TTL_MS = 5 * 60 * 1000;
let indexCache: { index: CategoryNameIndex; at: number } | null = null;

async function loadCategoryNameIndex(): Promise<CategoryNameIndex> {
  if (indexCache && Date.now() - indexCache.at < INDEX_TTL_MS) {
    return indexCache.index;
  }
  const [categories, aliases] = await Promise.all([
    prisma.category.findMany({
      select: { id: true, name: true, slug: true, externalSlug: true },
    }),
    prisma.categoryAlias.findMany({
      select: { categoryId: true, aliasName: true, aliasSlug: true },
    }),
  ]);
  const index = buildCategoryNameIndex(categories, aliases);
  indexCache = { index, at: Date.now() };
  return index;
}

export interface ShadowRoutingInput {
  requestId: string;
  title: string;
  description: string;
  /** Request location/city (already resolved; may be empty string). */
  city: string;
  status?: string;
  oldPrimaryCategoryId: string | null;
  oldCategoryIds: string[];
}

/**
 * Compute v4 shadow routing and persist a `RoutingDecisionLog` row. No-op when
 * disabled. Never throws — all errors are swallowed and logged so request
 * creation is unaffected.
 */
export async function runShadowRouting(input: ShadowRoutingInput): Promise<void> {
  if (!isShadowRoutingEnabled()) return;

  try {
    const index = await loadCategoryNameIndex();

    const oldCategoryNames = namesForIds(index, input.oldCategoryIds);
    const oldPrimaryCategoryName = input.oldPrimaryCategoryId
      ? index.nameById.get(input.oldPrimaryCategoryId) ?? null
      : null;

    const v4 = classifyMultiRouting({
      title: input.title,
      description: input.description,
      candidateCategories: oldCategoryNames,
      status: input.status,
    });

    const mapped = mapNamesToCategoryIds(index, v4.routingCategories);
    if (mapped.unmatched.length > 0) {
      console.warn(
        `[shadow-routing] request ${input.requestId}: ${mapped.unmatched.length} v4 ` +
          `categor${mapped.unmatched.length === 1 ? "y" : "ies"} did not map to a Category: ` +
          JSON.stringify(mapped.unmatched),
      );
    }

    await prisma.routingDecisionLog.create({
      data: {
        requestId: input.requestId,
        routingVersion: ROUTING_VERSION,
        oldPrimaryCategoryId: input.oldPrimaryCategoryId,
        oldPrimaryCategoryName,
        oldCategoryIds: input.oldCategoryIds,
        v4CategoryNames: v4.routingCategories,
        v4CategoryIds: mapped.matchedIds,
        unmatchedCategoryNames: mapped.unmatched,
        categoryCount: v4.routingCategories.length,
        projectType: v4.projectType,
        routingTags: v4.routingTags,
        routingConfidence: v4.routingConfidence,
      },
      select: { id: true },
    });
  } catch (error) {
    // Shadow must NEVER affect request creation.
    console.error("[shadow-routing] failed (ignored):", error);
  }
}
