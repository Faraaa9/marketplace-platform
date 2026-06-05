import { NextRequest, NextResponse } from "next/server";
import { improveDescriptionSchema } from "@/lib/validations";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import { improveDescription, AiImproveError } from "@/lib/ai-improve";
import { isAiTouchpointEnabled } from "@/lib/ai/prompt-config";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimitAsync(`ai:improve:${ip}`, RATE_LIMITS.aiImprove);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Bandykite vėliau." },
        { status: 429 }
      );
    }
    if (!(await isAiTouchpointEnabled("request_improve"))) {
      return NextResponse.json(
        { success: false, error: "AI sutvarkymas šiuo metu išjungtas" },
        { status: 503 }
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

    // ai_runs auditas (su realiu modeliu, prompto versija ir token sąnaudomis)
    // loginamas improveDescription viduje.
    const result = await improveDescription(parsed.data);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
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
