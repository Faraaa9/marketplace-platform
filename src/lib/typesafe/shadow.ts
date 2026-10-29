import { recordAiRun } from "@/lib/ai/audit";
import { enqueueRoutingReview, isRoutingReviewEnabled } from "@/lib/routing/review-queue";
import { evaluateMarketplaceRequest, TYPESAFE_PROMPT_VERSION } from "./marketplace-intelligence";
import { prepareMarketplaceContext } from "./marketplace-context";

const SHADOW_VERSION = "typesafe-jev-shadow-v1";

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
}): Promise<void> {
  if (!isTypeSafeShadowEnabled() || !process.env.TYPESAFE_API_KEY?.trim()) return;

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

