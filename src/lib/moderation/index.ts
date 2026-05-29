import { normalize } from "./normalize";
import { checkBlocklist } from "./blocklist";
import { moderateWithAi, moderateImagesWithAi } from "./ai";
import { writeModerationLog } from "./log";
import { recordAiRun } from "@/lib/ai/audit";
import { resolvePromptVersion } from "@/lib/ai/prompt-config";

export type ModerationVerdict = "ok" | "review" | "reject";
export type ModerationSource = "blocklist" | "ai" | "ai_fallback";

export interface ModerationResult {
  verdict: ModerationVerdict;
  source: ModerationSource;
  categories: string[];
  reason: string | null;
  /** Vartotojui rodomas pranešimas — užpildomas tik kai verdict === "reject". */
  userMessage: string | null;
  matchedTerms: string[];
}

export interface ModerateInput {
  entityType: string;
  entityId?: string | null;
  /** Laukų pavadinimas -> reikšmė. Tušti / nenurodyti laukai praleidžiami. */
  fields: Record<string, string | null | undefined>;
  actorUserId?: string | null;
}

const REJECT_USER_MESSAGE =
  "Tekste aptikta netinkamo turinio. Pataisykite tekstą ir bandykite dar kartą.";
const MIN_TEXT_LENGTH = 3;
const TEXT_SAMPLE_MAX = 500;

function combineFields(fields: Record<string, string | null | undefined>): string {
  return Object.values(fields)
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .join("\n")
    .trim();
}

/**
 * Vienintelė vieša moderacijos funkcija. Sluoksniuotas pipeline:
 * normalizacija -> blocklist -> AI -> verdiktas. NIEKADA nemeta klaidos —
 * kvietėjai šakojasi tik pagal result.verdict.
 */
export async function moderateText(input: ModerateInput): Promise<ModerationResult> {
  const started = Date.now();
  const combined = combineFields(input.fields);

  // 1. Tuščias ar per trumpas tekstas — nėra ko tikrinti.
  if (combined.length < MIN_TEXT_LENGTH) {
    return {
      verdict: "ok",
      source: "blocklist",
      categories: [],
      reason: null,
      userMessage: null,
      matchedTerms: [],
    };
  }

  const sample = combined.slice(0, TEXT_SAMPLE_MAX);

  // 2. Blocklist — momentinis, nemokamas.
  const matched = checkBlocklist(normalize(combined));
  if (matched.length > 0) {
    const result: ModerationResult = {
      verdict: "reject",
      source: "blocklist",
      categories: ["profanity"],
      reason: `Užblokuoti žodžiai: ${matched.join(", ")}`,
      userMessage: REJECT_USER_MESSAGE,
      matchedTerms: matched,
    };
    await writeModerationLog({
      entityType: input.entityType,
      entityId: input.entityId,
      verdict: result.verdict,
      source: result.source,
      categories: result.categories,
      reason: result.reason,
      matchedTerms: matched,
      textSample: sample,
      latencyMs: Date.now() - started,
      actorUserId: input.actorUserId,
    });
    return result;
  }

  // 3. AI moderacija (timeout / klaida -> fallback į rankinę peržiūrą).
  const aiCall = await moderateWithAi(combined);
  const ai = aiCall.result;
  const result: ModerationResult = ai
    ? {
        verdict: ai.verdict,
        source: "ai",
        categories: ai.categories,
        reason: ai.reason,
        userMessage: ai.verdict === "reject" ? REJECT_USER_MESSAGE : null,
        matchedTerms: [],
      }
    : {
        verdict: "review",
        source: "ai_fallback",
        categories: [],
        reason: "AI moderacija neprieinama — peržiūrima rankiniu būdu.",
        userMessage: null,
        matchedTerms: [],
      };

  await writeModerationLog({
    entityType: input.entityType,
    entityId: input.entityId,
    verdict: result.verdict,
    source: result.source,
    categories: result.categories,
    reason: result.reason,
    textSample: sample,
    model: ai ? aiCall.model : null,
    latencyMs: Date.now() - started,
    actorUserId: input.actorUserId,
  });

  await recordAiRun({
    feature: "moderation",
    status: ai ? "success" : "error",
    provider: "openrouter",
    model: aiCall.model,
    promptVersion: await resolvePromptVersion("moderation_text", "moderation_text_v1"),
    latencyMs: Date.now() - started,
    actorUserId: input.actorUserId ?? undefined,
    entityType: input.entityType,
    entityId: input.entityId ?? undefined,
    errorCode: ai ? undefined : "MODERATION_AI_UNAVAILABLE",
    metadata: {
      modality: "text",
      verdict: result.verdict,
      source: result.source,
      promptTokens: aiCall.usage?.promptTokens ?? null,
      completionTokens: aiCall.usage?.completionTokens ?? null,
      totalTokens: aiCall.usage?.totalTokens ?? null,
    },
  });

  return result;
}

const VERDICT_RANK: Record<ModerationVerdict, number> = { ok: 0, review: 1, reject: 2 };

const REJECT_IMAGE_USER_MESSAGE =
  "Nuotraukose aptikta netinkamo turinio. Pakeiskite nuotraukas ir bandykite dar kartą.";

export interface ModerateImagesInput {
  entityType: string;
  entityId?: string | null;
  imageUrls: Array<string | null | undefined>;
  actorUserId?: string | null;
}

/**
 * Moderuoja nuotraukas (multimodalus AI per OpenRouter). Tuščias sąrašas -> "ok"
 * be iškvietimo. NIEKADA nemeta klaidos.
 */
export async function moderateImages(input: ModerateImagesInput): Promise<ModerationResult> {
  const started = Date.now();
  const urls = input.imageUrls.filter(
    (u): u is string => typeof u === "string" && u.trim().length > 0,
  );

  if (urls.length === 0) {
    return {
      verdict: "ok",
      source: "ai",
      categories: [],
      reason: null,
      userMessage: null,
      matchedTerms: [],
    };
  }

  const aiCall = await moderateImagesWithAi(urls);
  const ai = aiCall.result;
  const result: ModerationResult = ai
    ? {
        verdict: ai.verdict,
        source: "ai",
        categories: ai.categories,
        reason: ai.reason,
        userMessage: ai.verdict === "reject" ? REJECT_IMAGE_USER_MESSAGE : null,
        matchedTerms: [],
      }
    : {
        verdict: "review",
        source: "ai_fallback",
        categories: [],
        reason: "AI nuotraukų moderacija neprieinama — peržiūrima rankiniu būdu.",
        userMessage: null,
        matchedTerms: [],
      };

  await writeModerationLog({
    entityType: input.entityType,
    entityId: input.entityId,
    verdict: result.verdict,
    source: result.source,
    categories: result.categories,
    reason: result.reason,
    textSample: `[${urls.length} nuotrauka(-os)]`,
    model: ai ? aiCall.model : null,
    latencyMs: Date.now() - started,
    actorUserId: input.actorUserId,
  });

  await recordAiRun({
    feature: "moderation",
    status: ai ? "success" : "error",
    provider: "openrouter",
    model: aiCall.model,
    promptVersion: await resolvePromptVersion("moderation_image", "moderation_image_v1"),
    latencyMs: Date.now() - started,
    actorUserId: input.actorUserId ?? undefined,
    entityType: input.entityType,
    entityId: input.entityId ?? undefined,
    errorCode: ai ? undefined : "MODERATION_AI_UNAVAILABLE",
    metadata: {
      modality: "image",
      imageCount: urls.length,
      verdict: result.verdict,
      source: result.source,
      promptTokens: aiCall.usage?.promptTokens ?? null,
      completionTokens: aiCall.usage?.completionTokens ?? null,
      totalTokens: aiCall.usage?.totalTokens ?? null,
    },
  });

  return result;
}

/**
 * Sujungia kelis moderacijos rezultatus — laimi blogiausias verdiktas
 * (reject > review > ok).
 */
export function mergeModeration(...results: ModerationResult[]): ModerationResult {
  return results.reduce((worst, current) =>
    VERDICT_RANK[current.verdict] > VERDICT_RANK[worst.verdict] ? current : worst,
  );
}
