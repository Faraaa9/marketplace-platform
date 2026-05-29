import { resolveModel, resolvePrompt } from "@/lib/ai/prompt-config";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
// Same model as ai-improve.ts — Gemini 2.5-flash handles Lithuanian best and
// lets us turn reasoning off, keeping this short generative task fast.
const DEFAULT_MODEL = "google/gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 30_000;
// Headroom under responseSchema's 2000-char limit so the draft always submits.
const MAX_MESSAGE_CHARS = 1900;
const MAX_REVIEW_CHARS = 300;

export class AiProposalError extends Error {}

export interface ProposalReview {
  rating: number;
  comment: string;
}

export interface ProposalProviderContext {
  name: string;
  headline?: string | null;
  description?: string | null;
  services?: string | null;
  experienceYears?: number | null;
  /** Curated category names the provider serves. */
  categoryNames: string[];
  offersInvoices: boolean;
  availableForUrgent: boolean;
  reviews: ProposalReview[];
}

export interface ProposalRequestContext {
  title: string;
  description: string;
  category: string;
  location: string;
  budget?: string | null;
  deadline?: string | null;
  clientName?: string | null;
}

export interface ProposalDraftResult {
  message: string;
}

function parseResult(raw: string): ProposalDraftResult | null {
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

  const message =
    typeof (obj as Record<string, unknown>).message === "string"
      ? ((obj as Record<string, unknown>).message as string).trim()
      : "";
  if (message.length < 10) return null;

  return { message: message.slice(0, MAX_MESSAGE_CHARS) };
}

function buildProviderBlock(provider: ProposalProviderContext): string {
  const lines: string[] = [`Vardas: ${provider.name}`];
  if (provider.headline) lines.push(`Antraštė: ${provider.headline}`);
  if (provider.categoryNames.length) {
    lines.push(`Veiklos sritys: ${provider.categoryNames.join(", ")}`);
  }
  if (provider.experienceYears) lines.push(`Patirtis: ${provider.experienceYears} m.`);
  if (provider.description) lines.push(`Apie tiekėją: ${provider.description}`);
  if (provider.services) lines.push(`Teikiamos paslaugos: ${provider.services}`);
  if (provider.offersInvoices) lines.push("Išrašo sąskaitas faktūras.");
  if (provider.availableForUrgent) lines.push("Imasi skubių darbų.");
  if (provider.reviews.length) {
    const reviews = provider.reviews
      .map((r) => `- (${r.rating}/5) ${r.comment.slice(0, MAX_REVIEW_CHARS)}`)
      .join("\n");
    lines.push(`Klientų atsiliepimai:\n${reviews}`);
  }
  return lines.join("\n");
}

function buildRequestBlock(request: ProposalRequestContext): string {
  const lines: string[] = [
    `Pavadinimas: ${request.title}`,
    `Kategorija: ${request.category}`,
    `Vietovė: ${request.location}`,
  ];
  if (request.budget) lines.push(`Biudžetas: ${request.budget}`);
  if (request.deadline) lines.push(`Terminas: ${request.deadline}`);
  if (request.clientName) lines.push(`Kliento vardas: ${request.clientName}`);
  lines.push(`Aprašymas: ${request.description}`);
  return lines.join("\n");
}

export async function generateProposalDraft(
  provider: ProposalProviderContext,
  request: ProposalRequestContext,
): Promise<ProposalDraftResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new AiProposalError("AI_NOT_CONFIGURED");
  }

  const userContent = `INFORMACIJA APIE TIEKĖJĄ:\n${buildProviderBlock(provider)}\n\nKLIENTO UŽKLAUSA:\n${buildRequestBlock(request)}`;
  const model = await resolveModel("proposal_draft", process.env.OPENROUTER_MODEL || DEFAULT_MODEL);
  const systemPrompt = await resolvePrompt("proposal_draft", "system");

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
        temperature: 0.4,
        max_tokens: 1500,
        reasoning: { enabled: false },
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("OpenRouter klaida (pasiūlymas):", res.status, detail);
      throw new AiProposalError("AI_REQUEST_FAILED");
    }

    const data = (await res.json().catch(() => null)) as
      | { choices?: Array<{ message?: { content?: string } }> }
      | null;
    const raw = data?.choices?.[0]?.message?.content;
    if (typeof raw !== "string" || raw.trim().length === 0) {
      throw new AiProposalError("AI_EMPTY_RESPONSE");
    }

    const result = parseResult(raw);
    if (!result) {
      throw new AiProposalError("AI_EMPTY_RESPONSE");
    }
    return result;
  } catch (err) {
    if (err instanceof AiProposalError) throw err;
    const name = (err as { name?: string } | null)?.name;
    throw new AiProposalError(name === "AbortError" ? "AI_TIMEOUT" : "AI_REQUEST_FAILED");
  } finally {
    clearTimeout(timeout);
  }
}
