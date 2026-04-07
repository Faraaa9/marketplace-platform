import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyRelevantProviders } from "@/lib/request-notifications";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/uzklausos/nauja?verification=error", req.url));
    }

    const request = await prisma.serviceRequest.findUnique({
      where: { requestVerificationToken: token },
      select: {
        id: true,
        trackingToken: true,
        status: true,
        title: true,
        category: true,
        location: true,
        requestVerificationExpiresAt: true,
      },
    });

    if (!request) {
      return NextResponse.redirect(new URL("/uzklausos/nauja?verification=error", req.url));
    }

    const trackingUrl = new URL(`/uzklausos/sekti/${request.trackingToken}`, req.url);

    if (request.status !== "PENDING_CONFIRMATION") {
      trackingUrl.searchParams.set("verification", "already-confirmed");
      return NextResponse.redirect(trackingUrl);
    }

    if (!request.requestVerificationExpiresAt || request.requestVerificationExpiresAt < new Date()) {
      trackingUrl.searchParams.set("verification", "expired");
      return NextResponse.redirect(trackingUrl);
    }

    await prisma.serviceRequest.update({
      where: { id: request.id },
      data: {
        status: "OPEN",
        contactVerifiedAt: new Date(),
        requestVerificationToken: null,
        requestVerificationExpiresAt: null,
      },
    });

    notifyRelevantProviders(request.title, request.category, request.location).catch((error) =>
      console.error("Provider notification error:", error)
    );

    trackingUrl.searchParams.set("verification", "success");
    return NextResponse.redirect(trackingUrl);
  } catch (error) {
    console.error("Request verification error:", error);
    return NextResponse.redirect(new URL("/uzklausos/nauja?verification=error", req.url));
  }
}
