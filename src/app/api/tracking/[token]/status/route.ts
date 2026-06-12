import { NextRequest, NextResponse, connection } from "next/server";
import { revalidateTag } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Client lifecycle actions on a request, authenticated by tracking token.
 *
 * Supported actions:
 *   { action: "accept", responseId: "..." }  — Accept a provider's response → IN_PROGRESS
 *   { action: "close" }                      — Close the request → CLOSED
 *
 * Auth: tracking token proves ownership. For logged-in clients, session.user.id
 * must match request.clientId if one exists.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  await connection();
  try {
    const { token } = await params;
    const body = await req.json();
    const { action, responseId } = body;

    if (!action || !["accept", "close"].includes(action)) {
      return NextResponse.json({ success: false, error: "Netinkamas veiksmas" }, { status: 400 });
    }

    const request = await prisma.serviceRequest.findUnique({
      where: { trackingToken: token },
      select: { id: true, status: true, clientId: true },
    });

    if (!request) {
      return NextResponse.json({ success: false, error: "Užklausa nerasta" }, { status: 404 });
    }

    // If there's a logged-in user, verify they own the request
    const session = await getServerSession(authOptions);
    if (session?.user?.id && request.clientId && request.clientId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Neturite teisės valdyti šios užklausos" }, { status: 403 });
    }

    if (action === "accept") {
      if (request.status !== "OPEN") {
        return NextResponse.json({ success: false, error: "Užklausa jau nebėra atidaryta" }, { status: 400 });
      }

      if (!responseId || typeof responseId !== "string") {
        return NextResponse.json({ success: false, error: "responseId privalomas" }, { status: 400 });
      }

      // Verify the response belongs to this request
      const response = await prisma.response.findUnique({
        where: { id: responseId },
        select: { id: true, requestId: true, providerId: true },
      });

      if (!response || response.requestId !== request.id) {
        return NextResponse.json({ success: false, error: "Atsakymas nepriklauso šiai užklausai" }, { status: 403 });
      }

      // Block self-accept: cannot accept your own response
      if (request.clientId && response.providerId === request.clientId) {
        return NextResponse.json({ success: false, error: "Negalite priimti savo paties pasiūlymo" }, { status: 403 });
      }

      await prisma.serviceRequest.update({
        where: { id: request.id },
        data: { status: "IN_PROGRESS", acceptedResponseId: responseId },
      });

      // Notify the accepted provider
      await prisma.notification.create({
        data: {
          userId: response.providerId,
          type: "RESPONSE_ACCEPTED",
          title: "Pasiūlymas priimtas!",
          body: "Klientas priėmė jūsų pasiūlymą.",
          link: `/tiekejas/uzklausa/${request.id}`,
        },
      });

      // The public board shows a "Tiekėjas rastas" stamp on matched requests.
      revalidateTag("requests", { expire: 0 });

      return NextResponse.json({ success: true });
    }

    if (action === "close") {
      if (request.status === "CLOSED") {
        return NextResponse.json({ success: false, error: "Užklausa jau uždaryta" }, { status: 400 });
      }

      await prisma.serviceRequest.update({
        where: { id: request.id },
        data: { status: "CLOSED" },
      });

      revalidateTag("requests", { expire: 0 });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Netinkamas veiksmas" }, { status: 400 });
  } catch (error) {
    console.error("Tracking status error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
