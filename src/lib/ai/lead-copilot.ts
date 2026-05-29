import { recordAiRun } from "@/lib/ai/audit";
import { resolveModel, resolvePrompt, resolvePromptVersion } from "@/lib/ai/prompt-config";
import { callOpenRouter } from "@/lib/ai/openrouter";

const DEFAULT_MODEL = "google/gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 18_000;
export const PROMPT_VERSION = "lead-copilot-v1";

export class AiLeadCopilotError extends Error {}

export interface LeadCopilotProviderContext {
  name: string;
  headline?: string | null;
  description?: string | null;
  services?: string | null;
  location?: string | null;
  experienceYears?: number | null;
  categoryNames: string[];
  offersInvoices: boolean;
  availableForUrgent: boolean;
  reviewCount: number;
  averageRating?: number | null;
}

export interface LeadCopilotRequestContext {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  budget?: string | null;
  deadline?: string | null;
  totalResponses: number;
  isUnlocked: boolean;
}

export interface LeadCopilotAuditContext {
  actorUserId: string;
  providerProfileId: string;
}

export interface LeadCopilotResult {
  fitSummary: string;
  fitReasons: string[];
  questions: string[];
  riskSignals: string[];
  nextStep: string;
  confidence: number;
}

function clampText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function clampList(value: unknown, maxItems: number, maxChars: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => clampText(item, maxChars))
    .filter(Boolean)
    .slice(0, maxItems);
}

function parseResult(raw: string): LeadCopilotResult | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;

  const fitSummary = clampText(obj.fitSummary, 240);
  const fitReasons = clampList(obj.fitReasons, 4, 180);
  const questions = clampList(obj.questions, 4, 180);
  const riskSignals = clampList(obj.riskSignals, 3, 180);
  const nextStep = clampText(obj.nextStep, 220);
  const confidenceRaw = typeof obj.confidence === "number" ? obj.confidence : 0.5;
  const confidence = Math.round(Math.max(0, Math.min(1, confidenceRaw)) * 100) / 100;

  if (!fitSummary || fitReasons.length === 0 || !nextStep) return null;

  return {
    fitSummary,
    fitReasons,
    questions,
    riskSignals,
    nextStep,
    confidence,
  };
}

function buildProviderBlock(provider: LeadCopilotProviderContext): string {
  const lines: string[] = [`Vardas / įmonė: ${provider.name}`];
  if (provider.headline) lines.push(`Antraštė: ${provider.headline}`);
  if (provider.location) lines.push(`Tiekėjo vieta: ${provider.location}`);
  if (provider.categoryNames.length > 0) {
    lines.push(`Pasirinktos kategorijos: ${provider.categoryNames.join(", ")}`);
  }
  if (provider.experienceYears) lines.push(`Patirtis: ${provider.experienceYears} m.`);
  if (provider.description) lines.push(`Aprašymas: ${provider.description.slice(0, 1200)}`);
  if (provider.services) lines.push(`Paslaugos: ${provider.services.slice(0, 900)}`);
  if (provider.offersInvoices) lines.push("Išrašo sąskaitas faktūras.");
  if (provider.availableForUrgent) lines.push("Gali imtis skubių darbų.");
  if (provider.averageRating && provider.reviewCount > 0) {
    lines.push(`Atsiliepimai: ${provider.averageRating.toFixed(1)}/5 (${provider.reviewCount})`);
  } else if (provider.reviewCount > 0) {
    lines.push(`Atsiliepimų skaičius: ${provider.reviewCount}`);
  }
  return lines.join("\n");
}

function buildRequestBlock(request: LeadCopilotRequestContext): string {
  const lines = [
    `Pavadinimas: ${request.title}`,
    `Kategorija: ${request.category}`,
    `Vietovė: ${request.location}`,
    `Būsena: ${request.isUnlocked ? "kontaktai atrakinti" : "kontaktai dar užrakinti"}`,
    `Atsakymų skaičius: ${request.totalResponses}`,
  ];
  if (request.budget) lines.push(`Biudžetas: ${request.budget}`);
  if (request.deadline) lines.push(`Terminas: ${request.deadline}`);
  lines.push(`Aprašymas: ${request.description.slice(0, 1800)}`);
  return lines.join("\n");
}

export async function generateLeadCopilot(
  provider: LeadCopilotProviderContext,
  request: LeadCopilotRequestContext,
  audit: LeadCopilotAuditContext,
): Promise<LeadCopilotResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = await resolveModel("lead_copilot", process.env.OPENROUTER_MODEL || DEFAULT_MODEL);

  if (!apiKey) {
    await recordAiRun({
      feature: "lead_copilot",
      status: "error",
      provider: "openrouter",
      model,
      promptVersion: PROMPT_VERSION,
      actorUserId: audit.actorUserId,
      entityType: "ServiceRequest",
      entityId: request.id,
      errorCode: "AI_NOT_CONFIGURED",
      metadata: {
        providerProfileId: audit.providerProfileId,
        unlocked: request.isUnlocked,
      },
    });
    throw new AiLeadCopilotError("AI_NOT_CONFIGURED");
  }

  const userContent = `TIEKĖJO PROFILIS:\n${buildProviderBlock(provider)}\n\nKLIENTO UŽKLAUSA:\n${buildRequestBlock(request)}`;
  const systemPrompt = await resolvePrompt("lead_copilot", "system");
  const promptVersion = await resolvePromptVersion("lead_copilot", PROMPT_VERSION);

  const call = await callOpenRouter({
    apiKey,
    model,
    timeoutMs: REQUEST_TIMEOUT_MS,
    temperature: 0.25,
    maxTokens: 900,
    reasoning: false,
    jsonObject: true,
    title: "paslaugurinka.lt lead-copilot",
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
      feature: "lead_copilot",
      status: "error",
      provider: "openrouter",
      model: call.model,
      promptVersion,
      latencyMs: call.latencyMs,
      actorUserId: audit.actorUserId,
      entityType: "ServiceRequest",
      entityId: request.id,
      errorCode: code,
      metadata: {
        providerProfileId: audit.providerProfileId,
        unlocked: request.isUnlocked,
        attempts: call.attempts,
      },
    });
    throw new AiLeadCopilotError(code);
  }

  await recordAiRun({
    feature: "lead_copilot",
    status: "success",
    provider: "openrouter",
    model: call.model,
    promptVersion,
    latencyMs: call.latencyMs,
    actorUserId: audit.actorUserId,
    entityType: "ServiceRequest",
    entityId: request.id,
    metadata: {
      providerProfileId: audit.providerProfileId,
      unlocked: request.isUnlocked,
      confidence: result.confidence,
      questions: result.questions.length,
      risks: result.riskSignals.length,
      attempts: call.attempts,
      promptTokens: call.usage?.promptTokens ?? null,
      completionTokens: call.usage?.completionTokens ?? null,
      totalTokens: call.usage?.totalTokens ?? null,
      costUsd: call.usage?.costUsd ?? null,
    },
  });

  return result;
}
