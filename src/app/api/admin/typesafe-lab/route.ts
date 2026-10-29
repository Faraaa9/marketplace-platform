import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { recordAiRun } from "@/lib/ai/audit";
import { getClientIp, rateLimitAsync } from "@/lib/rate-limit";
import { evaluateMarketplaceRequest, TYPESAFE_PROMPT_VERSION } from "@/lib/typesafe/marketplace-intelligence";
import { prepareMarketplaceContext } from "@/lib/typesafe/marketplace-context";

const payloadSchema = z.object({
  text: z.string().trim().min(10, "Aprašymas per trumpas").max(4000, "Aprašymas per ilgas"),
  city: z.string().trim().max(120, "Miestas per ilgas").default(""),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const rate = await rateLimitAsync(
    `typesafe-lab:${session.user.id}:${getClientIp(request)}`,
    { maxRequests: 30, windowMs: 60 * 60 * 1000 },
  );
  if (!rate.success) {
    return NextResponse.json(
      { success: false, error: "Pasiektas valandinis bandymų limitas" },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message || "Netinkami duomenys" },
      { status: 400 },
    );
  }

  const started = Date.now();
  try {
    const context = await prepareMarketplaceContext(parsed.data);
    const result = await evaluateMarketplaceRequest(context);
    await recordAiRun({
      feature: "typesafe_marketplace_lab",
      status: result.engine === "typesafe" ? "success" : result.fallbackReason === "api_error" ? "error" : "success",
      provider: result.engine === "typesafe" ? "typesafe" : "deterministic",
      model: result.model,
      promptVersion: TYPESAFE_PROMPT_VERSION,
      latencyMs: result.latencyMs,
      actorUserId: session.user.id,
      errorCode: result.fallbackReason === "api_error" ? "TYPESAFE_API_FAILED" : undefined,
      metadata: {
        engine: result.engine,
        decision: result.decision,
        candidateCategories: context.categories.length,
        candidateProviders: context.providers.length,
        selectedCategories: result.categories.filter((category) => category.selected).length,
        inputTokens: result.usage?.inputTokens ?? null,
        outputTokens: result.usage?.outputTokens ?? null,
      },
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("TypeSafe lab error:", error);
    await recordAiRun({
      feature: "typesafe_marketplace_lab",
      status: "error",
      provider: "typesafe",
      promptVersion: TYPESAFE_PROMPT_VERSION,
      latencyMs: Date.now() - started,
      actorUserId: session.user.id,
      errorCode: "LAB_FAILED",
    });
    return NextResponse.json({ success: false, error: "Nepavyko atlikti vertinimo" }, { status: 500 });
  }
}

