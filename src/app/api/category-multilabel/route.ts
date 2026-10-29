import { NextResponse } from "next/server";
import { isMultilabelCategoriesEnabled } from "@/lib/platform-settings";
import { categorizeMultilabel } from "@/lib/category-multilabel";
import { prepareMarketplaceContext } from "@/lib/typesafe/marketplace-context";
import { evaluateMarketplaceRequest } from "@/lib/typesafe/marketplace-intelligence";
import type { MlJob } from "@/components/uzklausos-v2/MultilabelCategoryPicker";

// Multi-label categorization endpoint (Phase A, flag-gated).
//  - flag OFF        -> { enabled: false }  (form keeps current single-chip path)
//  - pipeline fails  -> { fallback: true }  (form falls back, no error shown)
//  - ok              -> { jobs: [...], preselect?: categoryId }

const MORE_LIMIT = 5;

// One request is usually one job. The LLM segmenter split e.g. a company party
// into six "jobs" with twelve chips (founder test 2026-10-29), so Jev picks one
// primary plus at most two extras from a single candidate pool instead; the
// segmenter stays as the fallback when Jev is unavailable.
async function categorizeWithJev(text: string): Promise<{ jobs: MlJob[]; preselect: string | null } | null> {
  if (!process.env.TYPESAFE_API_KEY?.trim()) return null;
  const result = await evaluateMarketplaceRequest(await prepareMarketplaceContext({ text, city: "" }));
  if (result.engine !== "typesafe" || result.decision === "reject") return null;
  const toChip = (c: { id: string; name: string }) => ({ categoryId: c.id, slug: "", name: c.name });
  const suggestions = result.categories.filter((c) => c.selected).map(toChip);
  if (suggestions.length === 0) return null;
  const more = result.categories
    .filter((c) => !c.selected)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, MORE_LIMIT)
    .map(toChip);
  return {
    jobs: [{ phrase: "", suggestions, more }],
    preselect: result.decision === "auto" ? result.primaryCategoryId : null,
  };
}

export async function POST(req: Request) {
  try {
    if (!(await isMultilabelCategoriesEnabled())) {
      return NextResponse.json({ enabled: false });
    }
    const { text } = (await req.json().catch(() => ({}))) as { text?: string };
    if (!text || text.trim().length < 5) {
      return NextResponse.json({ fallback: true });
    }
    const jev = await categorizeWithJev(text).catch((error) => {
      console.error("[category-multilabel] Jev failed, using segmenter:", error);
      return null;
    });
    if (jev) return NextResponse.json({ enabled: true, ...jev });
    const jobs = await categorizeMultilabel(text);
    if (!jobs) return NextResponse.json({ fallback: true });
    return NextResponse.json({ enabled: true, jobs });
  } catch {
    // Never surface an error to the request-create flow.
    return NextResponse.json({ fallback: true });
  }
}
