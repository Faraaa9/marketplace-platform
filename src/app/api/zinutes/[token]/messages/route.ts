import { after, NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { messageSchema } from "@/lib/validations";
import { sanitizeHtml } from "@/lib/sanitize";
import { createMessageNotification } from "@/lib/message-notifications";
import { createServerTimer } from "@/lib/server-timing";

/**
 * Post a message to a direct-inquiry thread — sender side, authenticated by
 * the inquiry's tracking token.
 *
 * Supports both a known sender account and anonymous senders. The tracking
 * token proves ownership of this conversation.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  await connection();
  const timer = createServerTimer("client-message-send");
  try {
    const { token } = await params;
    const body = await req.json();
    timer.mark("parseBody");
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
    timer.mark("inquiryLookup");
    if (!inquiry) {
      return NextResponse.json({ success: false, error: "Pokalbis nerastas" }, { status: 404 });
    }

    const senderId = inquiry.senderUserId;
    const senderName = inquiry.senderName || "Klientas";

    const sanitizedContent = sanitizeHtml(parsed.data.content);

    const recentMessages = await prisma.message.findMany({
      where: {
        directInquiryId: inquiry.id,
        senderId,
        createdAt: { gte: new Date(Date.now() - 30 * 1000) },
      },
      select: { content: true, senderName: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    timer.mark("duplicateCheck");
    const isDuplicate = recentMessages.some((message) =>
      message.content === sanitizedContent && (senderId || message.senderName === senderName)
    );
    if (isDuplicate) {
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
    timer.mark("transaction");

    // Notify the provider — best-effort.
    after(() =>
      createMessageNotification({
        userId: inquiry.providerId,
        link: `/tiekejas/zinutes?thread=${inquiry.id}`,
        contextLabel: senderName,
      })
    );
    timer.end({ inquiryId: inquiry.id, knownSender: Boolean(senderId) });

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error("Direct-inquiry message error:", error);
    return NextResponse.json({ success: false, error: "Klaida siunčiant žinutę" }, { status: 500 });
  }
}
