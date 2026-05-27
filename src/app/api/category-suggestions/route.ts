import { NextRequest, NextResponse } from "next/server";
import { categorySuggestionsSchema } from "@/lib/validations";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import { suggestCategories } from "@/lib/category-suggestions";
import { recordAiRun } from "@/lib/ai/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let aiStartedAt: number | null = null;
  let mode: string | null = null;
  try {
    const ip = getClientIp(req);
    const rl = await rateLimitAsync(`ai:category-suggest:${ip}`, RATE_LIMITS.aiImprove);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Bandykite vėliau." },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = categorySuggestionsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues?.[0]?.message || "Validacijos klaida",
        },
        { status: 400 },
      );
    }

    mode = parsed.data.mode;
    aiStartedAt = Date.now();
    const result = await suggestCategories({
      mode: parsed.data.mode,
      text: parsed.data.text,
      title: parsed.data.title || undefined,
      limit: parsed.data.limit,
    });
    await recordAiRun({
      feature: "category_suggest",
      status: "success",
      provider: process.env.OPENROUTER_API_KEY ? "openrouter" : "deterministic",
      model: process.env.OPENROUTER_API_KEY
        ? process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash"
        : undefined,
      promptVersion: "category-suggest-v1",
      latencyMs: Date.now() - aiStartedAt,
      metadata: {
        mode: parsed.data.mode,
        suggestions: result.suggestions.length,
        hasClarification: Boolean(result.clarificationQuestion),
      },
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (aiStartedAt) {
      await recordAiRun({
        feature: "category_suggest",
        status: "error",
        provider: process.env.OPENROUTER_API_KEY ? "openrouter" : "deterministic",
        model: process.env.OPENROUTER_API_KEY
          ? process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash"
          : undefined,
        promptVersion: "category-suggest-v1",
        latencyMs: Date.now() - aiStartedAt,
        errorCode: "CATEGORY_SUGGEST_FAILED",
        metadata: { mode },
      });
    }
    console.error("Category suggestions error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko parinkti kategorijos. Bandykite vėliau." },
      { status: 500 },
    );
  }
}
