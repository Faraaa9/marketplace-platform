import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public tracking endpoint — looks up by tracking token (NOT by internal ID).
 * The URL param is named [id] for routing simplicity but contains the tracking token.
 * Never exposes internal IDs, PII, or data beyond what the request owner needs.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const request = await prisma.serviceRequest.findUnique({
      where: { trackingToken: id },
      select: {
        id: true,
        title: true,
        description: true,
        // `categoryId` lets the edit form pre-select the picker; `categoryRef`
        // supplies the display name (returned as the `category` field).
        categoryId: true,
        categoryRef: { select: { name: true } },
        location: true,
        budget: true,
        deadline: true,
        attachmentUrls: true,
        status: true,
        moderationStatus: true,
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
                providerProfile: { select: { location: true, isVerified: true } },
              },
            },
            messages: {
              select: {
                id: true,
                content: true,
                createdAt: true,
                senderId: true,
                senderName: true,
                sender: { select: { name: true } },
              },
              orderBy: { createdAt: "asc" as const },
            },
          },
          orderBy: { createdAt: "desc" as const },
        },
        _count: { select: { views: true } },
      },
    });

    if (!request) {
      return NextResponse.json({ success: false, error: "Užklausa nerasta" }, { status: 404 });
    }

    // Sort responses newest first
    const sortedResponses = [...request.responses].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Build review lookup set
    const reviewedResponseIds = new Set(request.reviews.map((r) => r.responseId));

    // Add badge info and review status to each response for client display
    const responsesWithBadge = sortedResponses.map((resp) => ({
      ...resp,
      providerBadge: resp.provider.providerProfile?.isVerified ? "Patikimas" : null,
      hasReview: reviewedResponseIds.has(resp.id),
    }));

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { reviews: _reviews, _count, categoryRef, ...requestWithoutReviews } = request;

    return NextResponse.json({
      success: true,
      data: {
        ...requestWithoutReviews,
        // Keep the response field name `category` — now the curated category
        // display name — so existing consumers keep working.
        category: categoryRef?.name ?? "",
        responses: responsesWithBadge,
        viewCount: _count.views,
      },
    });
  } catch (error) {
    console.error("Get request error:", error);
    return NextResponse.json({ success: false, error: "Klaida gaunant užklausą" }, { status: 500 });
  }
}
