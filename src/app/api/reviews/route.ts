import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { moderateText } from "@/lib/moderation";

/**
 * POST /api/reviews — Submit a review for a provider after accepting their response.
 * Body: { requestId, responseId, providerId, rating (1-5), comment? }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Prisijunkite" }, { status: 401 });
    }

    const body = await req.json();
    const { requestId, responseId, rating, comment } = body;

    if (!requestId || !responseId || !rating) {
      return NextResponse.json({ success: false, error: "Trūksta duomenų" }, { status: 400 });
    }

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ success: false, error: "Įvertinimas turi būti nuo 1 iki 5" }, { status: 400 });
    }

    // Verify the request belongs to this user and has the accepted response
    const request = await prisma.serviceRequest.findUnique({
      where: { id: requestId },
      select: { clientId: true, acceptedResponseId: true, status: true },
    });

    if (!request) {
      return NextResponse.json({ success: false, error: "Užklausa nerasta" }, { status: 404 });
    }

    if (request.clientId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Tai ne jūsų užklausa" }, { status: 403 });
    }

    if (request.acceptedResponseId !== responseId) {
      return NextResponse.json({ success: false, error: "Šis pasiūlymas nebuvo priimtas" }, { status: 400 });
    }

    // Derive providerId from the accepted response (never trust client body)
    const acceptedResponse = await prisma.response.findUnique({
      where: { id: responseId },
      select: {
        providerId: true,
        provider: { select: { providerProfile: { select: { slug: true } } } },
      },
    });

    if (!acceptedResponse) {
      return NextResponse.json({ success: false, error: "Pasiūlymas nerastas" }, { status: 404 });
    }

    const providerId = acceptedResponse.providerId;
    const providerSlug = acceptedResponse.provider.providerProfile?.slug;

    // Block self-review: cannot review yourself
    if (providerId === session.user.id) {
      return NextResponse.json({ success: false, error: "Negalite įvertinti savęs" }, { status: 403 });
    }

    // Check if review already exists for this request+response
    const existing = await prisma.review.findUnique({
      where: { requestId_responseId: { requestId, responseId } },
    });

    if (existing) {
      return NextResponse.json({ success: false, error: "Atsiliepimas jau pateiktas" }, { status: 409 });
    }

    const moderation = await moderateText({
      entityType: "Review",
      fields: { comment },
      actorUserId: session.user.id,
    });
    if (moderation.verdict === "reject") {
      return NextResponse.json(
        {
          success: false,
          error:
            moderation.userMessage ??
            "Atsiliepime aptikta netinkamo turinio. Pataisykite ir bandykite dar kartą.",
        },
        { status: 422 },
      );
    }

    const review = await prisma.review.create({
      data: {
        rating,
        comment: comment?.trim() || null,
        clientId: session.user.id,
        providerId,
        requestId,
        responseId,
        moderationStatus: moderation.verdict === "ok" ? "APPROVED" : "PENDING",
        moderationReason: moderation.reason,
        moderatedAt: new Date(),
      },
    });

    // Notify the provider
    await prisma.notification.create({
      data: {
        userId: providerId,
        type: "NEW_REVIEW",
        title: "Naujas atsiliepimas",
        body: `Klientas įvertino jūsų paslaugą: ${rating}/5`,
        link: providerSlug ? `/meistrai/${providerSlug}#atsiliepimai` : `/tiekejas`,
      },
    });

    return NextResponse.json({ success: true, data: review });
  } catch (error) {
    console.error("Review creation error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}

/**
 * GET /api/reviews?providerId=xxx — Get reviews for a provider (public).
 */
export async function GET(req: NextRequest) {
  try {
    const providerId = new URL(req.url).searchParams.get("providerId");
    if (!providerId) {
      return NextResponse.json({ success: false, error: "Trūksta providerId" }, { status: 400 });
    }

    const reviews = await prisma.review.findMany({
      where: { providerId, moderationStatus: "APPROVED" },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        client: { select: { name: true } },
        request: {
          select: { title: true, categoryRef: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const avgRating =
      reviews.length > 0
        ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
        : null;

    return NextResponse.json({
      success: true,
      data: { reviews, avgRating, totalReviews: reviews.length },
    });
  } catch (error) {
    console.error("Reviews fetch error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
