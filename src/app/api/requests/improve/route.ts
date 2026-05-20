import { NextRequest, NextResponse } from "next/server";
import { improveDescriptionSchema } from "@/lib/validations";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import { improveDescription, AiImproveError } from "@/lib/ai-improve";

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

    const body = await req.json();
    const parsed = improveDescriptionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues?.[0]?.message || "Validacijos klaida" },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { success: false, error: "Nepavyko patobulinti aprašymo. Bandykite vėliau." },
        { status: 502 }
      );
    }
    console.error("AI improve route klaida:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko patobulinti aprašymo" },
      { status: 500 }
    );
  }
}
