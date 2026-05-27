import { NextRequest, NextResponse } from "next/server";
import { improveDescriptionSchema } from "@/lib/validations";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import { improveDescription, AiImproveError } from "@/lib/ai-improve";
import { recordAiRun } from "@/lib/ai/audit";

export async function POST(req: NextRequest) {
  let aiStartedAt: number | null = null;
  try {
    const ip = getClientIp(req);
    const rl = await rateLimitAsync(`ai:improve:${ip}`, RATE_LIMITS.aiImprove);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Bandykite vėliau." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = improveDescriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues?.[0]?.message || "Validacijos klaida" },
        { status: 400 }
      );
    }

    aiStartedAt = Date.now();
    const result = await improveDescription(parsed.data);
    await recordAiRun({
      feature: "request_improve",
      status: "success",
      provider: "openrouter",
      model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash",
      promptVersion: "request-improve-v1",
      latencyMs: Date.now() - aiStartedAt,
      metadata: {
        hasTitle: Boolean(parsed.data.title),
        hasCategory: Boolean(parsed.data.category),
        recommendations: result.recommendations.length,
      },
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (aiStartedAt) {
      await recordAiRun({
        feature: "request_improve",
        status: "error",
        provider: "openrouter",
        model: process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash",
        promptVersion: "request-improve-v1",
        latencyMs: Date.now() - aiStartedAt,
        errorCode: error instanceof AiImproveError ? error.message : "REQUEST_FAILED",
      });
    }
    if (error instanceof AiImproveError) {
      if (error.message === "AI_NOT_CONFIGURED") {
        return NextResponse.json(
          { success: false, error: "AI funkcija šiuo metu neprieinama" },
          { status: 503 }
        );
      }
      if (error.message === "AI_TIMEOUT") {
        return NextResponse.json(
          { success: false, error: "AI atsakymas užtruko per ilgai. Bandykite dar kartą." },
          { status: 504 }
        );
      }
      if (error.message === "AI_EMPTY_RESPONSE" || error.message === "AI_REQUEST_FAILED") {
        console.warn("AI improve failed:", { errorMsg: error.message });
        return NextResponse.json(
          { success: false, error: "AI nepavyko sutvarkyti aprašymo — užpildykite laukus patys." },
          { status: 422 }
        );
      }
      return NextResponse.json(
        { success: false, error: "Nepavyko patobulinti aprašymo. Bandykite vėliau." },
        { status: 502 }
      );
    }
    console.error("AI improve route error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko patobulinti aprašymo" },
      { status: 500 }
    );
  }
}
