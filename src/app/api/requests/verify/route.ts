import { after, NextRequest, NextResponse, connection } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { notifyRelevantProviders } from "@/lib/request-notifications";

export async function GET(req: NextRequest) {
  await connection();
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
        categoryId: true,
        location: true,
        clientId: true,
        requestVerificationExpiresAt: true,
        categories: {
          select: { categoryId: true },
          orderBy: { sortOrder: "asc" },
        },
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

    // The request just became OPEN — expire the public request-list caches now
    // so it shows up on the next visit (not after the timed revalidation).
    revalidateTag("requests", { expire: 0 });

    // Notify client (only if request is attached to an account)
    if (request.clientId) {
      await prisma.notification.create({
        data: {
          userId: request.clientId,
          type: "REQUEST_ACTIVATED",
          title: "Užklausa aktyvuota",
          body: `Jūsų užklausa „${request.title}" patvirtinta ir perduota tiekėjams. Netrukus gausite pasiūlymų.`,
          link: `/paskyra/uzklausos`,
        },
      });
    }

    // Prefer the join table (multi-category support); fall back to the legacy
    // single categoryId for any row written before the migration.
    const notifyCategoryIds = request.categories.length > 0
      ? request.categories.map((link) => link.categoryId)
      : request.categoryId
        ? [request.categoryId]
        : [];
    // Same durability fix as the create path: schedule via `after()` so the
    // notification survives the serverless response (which here ends in a
    // redirect) instead of being dropped by the Vercel function freeze.
    after(() =>
      notifyRelevantProviders(request.title, notifyCategoryIds, request.location, request.clientId).catch((error) =>
        console.error("Provider notification error:", error)
      )
    );

    trackingUrl.searchParams.set("verification", "success");
    return NextResponse.redirect(trackingUrl);
  } catch (error) {
    console.error("Request verification error:", error);
    return NextResponse.redirect(new URL("/uzklausos/nauja?verification=error", req.url));
  }
}
