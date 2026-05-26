import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { messageSchema } from "@/lib/validations";
import { sanitizeHtml } from "@/lib/sanitize";
import { rateLimitAsync, RATE_LIMITS } from "@/lib/rate-limit";
import { createMessageNotification } from "@/lib/message-notifications";

/**
 * Post a message to a response thread.
 * Only the provider who owns the response OR the client who owns the request can post.
 * params.id = response ID (the thread)
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Prisijunkite" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: (parsed.error.issues?.[0]?.message || "Validacijos klaida") }, { status: 400 });
    }

    // Fetch response with its parent request to check ownership
    const response = await prisma.response.findUnique({
      where: { id },
      select: {
        id: true,
        providerId: true,
        request: {
          select: { id: true, clientId: true, status: true, title: true, trackingToken: true },
        },
      },
    });

    if (!response) {
      return NextResponse.json({ success: false, error: "Atsakymas nerastas" }, { status: 404 });
    }

    // Block messages on closed requests
    if (response.request.status === "CLOSED") {
      return NextResponse.json({ success: false, error: "Užklausa uždaryta, žinučių siųsti nebegalima" }, { status: 403 });
    }

    // Authorization: only the response's provider or the request's client can post
    const isProvider = response.providerId === session.user.id;
    const isClient = response.request.clientId === session.user.id;

    if (!isProvider && !isClient) {
      return NextResponse.json({ success: false, error: "Neturite teisės rašyti šioje diskusijoje" }, { status: 403 });
    }

    // Block self-thread: same user is both provider and client
    if (isProvider && isClient) {
      return NextResponse.json({ success: false, error: "Negalite rašyti žinučių savo paties diskusijoje" }, { status: 403 });
    }

    // Rate limit: 5 messages per minute per user
    const rl = await rateLimitAsync(`msg:${session.user.id}`, RATE_LIMITS.messages);
    if (!rl.success) {
      return NextResponse.json({ success: false, error: "Per daug žinučių. Palaukite minutę." }, { status: 429 });
    }

    const sanitizedContent = sanitizeHtml(parsed.data.content);

    // Duplicate detection: block identical message within last 30 seconds
    const recentDuplicate = await prisma.message.findFirst({
      where: {
        responseId: id,
        senderId: session.user.id,
        content: sanitizedContent,
        createdAt: { gte: new Date(Date.now() - 30 * 1000) },
      },
      select: { id: true },
    });
    if (recentDuplicate) {
      return NextResponse.json({ success: false, error: "Tokia žinutė jau išsiųsta" }, { status: 409 });
    }

    // Persist the message and bump the thread's activity timestamp atomically.
    // The provider's own send also counts as "read" so it never shows unread.
    const now = new Date();
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          responseId: id,
          senderId: session.user.id,
          senderName: session.user.name || null,
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
        where: { id },
        data: {
          lastMessageAt: now,
          ...(isProvider ? { providerLastReadAt: now } : {}),
        },
      }),
    ]);

    // Notify the other participant — best-effort, never blocks the send.
    if (isProvider) {
      if (response.request.clientId) {
        await createMessageNotification({
          userId: response.request.clientId,
          link: `/uzklausos/sekti/${response.request.trackingToken}`,
          contextLabel: response.request.title,
        });
      }
    } else {
      await createMessageNotification({
        userId: response.providerId,
        link: `/tiekejas/uzklausos/${response.request.id}`,
        contextLabel: response.request.title,
      });
    }

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ success: false, error: "Klaida siunčiant žinutę" }, { status: 500 });
  }
}
