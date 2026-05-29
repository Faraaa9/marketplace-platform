import { resolveModel, resolvePrompt, resolvePromptVersion } from "@/lib/ai/prompt-config";
import { callOpenRouter } from "@/lib/ai/openrouter";
import { recordAiRun } from "@/lib/ai/audit";

// Same model as ai-improve.ts — Gemini 2.5-flash handles Lithuanian best and
// lets us turn reasoning off, keeping this short generative task fast.
const DEFAULT_MODEL = "google/gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 30_000;
const PROMPT_VERSION = "proposal-draft-v1";
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

export interface ProposalAudit {
  actorUserId?: string;
  requestId?: string;
  providerProfileId?: string | null;
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
  audit: ProposalAudit = {},
): Promise<ProposalDraftResult> {
  const model = await resolveModel("proposal_draft", process.env.OPENROUTER_MODEL || DEFAULT_MODEL);
  const promptVersion = await resolvePromptVersion("proposal_draft", PROMPT_VERSION);
  const apiKey = process.env.OPENROUTER_API_KEY;
  const entityType = audit.requestId ? "ServiceRequest" : undefined;

  if (!apiKey) {
    await recordAiRun({
      feature: "proposal_draft",
      status: "error",
      provider: "openrouter",
      model,
      promptVersion,
      actorUserId: audit.actorUserId,
      entityType,
      entityId: audit.requestId,
      errorCode: "AI_NOT_CONFIGURED",
      metadata: { providerProfileId: audit.providerProfileId },
    });
    throw new AiProposalError("AI_NOT_CONFIGURED");
  }

  const userContent = `INFORMACIJA APIE TIEKĖJĄ:\n${buildProviderBlock(provider)}\n\nKLIENTO UŽKLAUSA:\n${buildRequestBlock(request)}`;
  const systemPrompt = await resolvePrompt("proposal_draft", "system");

  const call = await callOpenRouter({
    apiKey,
    model,
    timeoutMs: REQUEST_TIMEOUT_MS,
    temperature: 0.4,
    maxTokens: 1500,
    reasoning: false,
    jsonObject: true,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });

  const result = call.ok && call.content !== null ? parseResult(call.content) : null;

  if (!result) {
    const code =
      call.errorKind === "timeout"
        ? "AI_TIMEOUT"
        : !call.ok
          ? "AI_REQUEST_FAILED"
          : "AI_EMPTY_RESPONSE";
    await recordAiRun({
      feature: "proposal_draft",
      status: "error",
      provider: "openrouter",
      model: call.model,
      promptVersion,
      latencyMs: call.latencyMs,
      actorUserId: audit.actorUserId,
      entityType,
      entityId: audit.requestId,
      errorCode: code,
      metadata: { providerProfileId: audit.providerProfileId, attempts: call.attempts },
    });
    throw new AiProposalError(code);
  }

  await recordAiRun({
    feature: "proposal_draft",
    status: "success",
    provider: "openrouter",
    model: call.model,
    promptVersion,
    latencyMs: call.latencyMs,
    actorUserId: audit.actorUserId,
    entityType,
    entityId: audit.requestId,
    metadata: {
      providerProfileId: audit.providerProfileId,
      messageLength: result.message.length,
      reviews: provider.reviews.length,
      attempts: call.attempts,
      promptTokens: call.usage?.promptTokens ?? null,
      completionTokens: call.usage?.completionTokens ?? null,
      totalTokens: call.usage?.totalTokens ?? null,
      costUsd: call.usage?.costUsd ?? null,
    },
  });

  return result;
}
