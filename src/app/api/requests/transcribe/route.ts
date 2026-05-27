import { NextRequest, NextResponse } from "next/server";
import { transcribeAudioSchema } from "@/lib/validations";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import { transcribeAudio, AiTranscribeError } from "@/lib/ai-transcribe";
import { recordAiRun } from "@/lib/ai/audit";

export async function POST(req: NextRequest) {
  let aiStartedAt: number | null = null;
  try {
    const ip = getClientIp(req);
    const rl = await rateLimitAsync(
      `ai:transcribe:${ip}`,
      RATE_LIMITS.aiTranscribe,
    );
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Bandykite vėliau." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const parsed = transcribeAudioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues?.[0]?.message || "Validacijos klaida",
        },
        { status: 400 },
      );
    }

    aiStartedAt = Date.now();
    const text = await transcribeAudio(parsed.data.audio);
    await recordAiRun({
      feature: "audio_transcribe",
      status: "success",
      provider: "openrouter",
      model: "google/gemini-2.5-flash",
      promptVersion: "audio-transcribe-v1",
      latencyMs: Date.now() - aiStartedAt,
      metadata: { textLength: text.length },
    });
    return NextResponse.json({ success: true, data: { text } });
  } catch (error) {
    if (aiStartedAt) {
      await recordAiRun({
        feature: "audio_transcribe",
        status: "error",
        provider: "openrouter",
        model: "google/gemini-2.5-flash",
        promptVersion: "audio-transcribe-v1",
        latencyMs: Date.now() - aiStartedAt,
        errorCode: error instanceof AiTranscribeError ? error.message : "TRANSCRIBE_FAILED",
      });
    }
    if (error instanceof AiTranscribeError) {
      if (error.message === "AI_NOT_CONFIGURED") {
        return NextResponse.json(
          { success: false, error: "Diktavimo funkcija šiuo metu neprieinama" },
          { status: 503 },
        );
      }
      if (error.message === "AI_TIMEOUT") {
        return NextResponse.json(
          {
            success: false,
            error: "Transkripcija užtruko per ilgai. Bandykite dar kartą.",
          },
          { status: 504 },
        );
      }
      return NextResponse.json(
        {
          success: false,
          error: "Nepavyko atpažinti kalbos. Bandykite dar kartą.",
        },
        { status: 502 },
      );
    }
    console.error("Transkripcijos route klaida:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko atpažinti kalbos" },
      { status: 500 },
    );
  }
}
