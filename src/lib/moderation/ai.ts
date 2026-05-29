import { resolveModel, resolvePrompt } from "@/lib/ai/prompt-config";
import { callOpenRouter, type OpenRouterUsage } from "@/lib/ai/openrouter";

const DEFAULT_MODEL = "google/gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 10_000;

export type AiVerdict = "ok" | "review" | "reject";

export interface AiModerationResult {
  verdict: AiVerdict;
  categories: string[];
  reason: string | null;
}

/**
 * moderateWithAi / moderateImagesWithAi grąžinimas: verdiktas (arba null esant
 * klaidai -> "review") plius realiai naudotas modelis ir token sąnaudos auditui.
 */
export interface AiModerationCall {
  result: AiModerationResult | null;
  model: string;
  usage: OpenRouterUsage | null;
}

const ALLOWED_CATEGORIES = new Set<string>([
  "profanity",
  "hate",
  "sexual",
  "violence",
  "scam",
  "spam",
  "other",
]);

function parseResult(raw: string): AiModerationResult | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let obj: unknown;
  try {
    obj = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (!obj || typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;

  const verdict = record.verdict;
  if (verdict !== "ok" && verdict !== "review" && verdict !== "reject") return null;

  const categories = Array.isArray(record.categories)
    ? record.categories
        .filter((c): c is string => typeof c === "string")
        .map((c) => c.toLowerCase().trim())
        .filter((c) => ALLOWED_CATEGORIES.has(c))
    : [];

  const reason =
    typeof record.reason === "string" && record.reason.trim().length > 0
      ? record.reason.trim().slice(0, 300)
      : null;

  return { verdict, categories, reason };
}

/**
 * Iškviečia OpenRouter teksto moderacijai. result=null esant BET KOKIAI klaidai
 * (timeout, nėra API rakto, blogas atsakymas) — orchestratorius tai traktuoja
 * kaip "ai_fallback" -> "review". Niekada nemeta klaidos. Grąžina ir realiai
 * naudotą modelį bei token sąnaudas auditui.
 */
export async function moderateWithAi(text: string): Promise<AiModerationCall> {
  const model = await resolveModel("moderation_text", process.env.OPENROUTER_MODEL || DEFAULT_MODEL);
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { result: null, model, usage: null };

  const systemPrompt = await resolvePrompt("moderation_text", "system");
  const call = await callOpenRouter({
    apiKey,
    model,
    timeoutMs: REQUEST_TIMEOUT_MS,
    temperature: 0,
    maxTokens: 300,
    reasoning: false,
    jsonObject: true,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Tekstas moderacijai:\n"""\n${text}\n"""` },
    ],
  });

  const result = call.ok && call.content !== null ? parseResult(call.content) : null;
  return { result, model: call.model, usage: call.usage };
}

const IMAGE_REQUEST_TIMEOUT_MS = 12_000;
const MAX_IMAGES_PER_CALL = 10;

/**
 * Iškviečia OpenRouter (multimodalų modelį) nuotraukų moderacijai. URL'us
 * modelis pasiima tiesiogiai. Grąžina null esant bet kokiai klaidai —
 * orchestratorius tai traktuoja kaip "ai_fallback" -> "review".
 */
export async function moderateImagesWithAi(urls: string[]): Promise<AiModerationCall> {
  const model = await resolveModel("moderation_image", process.env.OPENROUTER_MODEL || DEFAULT_MODEL);
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { result: null, model, usage: null };

  const images = urls.slice(0, MAX_IMAGES_PER_CALL);
  if (images.length === 0) {
    return { result: { verdict: "ok", categories: [], reason: null }, model, usage: null };
  }

  const systemPrompt = await resolvePrompt("moderation_image", "system");
  const call = await callOpenRouter({
    apiKey,
    model,
    timeoutMs: IMAGE_REQUEST_TIMEOUT_MS,
    temperature: 0,
    maxTokens: 300,
    reasoning: false,
    jsonObject: true,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: "Įvertink šias nuotraukas:" },
          ...images.map((url) => ({ type: "image_url", image_url: { url } })),
        ],
      },
    ],
  });

  const result = call.ok && call.content !== null ? parseResult(call.content) : null;
  return { result, model: call.model, usage: call.usage };
}
