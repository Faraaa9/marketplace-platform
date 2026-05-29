import { resolveModel, resolvePrompt, resolvePromptVersion } from "@/lib/ai/prompt-config";
import { callOpenRouter } from "@/lib/ai/openrouter";
import { recordAiRun } from "@/lib/ai/audit";

// Gemini 2.5 Flash transcribes Lithuanian speech well and accepts audio input.
const MODEL = "google/gemini-2.5-flash";
const REQUEST_TIMEOUT_MS = 45_000;
const PROMPT_VERSION = "audio-transcribe-v1";

export class AiTranscribeError extends Error {}

/** Audio container the model should expect. Web records WAV; Telegram sends OGG/Opus. */
export type TranscribeAudioFormat = "wav" | "ogg" | "mp3";

/** Where the audio came from — recorded into ai_runs metadata for observability. */
export interface TranscribeAudit {
  source?: "web" | "telegram";
  actorUserId?: string;
}

/**
 * Transcribes a base64-encoded audio recording to Lithuanian text via OpenRouter.
 * `format` defaults to "wav" for the browser recorder; the Telegram bot passes
 * "ogg" for voice notes. Logs every run (web AND Telegram) to ai_runs with the
 * model actually used.
 */
export async function transcribeAudio(
  audioBase64: string,
  format: TranscribeAudioFormat = "wav",
  audit: TranscribeAudit = {},
): Promise<string> {
  const source = audit.source ?? "web";
  const model = await resolveModel("audio_transcribe", MODEL);
  const promptVersion = await resolvePromptVersion("audio_transcribe", PROMPT_VERSION);
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    await recordAiRun({
      feature: "audio_transcribe",
      status: "error",
      provider: "openrouter",
      model,
      promptVersion,
      actorUserId: audit.actorUserId,
      errorCode: "AI_NOT_CONFIGURED",
      metadata: { source },
    });
    throw new AiTranscribeError("AI_NOT_CONFIGURED");
  }

  const systemPrompt = await resolvePrompt("audio_transcribe", "system");
  const call = await callOpenRouter({
    apiKey,
    model,
    timeoutMs: REQUEST_TIMEOUT_MS,
    temperature: 0,
    maxTokens: 2000,
    reasoning: false,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: "Transkribuok šį garso įrašą." },
          { type: "input_audio", input_audio: { data: audioBase64, format } },
        ],
      },
    ],
  });

  if (!call.ok || call.content === null) {
    const code = call.errorKind === "timeout" ? "AI_TIMEOUT" : "AI_REQUEST_FAILED";
    await recordAiRun({
      feature: "audio_transcribe",
      status: "error",
      provider: "openrouter",
      model: call.model,
      promptVersion,
      latencyMs: call.latencyMs,
      actorUserId: audit.actorUserId,
      errorCode: code,
      metadata: { source, attempts: call.attempts },
    });
    throw new AiTranscribeError(code);
  }

  const text = call.content.trim();
  await recordAiRun({
    feature: "audio_transcribe",
    status: "success",
    provider: "openrouter",
    model: call.model,
    promptVersion,
    latencyMs: call.latencyMs,
    actorUserId: audit.actorUserId,
    metadata: {
      source,
      textLength: text.length,
      attempts: call.attempts,
      promptTokens: call.usage?.promptTokens ?? null,
      completionTokens: call.usage?.completionTokens ?? null,
      totalTokens: call.usage?.totalTokens ?? null,
    },
  });
  return text;
}
