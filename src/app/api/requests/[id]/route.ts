import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProviderAvatarImage } from "@/lib/provider-image";

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
        // `categoryId` lets the edit form pre-select the legacy single picker;
        // `categoryRef` supplies the primary display name (returned as the
        // `category` field). `categories` is the join table with all
        // primary+secondary IDs/names, returned as `categoryIds` and
        // `categoryNames` for multi-category consumers.
        categoryId: true,
        categoryRef: { select: { name: true } },
        categories: {
          select: { categoryId: true, category: { select: { name: true } } },
          orderBy: { sortOrder: "asc" },
        },
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
            providerLastReadAt: true,
            clientLastReadAt: true,
            provider: {
              select: {
                id: true,
                name: true,
                image: true,
                providerProfile: { select: { location: true, isVerified: true, isPremium: true, isYoungTalent: true, isGoat: true, images: true, heroImageUrl: true } },
              },
            },
            messages: {
              select: {
                id: true,
                content: true,
                createdAt: true,
                senderId: true,
                senderName: true,
                sender: { select: { id: true, name: true, image: true } },
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

    const clientReadAt = new Date();
    try {
      await prisma.response.updateMany({
        where: { requestId: request.id },
        data: { clientLastReadAt: clientReadAt },
      });
    } catch {
      // Read receipts must never block the tracking page.
    }

    // Sort responses newest first
    const sortedResponses = [...request.responses].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Build review lookup set
    const reviewedResponseIds = new Set(request.reviews.map((r) => r.responseId));

    // Add badge info and review status to each response for client display
    const responsesWithBadge = sortedResponses.map((resp) => {
      // images/heroImageUrl are intentionally stripped from the client payload.
       
      const { images, heroImageUrl, ...providerProfile } = resp.provider.providerProfile ?? {};
      return {
        ...resp,
        clientLastReadAt: clientReadAt,
        provider: {
          ...resp.provider,
          image: getProviderAvatarImage(resp.provider),
          providerProfile,
        },
        providerBadge: resp.provider.providerProfile?.isVerified ? "Patikimas" : null,
        hasReview: reviewedResponseIds.has(resp.id),
      };
    });

     
    const { reviews: _reviews, _count, categoryRef, categories, ...requestWithoutReviews } = request;

    // Prefer the join table; fall back to the legacy categoryRef so rows
    // written before the migration still render correctly.
    const joinedNames = categories
      .map((link) => link.category?.name?.trim() ?? "")
      .filter((name) => name.length > 0);
    const categoryNames = joinedNames.length > 0
      ? joinedNames
      : categoryRef?.name
        ? [categoryRef.name]
        : [];
    const categoryIds = categories.length > 0
      ? categories.map((link) => link.categoryId)
      : request.categoryId
        ? [request.categoryId]
        : [];

    return NextResponse.json({
      success: true,
      data: {
        ...requestWithoutReviews,
        // Keep the legacy single `category` (display name) so existing
        // consumers that haven't migrated still work.
        category: categoryRef?.name ?? "",
        categoryNames,
        categoryIds,
        responses: responsesWithBadge,
        viewCount: _count.views,
      },
    });
  } catch (error) {
    console.error("Get request error:", error);
    return NextResponse.json({ success: false, error: "Klaida gaunant užklausą" }, { status: 500 });
  }
}
