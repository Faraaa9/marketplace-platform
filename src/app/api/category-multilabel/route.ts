import { NextResponse } from "next/server";
import { isMultilabelCategoriesEnabled, isCategorizationV2Enabled } from "@/lib/platform-settings";
import { categorizeMultilabel } from "@/lib/category-multilabel";

// Multi-label categorization endpoint (Phase A, flag-gated).
//  - flag OFF        -> { enabled: false }  (form keeps current single-chip path)
//  - pipeline fails  -> { fallback: true }  (form falls back, no error shown)
//  - ok              -> { jobs: [...] }

export async function POST(req: Request) {
  try {
    if (!(await isMultilabelCategoriesEnabled())) {
      return NextResponse.json({ enabled: false });
    }
    const { text } = (await req.json().catch(() => ({}))) as { text?: string };
    if (!text || text.trim().length < 5) {
      return NextResponse.json({ fallback: true });
    }
    const v2 = await isCategorizationV2Enabled();
    const jobs = await categorizeMultilabel(text, { v2 });
    if (!jobs) return NextResponse.json({ fallback: true });
    return NextResponse.json({ enabled: true, jobs });
  } catch {
    // Never surface an error to the request-create flow.
    return NextResponse.json({ fallback: true });
  }
}
