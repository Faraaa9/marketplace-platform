import { NextResponse } from "next/server";
import { isMultilabelCategoriesEnabled } from "@/lib/platform-settings";
import { categorizeMultilabel } from "@/lib/category-multilabel";
import { prepareMarketplaceContext } from "@/lib/typesafe/marketplace-context";
import { evaluateMarketplaceRequest, TYPESAFE_PROMPT_VERSION } from "@/lib/typesafe/marketplace-intelligence";
import { categorizationTextHash, MULTILABEL_AI_FEATURE } from "@/lib/typesafe/shadow";
import { recordAiRun } from "@/lib/ai/audit";
import { getClientIp, rateLimitAsync } from "@/lib/rate-limit";
import { MULTILABEL_MAX_CHARS, MULTILABEL_RATE_LIMIT, multilabelRateKey } from "./limits";
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
  await recordAiRun({
    feature: MULTILABEL_AI_FEATURE,
    status: result.engine === "typesafe" ? "success" : "error",
    provider: "typesafe",
    model: result.model,
    promptVersion: TYPESAFE_PROMPT_VERSION,
    latencyMs: result.latencyMs,
    errorCode: result.engine === "typesafe" ? undefined : "TYPESAFE_API_FAILED",
    metadata: {
      engine: result.engine,
      textHash: categorizationTextHash(text),
      decision: result.decision,
      primaryCategoryId: result.primaryCategoryId,
    },
  });
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

async function categorizeWithSegmenter(text: string): Promise<MlJob[] | null> {
  const started = Date.now();
  const jobs = await categorizeMultilabel(text);
  await recordAiRun({
    feature: MULTILABEL_AI_FEATURE,
    status: jobs ? "success" : "error",
    provider: "openrouter",
    model: "segmenter",
    latencyMs: Date.now() - started,
    errorCode: jobs ? undefined : "SEGMENTER_FAILED",
    metadata: { engine: "segmenter", jobCount: jobs?.length ?? 0 },
  });
  return jobs;
}

export async function POST(req: Request) {
  try {
    if (!(await isMultilabelCategoriesEnabled())) {
      return NextResponse.json({ enabled: false });
    }
    const body = (await req.json().catch(() => ({}))) as { text?: unknown };
    const text = typeof body.text === "string" ? body.text.trim().slice(0, MULTILABEL_MAX_CHARS) : "";
    if (text.length < 5) {
      return NextResponse.json({ fallback: true });
    }
    const rl = await rateLimitAsync(multilabelRateKey(getClientIp(req)), MULTILABEL_RATE_LIMIT, {
      failClosed: true,
    });
    if (!rl.success) {
      return NextResponse.json({ fallback: true }, { status: 429 });
    }
    const jev = await categorizeWithJev(text).catch((error) => {
      console.error("[category-multilabel] Jev failed, using segmenter:", error);
      return null;
    });
    if (jev) return NextResponse.json({ enabled: true, ...jev });
    const jobs = await categorizeWithSegmenter(text);
    if (!jobs) return NextResponse.json({ fallback: true });
    return NextResponse.json({ enabled: true, jobs });
  } catch {
    // Never surface an error to the request-create flow.
    return NextResponse.json({ fallback: true });
  }
}
