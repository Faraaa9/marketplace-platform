import { NextResponse } from "next/server";
import { isMultilabelCategoriesEnabled } from "@/lib/platform-settings";
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
    const jobs = await categorizeMultilabel(text);
    if (!jobs) return NextResponse.json({ fallback: true });
    return NextResponse.json({ enabled: true, jobs });
  } catch {
    // Never surface an error to the request-create flow.
    return NextResponse.json({ fallback: true });
  }
}
