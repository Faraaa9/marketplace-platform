import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveProvider } from "@/lib/provider-guard";
import { rateLimitAsync, RATE_LIMITS } from "@/lib/rate-limit";
import { generateProposalDraft, AiProposalError } from "@/lib/ai-proposal";
import { isAiTouchpointEnabled } from "@/lib/ai/prompt-config";
import { checkEligibility } from "@/lib/provider-eligibility";
import { activeCategoryFilter } from "@/lib/category-matching";

/**
 * Generates an AI proposal draft for the provider, built from their own
 * profile + reviews and the client's request. Read-only — writes nothing,
 * sends nothing. The provider edits and submits the draft via the normal
 * response endpoint.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  let requestId: string | null = null;
  let actorUserId: string | null = null;
  let providerProfileId: string | null = null;
  try {
    const { id } = await params;
    requestId = id;
    const guard = await requireActiveProvider();
    if (!guard.authorized) return guard.response;
    actorUserId = guard.userId;
    providerProfileId = guard.providerProfileId;
    if (!(await isAiTouchpointEnabled("proposal_draft"))) {
      return NextResponse.json(
        { success: false, error: "AI pasiūlymo juodraštis šiuo metu išjungtas" },
        { status: 503 },
      );
    }

    const rl = await rateLimitAsync(`ai:proposal:${guard.userId}`, RATE_LIMITS.aiProposal);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Bandykite vėliau." },
        { status: 429 },
      );
    }

    const [request, profile, user, reviews] = await Promise.all([
      prisma.serviceRequest.findUnique({
        where: { id },
        select: {
          title: true,
          description: true,
          status: true,
          clientId: true,
          moderationStatus: true,
          categoryRef: { select: { id: true, rootId: true, parentId: true, name: true } },
          location: true,
          budget: true,
          deadline: true,
          clientName: true,
        },
      }),
      prisma.providerProfile.findUnique({
        where: { userId: guard.userId },
        select: {
          headline: true,
          description: true,
          services: true,
          experienceYears: true,
          categories: {
            where: activeCategoryFilter(),
            select: { category: { select: { id: true, rootId: true, name: true } } },
            orderBy: { sortOrder: "asc" },
          },
          offersInvoices: true,
          availableForUrgent: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: guard.userId },
        select: { name: true },
      }),
      prisma.review.findMany({
        where: { providerId: guard.userId, comment: { not: null } },
        select: { rating: true, comment: true },
        orderBy: { rating: "desc" },
        take: 3,
      }),
    ]);

    // Unmoderated requests are invisible to providers; don't spend AI on them.
    if (!request || request.moderationStatus !== "APPROVED") {
      return NextResponse.json({ success: false, error: "Užklausa nerasta" }, { status: 404 });
    }

    // Same gate as responding: no draft for a request the provider can't answer.
    const eligibility = checkEligibility(
      guard.userId,
      { status: request.status, clientId: request.clientId, category: request.categoryRef },
      (profile?.categories ?? []).map((c) => c.category),
    );
    if (!eligibility.allowed) {
      return NextResponse.json(
        { success: false, error: eligibility.message, code: eligibility.code },
        { status: 403 },
      );
    }

    const categoryLabel = request.categoryRef?.name ?? "";

    const result = await generateProposalDraft(
      {
        name: user?.name?.trim() || "Tiekėjas",
        headline: profile?.headline ?? null,
        description: profile?.description ?? null,
        services: profile?.services ?? null,
        experienceYears: profile?.experienceYears ?? null,
        categoryNames: profile?.categories.map((c) => c.category.name) ?? [],
        offersInvoices: profile?.offersInvoices ?? false,
        availableForUrgent: profile?.availableForUrgent ?? false,
        reviews: reviews
          .map((r) => ({ rating: r.rating, comment: (r.comment ?? "").trim() }))
          .filter((r) => r.comment.length > 0),
      },
      {
        title: request.title,
        description: request.description,
        category: categoryLabel,
        location: request.location,
        budget: request.budget,
        deadline: request.deadline,
        clientName: request.clientName,
      },
      {
        actorUserId: actorUserId ?? undefined,
        requestId: requestId ?? undefined,
        providerProfileId,
      },
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof AiProposalError) {
      if (error.message === "AI_NOT_CONFIGURED") {
        return NextResponse.json(
          { success: false, error: "AI funkcija šiuo metu neprieinama" },
          { status: 503 },
        );
      }
      if (error.message === "AI_TIMEOUT") {
        return NextResponse.json(
          { success: false, error: "AI atsakymas užtruko per ilgai. Bandykite dar kartą." },
          { status: 504 },
        );
      }
      return NextResponse.json(
        { success: false, error: "Nepavyko sukurti pasiūlymo. Bandykite vėliau." },
        { status: 502 },
      );
    }
    console.error("AI proposal route klaida:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko sukurti pasiūlymo" },
      { status: 500 },
    );
  }
}
