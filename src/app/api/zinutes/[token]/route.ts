import { after, NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatLastSeen, getPresenceLevel } from "@/lib/presence";
import { getProviderAvatarImage } from "@/lib/provider-image";
import { createServerTimer } from "@/lib/server-timing";
import { INITIAL_THREAD_MESSAGE_LIMIT, THREAD_HISTORY_PAGE_SIZE, newestWindowChronological } from "@/lib/thread-window";

const MESSAGE_SELECT = {
  id: true,
  content: true,
  createdAt: true,
  senderId: true,
  senderName: true,
  sender: { select: { id: true, name: true, image: true } },
} as const;

function parseBeforeCursor(req: NextRequest) {
  const before = req.nextUrl.searchParams.get("before");
  if (!before) return null;
  const date = new Date(before);
  return Number.isNaN(date.getTime()) ? null : date;
}

function mapMessage(m: {
  id: string;
  content: string;
  createdAt: Date;
  senderId: string | null;
  senderName: string | null;
  sender: { id: string; name: string | null; image: string | null } | null;
}) {
  return {
    id: m.id,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    senderId: m.senderId,
    senderName: m.senderName ?? m.sender?.name ?? null,
    sender: m.sender,
    status: "sent",
  };
}

/**
 * GET a direct-inquiry conversation by its tracking token — sender side.
 *
 * Auth: possession of the tracking token proves ownership.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  await connection();
  const timer = createServerTimer("client-thread-get");
  try {
    const { token } = await params;
    const before = parseBeforeCursor(req);

    if (before) {
      const inquiry = await prisma.directInquiry.findUnique({
        where: { trackingToken: token },
        select: { id: true },
      });
      timer.mark("inquiryGuardQuery");
      if (!inquiry) {
        return NextResponse.json({ success: false, error: "Pokalbis nerastas" }, { status: 404 });
      }

      const older = await prisma.message.findMany({
        where: { directInquiryId: inquiry.id, createdAt: { lt: before } },
        select: MESSAGE_SELECT,
        orderBy: { createdAt: "desc" },
        take: THREAD_HISTORY_PAGE_SIZE + 1,
      });
      timer.mark("olderMessagesQuery");
      const hasMoreMessages = older.length > THREAD_HISTORY_PAGE_SIZE;
      const messages = newestWindowChronological(older.slice(0, THREAD_HISTORY_PAGE_SIZE)).map(mapMessage);
      timer.end({ mode: "history", messages: messages.length, hasMoreMessages });
      return NextResponse.json({ success: true, data: { messages, hasMoreMessages } });
    }

    const inquiry = await prisma.directInquiry.findUnique({
      where: { trackingToken: token },
      select: {
        id: true,
        providerId: true,
        description: true,
        budget: true,
        senderName: true,
        senderUserId: true,
        createdAt: true,
        providerLastReadAt: true,
        clientLastReadAt: true,
        provider: {
          select: {
            name: true,
            image: true,
            lastSeenAt: true,
            providerProfile: { select: { images: true, heroImageUrl: true } },
          },
        },
        messages: {
          select: MESSAGE_SELECT,
          orderBy: { createdAt: "desc" },
          take: INITIAL_THREAD_MESSAGE_LIMIT + 1,
        },
      },
    });
    timer.mark("inquiryQuery");

    if (!inquiry) {
      return NextResponse.json({ success: false, error: "Pokalbis nerastas" }, { status: 404 });
    }

    const readAt = new Date();
    after(() =>
      prisma.directInquiry
        .update({
          where: { id: inquiry.id },
          data: { clientLastReadAt: readAt },
          select: { id: true },
        })
        .catch(() => null)
    );

    const hasMoreMessages = inquiry.messages.length > INITIAL_THREAD_MESSAGE_LIMIT;
    const messages = newestWindowChronological(inquiry.messages.slice(0, INITIAL_THREAD_MESSAGE_LIMIT));
    timer.end({ messages: messages.length });
    return NextResponse.json({
      success: true,
      data: {
        id: inquiry.id,
        providerId: inquiry.providerId,
        providerName: inquiry.provider.name,
        providerImage: getProviderAvatarImage(inquiry.provider),
        presenceLevel: getPresenceLevel(inquiry.provider.lastSeenAt),
        presenceLabel: formatLastSeen(inquiry.provider.lastSeenAt),
        description: inquiry.description,
        budget: inquiry.budget,
        senderName: inquiry.senderName,
        createdAt: inquiry.createdAt,
        providerLastReadAt: inquiry.providerLastReadAt,
        clientLastReadAt: readAt,
        hasMoreMessages,
        messages: messages.map(mapMessage),
      },
    });
  } catch (error) {
    console.error("Get inquiry conversation error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
