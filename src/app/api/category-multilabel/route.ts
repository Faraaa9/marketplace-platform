import { NextResponse } from "next/server";
import { recognizeCategories } from "@/lib/category-recognition";

// Two-layer category recognition endpoint.
//  PRIMARY  = prototype engine (segment -> embed -> pgvector k50 -> LLM rerank)
//  FALLBACK = deterministic suggestCategories (any primary failure -> silent fall)
//  kill switch = platform_settings.categorizationV2Enabled (OFF -> all fallback)
// Always returns { categories: [{id,name}], source: "prototype"|"fallback" }.
// Never surfaces an error to the request-create flow.
export async function POST(req: Request) {
  try {
    const { text } = (await req.json().catch(() => ({}))) as { text?: string };
    if (!text || text.trim().length < 5) {
      return NextResponse.json({ categories: [], source: "fallback" });
    }
    const result = await recognizeCategories(text);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ categories: [], source: "fallback" });
  }
}
