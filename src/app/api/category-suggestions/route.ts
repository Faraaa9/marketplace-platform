import { NextRequest, NextResponse, connection } from "next/server";
import { categorySuggestionsSchema } from "@/lib/validations";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import { suggestCategories } from "@/lib/category-suggestions";

export async function POST(req: NextRequest) {
  await connection();
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

    // ai_runs auditas (su realiu modeliu ir tikslia AI sėkme/fallback žyme)
    // loginamas suggestCategories viduje.
    const result = await suggestCategories({
      mode: parsed.data.mode,
      text: parsed.data.text,
      title: parsed.data.title || undefined,
      limit: parsed.data.limit,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Category suggestions error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko parinkti kategorijos. Bandykite vėliau." },
      { status: 500 },
    );
  }
}
