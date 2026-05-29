import { resolveModel, resolvePrompt } from "@/lib/ai/prompt-config";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 10_000;

export type AiVerdict = "ok" | "review" | "reject";

export interface AiModerationResult {
  verdict: AiVerdict;
  categories: string[];
  reason: string | null;
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
 * Iškviečia OpenRouter moderacijai. Grąžina null esant BET KOKIAI klaidai
 * (timeout, nėra API rakto, blogas atsakymas) — orchestratorius tai traktuoja
 * kaip "ai_fallback" -> "review". Funkcija niekada nemeta klaidos.
 */
export async function moderateWithAi(text: string): Promise<AiModerationResult | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const model = await resolveModel("moderation_text", process.env.OPENROUTER_MODEL || DEFAULT_MODEL);
  const systemPrompt = await resolvePrompt("moderation_text", "system");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "paslaugurinka.lt",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 300,
        reasoning: { enabled: false },
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Tekstas moderacijai:\n"""\n${text}\n"""` },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Moderacijos AI klaida:", res.status, detail);
      return null;
    }

    const data = (await res.json().catch(() => null)) as
      | { choices?: Array<{ message?: { content?: string } }> }
      | null;
    const raw = data?.choices?.[0]?.message?.content;
    if (typeof raw !== "string" || raw.trim().length === 0) return null;

    return parseResult(raw);
  } catch (err) {
    const name = (err as { name?: string } | null)?.name;
    if (name === "AbortError") {
      console.warn("Moderacijos AI viršijo laiko limitą — peržiūrima rankiniu būdu.");
    } else {
      console.error("Moderacijos AI iškvietimo klaida:", err);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

const IMAGE_REQUEST_TIMEOUT_MS = 12_000;
const MAX_IMAGES_PER_CALL = 10;

/**
 * Iškviečia OpenRouter (multimodalų modelį) nuotraukų moderacijai. URL'us
 * modelis pasiima tiesiogiai. Grąžina null esant bet kokiai klaidai —
 * orchestratorius tai traktuoja kaip "ai_fallback" -> "review".
 */
export async function moderateImagesWithAi(
  urls: string[],
): Promise<AiModerationResult | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const images = urls.slice(0, MAX_IMAGES_PER_CALL);
  if (images.length === 0) return { verdict: "ok", categories: [], reason: null };

  const model = await resolveModel("moderation_image", process.env.OPENROUTER_MODEL || DEFAULT_MODEL);
  const systemPrompt = await resolvePrompt("moderation_image", "system");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Title": "paslaugurinka.lt",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 300,
        reasoning: { enabled: false },
        response_format: { type: "json_object" },
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
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Moderacijos AI (nuotraukos) klaida:", res.status, detail);
      return null;
    }

    const data = (await res.json().catch(() => null)) as
      | { choices?: Array<{ message?: { content?: string } }> }
      | null;
    const raw = data?.choices?.[0]?.message?.content;
    if (typeof raw !== "string" || raw.trim().length === 0) return null;

    return parseResult(raw);
  } catch (err) {
    const name = (err as { name?: string } | null)?.name;
    if (name === "AbortError") {
      console.warn("Moderacijos AI (nuotraukos) viršijo laiko limitą — peržiūrima rankiniu būdu.");
    } else {
      console.error("Moderacijos AI (nuotraukos) iškvietimo klaida:", err);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
