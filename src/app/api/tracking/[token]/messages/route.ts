import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { messageSchema } from "@/lib/validations";
import { sanitizeHtml } from "@/lib/sanitize";
import { createMessageNotification } from "@/lib/message-notifications";

/**
 * Post a message to a response thread, authenticated by tracking token.
 *
 * Supports two auth modes:
 * 1. Logged-in client: session user must match the request's clientId.
 * 2. Anonymous client: the tracking token itself proves ownership — the token
 *    is a 64-char crypto-random hex string issued only to the request creator.
 *
 * The responseId in the body must belong to the request identified by the token,
 * preventing cross-request message injection.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  await connection();
  try {
    const { token } = await params;
    const body = await req.json();
    const { responseId } = body;

    if (!responseId || typeof responseId !== "string") {
      return NextResponse.json({ success: false, error: "responseId privalomas" }, { status: 400 });
    }

    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues?.[0]?.message || "Validacijos klaida" },
        { status: 400 }
      );
    }

    // Look up the request by tracking token
    const request = await prisma.serviceRequest.findUnique({
      where: { trackingToken: token },
      select: { id: true, clientId: true, clientName: true, status: true, title: true },
    });

    if (!request) {
      return NextResponse.json({ success: false, error: "Užklausa nerasta" }, { status: 404 });
    }

    // Block messages on closed requests
    if (request.status === "CLOSED") {
      return NextResponse.json({ success: false, error: "Užklausa uždaryta, žinučių siųsti nebegalima" }, { status: 403 });
    }

    // Verify the response belongs to this request
    const response = await prisma.response.findUnique({
      where: { id: responseId },
      select: { id: true, requestId: true, providerId: true },
    });

    if (!response || response.requestId !== request.id) {
      return NextResponse.json({ success: false, error: "Atsakymas nepriklauso šiai užklausai" }, { status: 403 });
    }

    // Determine sender identity
    const session = await getServerSession(authOptions);
    let senderId: string | null = null;
    let senderName: string;

    if (session?.user?.id) {
      // Logged-in user — must be the request owner
      if (request.clientId && request.clientId !== session.user.id) {
        return NextResponse.json({ success: false, error: "Neturite teisės rašyti šioje diskusijoje" }, { status: 403 });
      }
      // Block self-thread: logged-in user is also the response provider
      if (response.providerId === session.user.id) {
        return NextResponse.json({ success: false, error: "Negalite rašyti žinučių savo paties diskusijoje" }, { status: 403 });
      }
      senderId = session.user.id;
      senderName = session.user.name || request.clientName;
    } else {
      // Anonymous — tracking token is the proof of ownership
      senderName = request.clientName;
    }

    const sanitizedContent = sanitizeHtml(parsed.data.content);

    // Persist the message and bump the thread's activity timestamp atomically.
    const now = new Date();
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          responseId,
          senderId,
          senderName,
          content: sanitizedContent,
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          senderName: true,
          sender: { select: { id: true, name: true, image: true } },
        },
      }),
      prisma.response.update({
        where: { id: responseId },
        data: { lastMessageAt: now, clientLastReadAt: now },
      }),
    ]);

    // Notify the provider of the new client message — best-effort.
    await createMessageNotification({
      userId: response.providerId,
      link: `/tiekejas/uzklausa/${request.id}`,
      contextLabel: request.title,
    });

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error("Tracking message error:", error);
    return NextResponse.json({ success: false, error: "Klaida siunčiant žinutę" }, { status: 500 });
  }
}
