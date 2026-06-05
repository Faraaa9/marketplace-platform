import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveProvider } from "@/lib/provider-guard";
import { checkEligibility } from "@/lib/provider-eligibility";
import { activeCategoryFilter } from "@/lib/category-matching";
import { isLeadUnlocked } from "@/lib/credits";
import { rateLimitAsync, RATE_LIMITS } from "@/lib/rate-limit";
import { generateLeadCopilot, AiLeadCopilotError } from "@/lib/ai/lead-copilot";
import { isAiTouchpointEnabled } from "@/lib/ai/prompt-config";

/**
 * Read-only lead co-pilot. Gives the provider short decision support for a
 * request; it never unlocks the lead, sends messages, or writes response text.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  try {
    const { id } = await params;
    const guard = await requireActiveProvider();
    if (!guard.authorized) return guard.response;
    if (!(await isAiTouchpointEnabled("lead_copilot"))) {
      return NextResponse.json(
        { success: false, error: "Lead co-pilot šiuo metu išjungtas" },
        { status: 503 },
      );
    }

    const rl = await rateLimitAsync(`ai:lead-copilot:${guard.userId}`, RATE_LIMITS.aiLeadCopilot);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Bandykite vėliau." },
        { status: 429 },
      );
    }

    const [request, profile, user, unlocked] = await Promise.all([
      prisma.serviceRequest.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          status: true,
          clientId: true,
          categoryRef: { select: { id: true, rootId: true, name: true } },
          location: true,
          budget: true,
          deadline: true,
          _count: { select: { responses: true } },
          responses: {
            where: { providerId: guard.userId },
            select: { id: true },
            take: 1,
          },
        },
      }),
      prisma.providerProfile.findUnique({
        where: { id: guard.providerProfileId },
        select: {
          displayName: true,
          headline: true,
          description: true,
          services: true,
          location: true,
          experienceYears: true,
          offersInvoices: true,
          availableForUrgent: true,
          rating: true,
          reviewCount: true,
          categories: {
            where: activeCategoryFilter(),
            select: {
              category: { select: { id: true, rootId: true, name: true } },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: guard.userId },
        select: { name: true },
      }),
      isLeadUnlocked(guard.providerProfileId, id),
    ]);

    if (!request) {
      return NextResponse.json({ success: false, error: "Užklausa nerasta" }, { status: 404 });
    }

    const providerCategories = (profile?.categories ?? []).map((c) => c.category);
    const eligibility = checkEligibility(
      guard.userId,
      { status: request.status, clientId: request.clientId, category: request.categoryRef },
      providerCategories,
    );
    if (!eligibility.allowed) {
      return NextResponse.json(
        { success: false, error: eligibility.message, code: eligibility.code },
        { status: 403 },
      );
    }

    if (request.responses.length > 0) {
      return NextResponse.json(
        { success: false, error: "Jau atsakėte į šią užklausą" },
        { status: 400 },
      );
    }

    const result = await generateLeadCopilot(
      {
        name: profile?.displayName?.trim() || user?.name?.trim() || "Tiekėjas",
        headline: profile?.headline ?? null,
        description: profile?.description ?? null,
        services: profile?.services ?? null,
        location: profile?.location ?? null,
        experienceYears: profile?.experienceYears ?? null,
        categoryNames: providerCategories.map((category) => category.name),
        offersInvoices: profile?.offersInvoices ?? false,
        availableForUrgent: profile?.availableForUrgent ?? false,
        reviewCount: profile?.reviewCount ?? 0,
        averageRating: profile?.rating ?? null,
      },
      {
        id: request.id,
        title: request.title,
        description: request.description,
        category: request.categoryRef?.name ?? request.category,
        location: request.location,
        budget: request.budget,
        deadline: request.deadline,
        totalResponses: request._count.responses,
        isUnlocked: unlocked,
      },
      {
        actorUserId: guard.userId,
        providerProfileId: guard.providerProfileId,
      },
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof AiLeadCopilotError) {
      if (error.message === "AI_NOT_CONFIGURED") {
        return NextResponse.json(
          { success: false, error: "AI funkcija šiuo metu neprieinama" },
          { status: 503 },
        );
      }
      if (error.message === "AI_TIMEOUT") {
        return NextResponse.json(
          { success: false, error: "AI įžvalga užtruko per ilgai. Bandykite dar kartą." },
          { status: 504 },
        );
      }
      return NextResponse.json(
        { success: false, error: "Nepavyko paruošti įžvalgos. Bandykite vėliau." },
        { status: 502 },
      );
    }
    console.error("Lead co-pilot route klaida:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko paruošti įžvalgos" },
      { status: 500 },
    );
  }
}
