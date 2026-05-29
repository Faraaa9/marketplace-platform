import { NextRequest, NextResponse } from "next/server";
import { transcribeAudioSchema } from "@/lib/validations";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import { transcribeAudio, AiTranscribeError } from "@/lib/ai-transcribe";

export async function POST(req: NextRequest) {
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

    // ai_runs auditas (su realiu modeliu ir token sąnaudomis) loginamas
    // transcribeAudio viduje — vienodai web ir Telegram keliams.
    const text = await transcribeAudio(parsed.data.audio, "wav", { source: "web" });
    return NextResponse.json({ success: true, data: { text } });
  } catch (error) {
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
