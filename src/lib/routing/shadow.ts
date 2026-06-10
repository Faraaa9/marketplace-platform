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
 * Candidate source for Phase 1 = the request's already-curated categories, each
 * carried as `{ categoryId, categoryName }`. v4 only SUPPRESSES candidates (catch-all
 * dropping) and adds project_type / routing_tags / routing_confidence — it never
 * adds a category — so every kept category keeps the request's ORIGINAL id and we
 * never re-resolve a name back to an id (ambiguous for DISTINCT_TAX duplicates).
 * Broadening candidates from free text is Phase 2. See
 * `docs/ai-routing/phase-a2-routing-contract-plan.md`.
 */

import { prisma } from "@/lib/prisma";
import { classifyMultiRouting, ROUTING_VERSION, fold, type RoutingCandidate } from "./multi-routing-v4";
import { enqueueRoutingReview, isRoutingReviewEnabled } from "./review-queue";
import {
  buildCategoryNameIndex,
  mapNamesToCategoryIds,
  type CategoryNameIndex,
} from "./taxonomy-map";

/** Default OFF — production behavior is unchanged unless this is explicitly set. */
export function isShadowRoutingEnabled(): boolean {
  const v = (process.env.ROUTING_SHADOW_ENABLED ?? "").toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

// Category name→id index. As of Phase A2 this is used ONLY to resolve genuinely
// PROPOSED category names (Phase 2 free-text broadening) — Phase 1 candidates
// carry their own ids and never touch this. Kept behind a small in-process TTL
// cache (the taxonomy changes rarely; staleness is tolerable), mirroring the
// repo's other short-lived config caches.
const INDEX_TTL_MS = 5 * 60 * 1000;
let indexCache: { index: CategoryNameIndex; at: number } | null = null;

async function loadCategoryNameIndex(): Promise<CategoryNameIndex> {
  if (indexCache && Date.now() - indexCache.at < INDEX_TTL_MS) {
    return indexCache.index;
  }
  const [categories, aliases] = await Promise.all([
    prisma.category.findMany({
      // Live taxonomy only. The category table holds three id-spaces — the
      // curated `tax_*` service rows plus two dead snapshots (`barehex` leaf/hub
      // rows + legacy `svc-*` rows) with heavily duplicated names. Indexing all
      // of them made name→id non-deterministic (buildCategoryNameIndex is
      // first-writer-wins) and frequently resolved a correct name to a dead id
      // no provider is attached to. The active service rows are exactly the
      // canonical `tax_` id-space. See docs/ai-routing/taxonomy-deduplication-audit.md.
      where: { pageType: "service", isActive: true },
      select: { id: true, name: true, slug: true, externalSlug: true },
    }),
    prisma.categoryAlias.findMany({
      select: { categoryId: true, aliasName: true, aliasSlug: true },
    }),
  ]);
  // Stable order so any remaining same-name collisions WITHIN the live taxonomy
  // resolve deterministically across deploys. (Truly disambiguating those needs
  // the v4 routing-contract change — see the audit's Phase A2 — not just sorting.)
  const ordered = [...categories].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const index = buildCategoryNameIndex(ordered, aliases);

  // Visibility into UNRESOLVED ambiguity: names that still map to >1 active
  // service category (the DISTINCT_TAX case from the de-dup audit). First-writer
  // -wins on the sorted list picks one deterministically, but the choice is
  // semantically arbitrary — these genuinely need the v4 routing-contract fix,
  // not a data merge. Logged once per index refresh (TTL-cached, so low-noise).
  const idsByName = new Map<string, string[]>();
  for (const c of ordered) {
    const f = fold(c.name);
    if (!f) continue;
    const ids = idsByName.get(f) ?? [];
    ids.push(c.id);
    idsByName.set(f, ids);
  }
  const ambiguous = [...idsByName.entries()].filter(([, ids]) => ids.length > 1);
  if (ambiguous.length > 0) {
    console.warn(
      `[shadow-routing] ${ambiguous.length} category name(s) map to >1 active service id ` +
        `(DISTINCT_TAX — name→id pick is deterministic but arbitrary until the v4 routing ` +
        `contract is fixed). e.g. ` +
        ambiguous
          .slice(0, 5)
          .map(([f, ids]) => `"${f}"→[${ids.join(", ")}]`)
          .join("; "),
    );
  }

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
    // Resolve the request's OWN categories by id — a deterministic id→name lookup,
    // NOT the ambiguous global name→id remap. Each candidate carries its id so v4
    // keeps it through suppression. See docs/ai-routing/phase-a2-routing-contract-plan.md.
    const idToName = new Map<string, string>();
    if (input.oldCategoryIds.length > 0) {
      const rows = await prisma.category.findMany({
        where: { id: { in: input.oldCategoryIds } },
        select: { id: true, name: true },
      });
      for (const r of rows) idToName.set(r.id, r.name);
    }
    const candidates: RoutingCandidate[] = input.oldCategoryIds
      .map((id) => ({ categoryId: id, categoryName: idToName.get(id) ?? "" }))
      .filter((c) => c.categoryName !== "");
    const oldPrimaryCategoryName = input.oldPrimaryCategoryId
      ? idToName.get(input.oldPrimaryCategoryId) ?? null
      : null;

    const v4 = classifyMultiRouting({
      title: input.title,
      description: input.description,
      candidates,
      status: input.status,
    });

    // Phase 1: v4 only SUPPRESSES candidates, so every kept category keeps the
    // request's ORIGINAL id — no name→id remap, no DISTINCT_TAX ambiguity.
    const v4CategoryNames = v4.routingCategories.map((c) => c.categoryName);
    const v4CategoryIds = v4.routingCategories.map((c) => c.categoryId);

    // Reserved for Phase 2: a name v4 returns that was NOT among the request's
    // candidates is a genuinely PROPOSED category — only THOSE go through the
    // taxonomy map. None occur in Phase 1 (the classifier never adds a category),
    // so this branch is inert today; it keeps the contract forward-safe.
    const candidateNames = new Set(candidates.map((c) => fold(c.categoryName)));
    const proposedNames = v4CategoryNames.filter((n) => !candidateNames.has(fold(n)));
    let unmatchedCategoryNames: string[] = [];
    if (proposedNames.length > 0) {
      const index = await loadCategoryNameIndex();
      const mapped = mapNamesToCategoryIds(index, proposedNames);
      v4CategoryIds.push(...mapped.matchedIds);
      unmatchedCategoryNames = mapped.unmatched;
      console.warn(
        `[shadow-routing] request ${input.requestId}: ${proposedNames.length} proposed ` +
          `categor${proposedNames.length === 1 ? "y" : "ies"} resolved via taxonomy map ` +
          `(${mapped.unmatched.length} unmatched).`,
      );
    }

    const log = await prisma.routingDecisionLog.create({
      data: {
        requestId: input.requestId,
        routingVersion: ROUTING_VERSION,
        oldPrimaryCategoryId: input.oldPrimaryCategoryId,
        oldPrimaryCategoryName,
        oldCategoryIds: input.oldCategoryIds,
        v4CategoryNames,
        v4CategoryIds,
        unmatchedCategoryNames,
        categoryCount: v4CategoryNames.length,
        projectType: v4.projectType,
        routingTags: v4.routingTags,
        routingConfidence: v4.routingConfidence,
      },
      select: { id: true },
    });

    // ── Routing Review Queue enqueue hook ─────────────────────────────────
    // Gated by ROUTING_REVIEW_QUEUE_ENABLED (default OFF) on top of the shadow
    // flag — the v4 decision is only computed here. Idempotent per
    // (requestId, routingVersion) and error-isolated inside enqueueRoutingReview,
    // so it can never affect the decision log write above or request creation.
    if (isRoutingReviewEnabled()) {
      await enqueueRoutingReview({
        requestId: input.requestId,
        decisionLogId: log.id,
        routingVersion: ROUTING_VERSION,
        title: input.title,
        description: input.description,
        city: input.city,
        requestStatus: input.status ?? null,
        aiPrimaryCategoryId: v4CategoryIds[0] ?? null,
        aiPrimaryCategoryName: v4CategoryNames[0] ?? null,
        aiCategoryIds: v4CategoryIds,
        aiCategoryNames: v4CategoryNames,
        aiConfidence: v4.routingConfidence,
        // v4 is deterministic/rule-based — no LLM model id to record.
        aiModel: null,
      });
    }
  } catch (error) {
    // Shadow must NEVER affect request creation.
    console.error("[shadow-routing] failed (ignored):", error);
  }
}
