import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { messageSchema } from "@/lib/validations";
import { sanitizeHtml } from "@/lib/sanitize";
import { createMessageNotification } from "@/lib/message-notifications";

/**
 * Post a message to a direct-inquiry thread — sender side, authenticated by
 * the inquiry's tracking token.
 *
 * Supports both a logged-in sender (must match the inquiry's sender account)
 * and an anonymous sender (the tracking token alone proves ownership).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  await connection();
  try {
    const { token } = await params;
    const body = await req.json();
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues?.[0]?.message || "Validacijos klaida" },
        { status: 400 }
      );
    }

    const inquiry = await prisma.directInquiry.findUnique({
      where: { trackingToken: token },
      select: { id: true, providerId: true, senderUserId: true, senderName: true },
    });
    if (!inquiry) {
      return NextResponse.json({ success: false, error: "Pokalbis nerastas" }, { status: 404 });
    }

    // Determine sender identity.
    const session = await getServerSession(authOptions);
    let senderId: string | null = null;
    let senderName: string;

    if (session?.user?.id) {
      // Logged-in user — must be the inquiry's sender when it has a known one.
      if (inquiry.senderUserId && inquiry.senderUserId !== session.user.id) {
        return NextResponse.json({ success: false, error: "Neturite teisės rašyti šiame pokalbyje" }, { status: 403 });
      }
      // Block self-thread: the provider must not write here as the sender.
      if (inquiry.providerId === session.user.id) {
        return NextResponse.json({ success: false, error: "Negalite rašyti savo paties pokalbyje" }, { status: 403 });
      }
      senderId = session.user.id;
      senderName = session.user.name || inquiry.senderName || "Klientas";
    } else {
      // Anonymous — the tracking token is the proof of ownership.
      senderName = inquiry.senderName || "Klientas";
    }

    const sanitizedContent = sanitizeHtml(parsed.data.content);

    // Duplicate detection: block identical message within last 30 seconds.
    const duplicateWhere: Record<string, unknown> = {
      directInquiryId: inquiry.id,
      content: sanitizedContent,
      createdAt: { gte: new Date(Date.now() - 30 * 1000) },
    };
    if (senderId) {
      duplicateWhere.senderId = senderId;
    } else {
      duplicateWhere.senderName = senderName;
      duplicateWhere.senderId = null;
    }
    const recentDuplicate = await prisma.message.findFirst({
      where: duplicateWhere,
      select: { id: true },
    });
    if (recentDuplicate) {
      return NextResponse.json({ success: false, error: "Tokia žinutė jau išsiųsta" }, { status: 409 });
    }

    // Persist the message and bump the thread's activity timestamp atomically.
    const now = new Date();
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          directInquiryId: inquiry.id,
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
      prisma.directInquiry.update({
        where: { id: inquiry.id },
        data: { lastMessageAt: now, clientLastReadAt: now },
      }),
    ]);

    // Notify the provider — best-effort.
    await createMessageNotification({
      userId: inquiry.providerId,
      link: `/tiekejas/zinutes/${inquiry.id}`,
      contextLabel: senderName,
    });

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error("Direct-inquiry message error:", error);
    return NextResponse.json({ success: false, error: "Klaida siunčiant žinutę" }, { status: 500 });
  }
}
