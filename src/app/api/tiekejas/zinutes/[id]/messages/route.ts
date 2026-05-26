import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { messageSchema } from "@/lib/validations";
import { sanitizeHtml } from "@/lib/sanitize";
import { requireActiveProvider } from "@/lib/provider-guard";
import { rateLimitAsync, RATE_LIMITS } from "@/lib/rate-limit";
import { createMessageNotification } from "@/lib/message-notifications";

/**
 * Post a message to a direct-inquiry thread — provider side.
 * params.id = DirectInquiry id.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const guard = await requireActiveProvider();
    if (!guard.authorized) return guard.response;

    const body = await req.json();
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues?.[0]?.message || "Validacijos klaida" },
        { status: 400 }
      );
    }

    const inquiry = await prisma.directInquiry.findFirst({
      where: { id, providerId: guard.userId },
      select: { id: true, senderUserId: true, trackingToken: true },
    });
    if (!inquiry) {
      return NextResponse.json({ success: false, error: "Žinutė nerasta" }, { status: 404 });
    }

    // Rate limit: 5 messages per minute per user
    const rl = await rateLimitAsync(`msg:${guard.userId}`, RATE_LIMITS.messages);
    if (!rl.success) {
      return NextResponse.json({ success: false, error: "Per daug žinučių. Palaukite minutę." }, { status: 429 });
    }

    const sanitizedContent = sanitizeHtml(parsed.data.content);

    // Duplicate detection: block identical message within last 30 seconds
    const recentDuplicate = await prisma.message.findFirst({
      where: {
        directInquiryId: id,
        senderId: guard.userId,
        content: sanitizedContent,
        createdAt: { gte: new Date(Date.now() - 30 * 1000) },
      },
      select: { id: true },
    });
    if (recentDuplicate) {
      return NextResponse.json({ success: false, error: "Tokia žinutė jau išsiųsta" }, { status: 409 });
    }

    const session = await getServerSession(authOptions);
    const providerName = session?.user?.name || null;

    // Persist the message and bump the thread's activity timestamp atomically.
    // The provider's own send also counts as "read".
    const now = new Date();
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          directInquiryId: id,
          senderId: guard.userId,
          senderName: providerName,
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
        where: { id },
        data: { lastMessageAt: now, providerLastReadAt: now },
      }),
    ]);

    // Notify the sender — best-effort, in-app only when the sender has an account.
    if (inquiry.senderUserId) {
      await createMessageNotification({
        userId: inquiry.senderUserId,
        link: `/zinutes/${inquiry.trackingToken}`,
        contextLabel: providerName || "Tiekėjas",
      });
    }

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error("Send direct-inquiry message error:", error);
    return NextResponse.json({ success: false, error: "Klaida siunčiant žinutę" }, { status: 500 });
  }
}
