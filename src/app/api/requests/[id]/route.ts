import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS, getEffectivePlanType } from "@/lib/constants";

/**
 * Public tracking endpoint — looks up by tracking token (NOT by internal ID).
 * The URL param is named [id] for routing simplicity but contains the tracking token.
 * Never exposes internal IDs, PII, or data beyond what the request owner needs.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const request = await prisma.serviceRequest.findUnique({
      where: { trackingToken: params.id },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        location: true,
        budget: true,
        status: true,
        acceptedResponseId: true,
        clientId: true,
        clientName: true,
        createdAt: true,
        reviews: {
          select: { id: true, responseId: true },
        },
        responses: {
          select: {
            id: true,
            providerId: true,
            message: true,
            price: true,
            createdAt: true,
            provider: {
              select: {
                id: true,
                name: true,
                image: true,
                providerProfile: { select: { location: true, planType: true } },
                subscription: { select: { status: true } },
              },
            },
            messages: {
              select: {
                id: true,
                content: true,
                createdAt: true,
                senderName: true,
                sender: { select: { name: true } },
              },
              orderBy: { createdAt: "asc" as const },
            },
          },
          orderBy: { createdAt: "desc" as const },
        },
      },
    });

    if (!request) {
      return NextResponse.json({ success: false, error: "Užklausa nerasta" }, { status: 404 });
    }

    // Resolve effective plan per provider (billing-aware)
    const resolveProviderPlan = (resp: (typeof request.responses)[number]) => {
      const stored = resp.provider.providerProfile?.planType || "FREE";
      const subStatus = resp.provider.subscription?.status;
      return getEffectivePlanType(stored, subStatus);
    };

    // Sort responses: PRO first (priority listing), then BASIC, then FREE
    const planOrder: Record<string, number> = { PRO: 0, BASIC: 1, FREE: 2 };
    const sortedResponses = [...request.responses].sort((a, b) => {
      const aPlan = resolveProviderPlan(a);
      const bPlan = resolveProviderPlan(b);
      const orderDiff = (planOrder[aPlan] ?? 2) - (planOrder[bPlan] ?? 2);
      if (orderDiff !== 0) return orderDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Build review lookup set
    const reviewedResponseIds = new Set(request.reviews.map((r) => r.responseId));

    // Add badge info and review status to each response for client display
    const responsesWithBadge = sortedResponses.map((resp) => {
      const pt = resolveProviderPlan(resp);
      return {
        ...resp,
        providerBadge: PLAN_LIMITS[pt]?.badge || null,
        hasReview: reviewedResponseIds.has(resp.id),
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { reviews: _reviews, ...requestWithoutReviews } = request;

    return NextResponse.json({
      success: true,
      data: { ...requestWithoutReviews, responses: responsesWithBadge },
    });
  } catch (error) {
    console.error("Get request error:", error);
    return NextResponse.json({ success: false, error: "Klaida gaunant užklausą" }, { status: 500 });
  }
}
