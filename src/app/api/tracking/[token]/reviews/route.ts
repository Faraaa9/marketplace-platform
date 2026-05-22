import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { moderateText } from "@/lib/moderation";

/**
 * POST /api/tracking/[token]/reviews — Guest review submission.
 * Auth is via tracking token ownership (same as messaging / status updates).
 * Derives providerId server-side from the accepted response.
 * Body: { responseId, rating (1-5), comment? }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { responseId, rating, comment } = body;

    if (!responseId || !rating) {
      return NextResponse.json(
        { success: false, error: "Trūksta duomenų" },
        { status: 400 }
      );
    }

    if (typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: "Įvertinimas turi būti nuo 1 iki 5" },
        { status: 400 }
      );
    }

    // Find request by tracking token
    const request = await prisma.serviceRequest.findUnique({
      where: { trackingToken: token },
      select: {
        id: true,
        clientId: true,
        acceptedResponseId: true,
        status: true,
      },
    });

    if (!request) {
      return NextResponse.json(
        { success: false, error: "Užklausa nerasta" },
        { status: 404 }
      );
    }

    // If request is claimed (has clientId), guest review via token is not allowed —
    // the logged-in owner must use /api/reviews instead.
    if (request.clientId) {
      return NextResponse.json(
        {
          success: false,
          error: "Ši užklausa priskirta paskyrai. Prisijunkite ir palikite atsiliepimą per savo paskyrą.",
        },
        { status: 403 }
      );
    }

    // Must have an accepted response
    if (!request.acceptedResponseId) {
      return NextResponse.json(
        { success: false, error: "Užklausa neturi priimto pasiūlymo" },
        { status: 400 }
      );
    }

    // The responseId must match the accepted response
    if (request.acceptedResponseId !== responseId) {
      return NextResponse.json(
        { success: false, error: "Šis pasiūlymas nebuvo priimtas" },
        { status: 400 }
      );
    }

    // Derive providerId from the accepted response
    const acceptedResponse = await prisma.response.findUnique({
      where: { id: responseId },
      select: { providerId: true },
    });

    if (!acceptedResponse) {
      return NextResponse.json(
        { success: false, error: "Pasiūlymas nerastas" },
        { status: 404 }
      );
    }

    const providerId = acceptedResponse.providerId;

    // Check if review already exists for this request+response
    const existing = await prisma.review.findUnique({
      where: {
        requestId_responseId: { requestId: request.id, responseId },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Atsiliepimas jau pateiktas" },
        { status: 409 }
      );
    }

    const moderation = await moderateText({
      entityType: "Review",
      fields: { comment },
      actorUserId: request.clientId,
    });
    if (moderation.verdict === "reject") {
      return NextResponse.json(
        {
          success: false,
          error:
            moderation.userMessage ??
            "Atsiliepime aptikta netinkamo turinio. Pataisykite ir bandykite dar kartą.",
        },
        { status: 422 }
      );
    }

    const review = await prisma.review.create({
      data: {
        rating,
        comment: comment?.trim() || null,
        clientId: request.clientId, // null for guests, set for claimed requests
        providerId,
        requestId: request.id,
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
        link: `/tiekejas`,
      },
    });

    return NextResponse.json({ success: true, data: review });
  } catch (error) {
    console.error("Guest review creation error:", error);
    return NextResponse.json(
      { success: false, error: "Klaida" },
      { status: 500 }
    );
  }
}
