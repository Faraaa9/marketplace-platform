/**
 * Routing Review Queue (MVP) — human-in-the-loop correction loop for AI routing.
 *
 * A RoutingReviewItem snapshots the routed request + the AI routing decision;
 * a human reviewer then APPROVES the AI decision or CORRECTS it. Reviewed rows
 * export as eval data in the repo's golden-eval JSONL shape
 * (data/routing/eval/golden_eval_300_labeled.jsonl):
 *   suggested_* = the AI decision, gold_* = the human label.
 *
 * Enqueueing is gated by `ROUTING_REVIEW_QUEUE_ENABLED` (default OFF) and is
 * fully error-isolated — a failure here can never break request creation.
 * The automatic enqueue hook lives inside `runShadowRouting` (shadow.ts), so it
 * also requires `ROUTING_SHADOW_ENABLED` — the v4 decision is only computed
 * there. Manual enqueue from an existing RoutingDecisionLog goes through
 * POST /api/admin/routing-review.
 */

import { prisma } from "@/lib/prisma";

/** Default OFF — production behavior is unchanged unless this is explicitly set. */
export function isRoutingReviewEnabled(): boolean {
  const v = (process.env.ROUTING_REVIEW_QUEUE_ENABLED ?? "").toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export const REVIEW_STATUSES = ["PENDING", "APPROVED", "CORRECTED"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export interface RoutingReviewEnqueueInput {
  requestId: string;
  decisionLogId?: string | null;
  routingVersion: string;
  title: string;
  description: string;
  city: string;
  requestStatus?: string | null;
  aiPrimaryCategoryId: string | null;
  aiPrimaryCategoryName: string | null;
  aiCategoryIds: string[];
  aiCategoryNames: string[];
  aiConfidence: number | null;
  aiModel?: string | null;
}

/**
 * Insert a review item. Idempotent per (requestId, routingVersion): a duplicate
 * enqueue is silently skipped via the unique constraint, so re-running shadow
 * routing or manual re-enqueue never clobbers an in-progress review.
 * Never throws — errors are logged and swallowed (same contract as shadow.ts).
 */
export async function enqueueRoutingReview(input: RoutingReviewEnqueueInput): Promise<void> {
  try {
    await prisma.routingReviewItem.create({
      data: {
        requestId: input.requestId,
        decisionLogId: input.decisionLogId ?? null,
        routingVersion: input.routingVersion,
        title: input.title,
        description: input.description,
        city: input.city,
        requestStatus: input.requestStatus ?? null,
        aiPrimaryCategoryId: input.aiPrimaryCategoryId,
        aiPrimaryCategoryName: input.aiPrimaryCategoryName,
        aiCategoryIds: input.aiCategoryIds,
        aiCategoryNames: input.aiCategoryNames,
        aiConfidence: input.aiConfidence,
        aiModel: input.aiModel ?? null,
      },
      select: { id: true },
    });
  } catch (error) {
    // P2002 = already enqueued for this (requestId, routingVersion) — expected, not an error.
    const code = (error as { code?: string } | null)?.code;
    if (code === "P2002") return;
    console.error("[routing-review] enqueue failed (ignored):", error);
  }
}

// ── Review submission (approve / correct) ────────────────────────────────

export interface ReviewSubmission {
  action: "approve" | "correct";
  /** Empty string is a legitimate gold label for ambiguous requests. */
  correctedPrimaryCategoryId: string | null;
  correctedPrimaryCategoryName: string | null;
  correctedCategoryIds: string[];
  correctedCategoryNames: string[];
  correctedIsAmbiguous: boolean;
  correctionNotes: string | null;
}

type ParseResult = { ok: true; value: ReviewSubmission } | { ok: false; error: string };

function asStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const item of v) {
    if (typeof item !== "string") return null;
    const t = item.trim();
    if (t) out.push(t);
  }
  return out;
}

/**
 * Validate the PATCH body for a review submission. Pure — no DB, no env.
 *
 * Rules mirror the golden-eval label semantics:
 * - "approve": the AI decision IS the gold label; correction fields are ignored.
 * - "correct": needs corrected category ids+names of equal length. An EMPTY
 *   correction is only valid when `isAmbiguous` is true (matches gold rows with
 *   empty gold_primary_category, e.g. multi-trade projects).
 */
export function parseReviewSubmission(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Netinkamas užklausos formatas" };
  }
  const b = body as Record<string, unknown>;
  const action = b.action;
  if (action !== "approve" && action !== "correct") {
    return { ok: false, error: "Netinkamas veiksmas" };
  }

  const notes =
    typeof b.notes === "string" && b.notes.trim() ? b.notes.trim().slice(0, 2000) : null;

  if (action === "approve") {
    return {
      ok: true,
      value: {
        action,
        correctedPrimaryCategoryId: null,
        correctedPrimaryCategoryName: null,
        correctedCategoryIds: [],
        correctedCategoryNames: [],
        correctedIsAmbiguous: false,
        correctionNotes: notes,
      },
    };
  }

  const ids = asStringArray(b.correctedCategoryIds);
  const names = asStringArray(b.correctedCategoryNames);
  if (ids === null || names === null) {
    return { ok: false, error: "Netinkamos kategorijos" };
  }
  if (ids.length !== names.length) {
    return { ok: false, error: "Kategorijų id ir pavadinimų skaičius nesutampa" };
  }
  const isAmbiguous = b.isAmbiguous === true;
  if (ids.length === 0 && !isAmbiguous) {
    return { ok: false, error: "Korekcija be kategorijų galima tik pažymėjus ambiguous" };
  }

  const primaryId =
    typeof b.correctedPrimaryCategoryId === "string" && b.correctedPrimaryCategoryId.trim()
      ? b.correctedPrimaryCategoryId.trim()
      : null;
  const primaryName =
    typeof b.correctedPrimaryCategoryName === "string" && b.correctedPrimaryCategoryName.trim()
      ? b.correctedPrimaryCategoryName.trim()
      : null;
  if (primaryId && !ids.includes(primaryId)) {
    return { ok: false, error: "Pagrindinė kategorija turi būti tarp pasirinktų kategorijų" };
  }

  return {
    ok: true,
    value: {
      action,
      correctedPrimaryCategoryId: primaryId,
      correctedPrimaryCategoryName: primaryName,
      correctedCategoryIds: ids,
      correctedCategoryNames: names,
      correctedIsAmbiguous: isAmbiguous,
      correctionNotes: notes,
    },
  };
}

// ── Eval export (golden_eval JSONL shape) ────────────────────────────────

/** The subset of RoutingReviewItem fields the export needs. */
export interface ReviewItemForExport {
  requestId: string;
  title: string;
  description: string;
  city: string;
  requestStatus: string | null;
  aiPrimaryCategoryName: string | null;
  aiCategoryNames: string[];
  status: string;
  correctedPrimaryCategoryName: string | null;
  correctedCategoryNames: string[];
  correctedIsAmbiguous: boolean | null;
  correctionNotes: string | null;
  reviewedAt: Date | null;
}

/**
 * One line of the eval export. Field names/semantics match
 * data/routing/eval/golden_eval_300_labeled.jsonl so reviewed items can be
 * appended to (or evaluated alongside) the existing golden set:
 * suggested_* = AI decision, gold_* = human label, labeled/labeled_at = review.
 * `request_id` is the platform cuid (the golden set uses legacy numeric ids;
 * the eval tooling treats it as an opaque key).
 */
export interface EvalRecord {
  request_id: string;
  title: string;
  description: string;
  city: string;
  status: string;
  suggested_primary_category: string;
  suggested_secondary_categories: string[];
  gold_primary_category: string;
  gold_secondary_categories: string[];
  gold_tags: string[];
  gold_notes: string;
  gold_is_ambiguous: boolean;
  labeled: boolean;
  labeled_at: string | null;
}

/**
 * Map a REVIEWED item (APPROVED or CORRECTED) to an eval record. Pure.
 * APPROVED → gold = the AI decision. CORRECTED → gold = the human correction.
 * Returns null for PENDING items — unreviewed rows are not labels.
 */
export function buildEvalRecord(item: ReviewItemForExport): EvalRecord | null {
  if (item.status !== "APPROVED" && item.status !== "CORRECTED") return null;

  const corrected = item.status === "CORRECTED";
  const goldPrimary = corrected
    ? item.correctedPrimaryCategoryName ?? ""
    : item.aiPrimaryCategoryName ?? "";
  const goldAll = corrected ? item.correctedCategoryNames : item.aiCategoryNames;
  const goldSecondary = goldAll.filter((n) => n !== goldPrimary);

  const suggestedPrimary = item.aiPrimaryCategoryName ?? "";
  const suggestedSecondary = item.aiCategoryNames.filter((n) => n !== suggestedPrimary);

  return {
    request_id: item.requestId,
    title: item.title,
    description: item.description,
    city: item.city,
    status: item.requestStatus ?? "",
    suggested_primary_category: suggestedPrimary,
    suggested_secondary_categories: suggestedSecondary,
    gold_primary_category: goldPrimary,
    gold_secondary_categories: goldSecondary,
    gold_tags: [],
    gold_notes: item.correctionNotes ?? "",
    gold_is_ambiguous: item.correctedIsAmbiguous ?? false,
    labeled: true,
    labeled_at: item.reviewedAt ? item.reviewedAt.toISOString() : null,
  };
}
