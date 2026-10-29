import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { recordAiRun } from "@/lib/ai/audit";
import { enqueueRoutingReview, isRoutingReviewEnabled } from "@/lib/routing/review-queue";
import { evaluateMarketplaceRequest, TYPESAFE_PROMPT_VERSION } from "./marketplace-intelligence";
import { prepareMarketplaceContext } from "./marketplace-context";

const SHADOW_VERSION = "typesafe-jev-shadow-v1";
export const MULTILABEL_AI_FEATURE = "category_multilabel";
const FORM_EVAL_REUSE_MS = 24 * 60 * 60 * 1000;

/** Whitespace/case-insensitive fingerprint, so the form's `title description`
 *  and the saved request's `title\n\ndescription` hash the same. */
export function categorizationTextHash(text: string): string {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

// The request form already ran Jev on this exact text via /api/category-multilabel;
// paying for it again teaches us nothing.
async function formAlreadyEvaluated(textHash: string): Promise<boolean> {
  const row = await prisma.aiRun.findFirst({
    where: {
      feature: MULTILABEL_AI_FEATURE,
      status: "success",
      createdAt: { gt: new Date(Date.now() - FORM_EVAL_REUSE_MS) },
      metadataJson: { contains: textHash },
    },
    select: { id: true },
  });
  return row !== null;
}

export function isTypeSafeShadowEnabled(): boolean {
  const value = (process.env.TYPESAFE_SHADOW_ENABLED ?? "").toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

export async function runTypeSafeShadow(input: {
  requestId: string;
  title: string;
  description: string;
  city: string;
  status: string;
  moderationStatus: string;
}): Promise<void> {
  if (!isTypeSafeShadowEnabled() || !process.env.TYPESAFE_API_KEY?.trim()) return;
  // Pending/flagged requests may never go live; spend nothing on them.
  if (input.moderationStatus !== "APPROVED") return;
  if (await formAlreadyEvaluated(categorizationTextHash(`${input.title} ${input.description}`))) return;

  const started = Date.now();
  try {
    const context = await prepareMarketplaceContext({
      text: `${input.title}\n\n${input.description}`,
      city: input.city,
    });
    const result = await evaluateMarketplaceRequest(context);
    await recordAiRun({
      feature: "typesafe_marketplace_shadow",
      status: result.engine === "typesafe" ? "success" : "error",
      provider: "typesafe",
      model: result.model,
      promptVersion: TYPESAFE_PROMPT_VERSION,
      latencyMs: result.latencyMs,
      entityType: "ServiceRequest",
      entityId: input.requestId,
      errorCode: result.engine === "typesafe" ? undefined : "TYPESAFE_API_FAILED",
      metadata: {
        decision: result.decision,
        primaryCategoryId: result.primaryCategoryId,
        primaryConfidence: result.primaryConfidence,
        spamProbability: result.spamProbability,
        ambiguityProbability: result.ambiguityProbability,
        urgencyProbability: result.urgencyProbability,
        missingDetailsProbability: result.missingDetailsProbability,
        selectedCategoryIds: result.categories.filter((category) => category.selected).map((category) => category.id),
        providerCount: result.providers.length,
      },
    });

    if (result.engine !== "typesafe" || result.decision === "auto" || !isRoutingReviewEnabled()) return;
    const selected = result.categories.filter((category) => category.selected);
    await enqueueRoutingReview({
      requestId: input.requestId,
      routingVersion: SHADOW_VERSION,
      title: input.title,
      description: input.description,
      city: input.city,
      requestStatus: input.status,
      aiPrimaryCategoryId: result.primaryCategoryId,
      aiPrimaryCategoryName: result.primaryCategoryName,
      aiCategoryIds: selected.map((category) => category.id),
      aiCategoryNames: selected.map((category) => category.name),
      aiConfidence: result.primaryConfidence,
      aiModel: result.model,
    });
  } catch (error) {
    console.error("[typesafe-shadow] failed (ignored):", error);
    await recordAiRun({
      feature: "typesafe_marketplace_shadow",
      status: "error",
      provider: "typesafe",
      promptVersion: TYPESAFE_PROMPT_VERSION,
      latencyMs: Date.now() - started,
      entityType: "ServiceRequest",
      entityId: input.requestId,
      errorCode: "SHADOW_FAILED",
    });
  }
}

