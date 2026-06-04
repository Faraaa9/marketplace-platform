import { after, NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveProvider } from "@/lib/provider-guard";
import { formatLastSeen, getPresenceLevel } from "@/lib/presence";
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
 * GET — fetch one direct-inquiry conversation (provider view) and mark it read.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  const timer = createServerTimer("provider-thread-get");
  try {
    const { id } = await params;
    const guard = await requireActiveProvider(req);
    timer.mark("guard");
    if (!guard.authorized) return guard.response;
    const before = parseBeforeCursor(req);

    if (id.startsWith("response-")) {
      const responseId = id.replace(/^response-/, "");
      if (before) {
        const response = await prisma.response.findFirst({
          where: { id: responseId, providerId: guard.userId },
          select: { id: true },
        });
        timer.mark("responseGuardQuery");
        if (!response) {
          return NextResponse.json({ success: false, error: "Pokalbis nerastas" }, { status: 404 });
        }

        const older = await prisma.message.findMany({
          where: { responseId, createdAt: { lt: before } },
          select: MESSAGE_SELECT,
          orderBy: { createdAt: "desc" },
          take: THREAD_HISTORY_PAGE_SIZE + 1,
        });
        timer.mark("olderMessagesQuery");
        const hasMoreMessages = older.length > THREAD_HISTORY_PAGE_SIZE;
        const messages = newestWindowChronological(older.slice(0, THREAD_HISTORY_PAGE_SIZE)).map(mapMessage);
        timer.end({ mode: "response-history", messages: messages.length, hasMoreMessages });
        return NextResponse.json({ success: true, data: { messages, hasMoreMessages } });
      }

      const response = await prisma.response.findFirst({
        where: { id: responseId, providerId: guard.userId },
        select: {
          id: true,
          message: true,
          createdAt: true,
          clientLastReadAt: true,
          provider: { select: { id: true, name: true } },
          messages: {
            select: MESSAGE_SELECT,
            orderBy: { createdAt: "desc" },
            take: INITIAL_THREAD_MESSAGE_LIMIT + 1,
          },
          request: {
            select: {
              title: true,
              description: true,
              category: true,
              location: true,
              budget: true,
              deadline: true,
              createdAt: true,
              attachmentUrls: true,
              clientName: true,
              client: { select: { image: true, lastSeenAt: true } },
              categoryRef: { select: { name: true } },
              categories: { select: { category: { select: { name: true } } } },
              _count: { select: { responses: true } },
              status: true,
            },
          },
        },
      });
      timer.mark("responseQuery");

      if (!response) {
        return NextResponse.json({ success: false, error: "Pokalbis nerastas" }, { status: 404 });
      }

      after(() =>
        prisma.response
          .update({
            where: { id: response.id },
            data: { providerLastReadAt: new Date() },
            select: { id: true },
          })
          .catch(() => null)
      );

      const categoryNames = response.request.categories.map((c) => c.category.name);
      const hasMoreMessages = response.messages.length > INITIAL_THREAD_MESSAGE_LIMIT;
      const messages = newestWindowChronological(response.messages.slice(0, INITIAL_THREAD_MESSAGE_LIMIT));
      timer.mark("map");
      timer.end({ mode: "response", messages: messages.length });
      return NextResponse.json({
        success: true,
        data: {
          type: "response",
          id: response.id,
          providerId: response.provider.id,
          title: response.request.title,
          subtitle: response.request.clientName,
          status: response.request.status,
          otherParticipantName: response.request.clientName,
          otherParticipantImage: response.request.client?.image ?? null,
          otherParticipantPresenceLevel: getPresenceLevel(response.request.client?.lastSeenAt),
          otherParticipantPresenceLabel: formatLastSeen(response.request.client?.lastSeenAt),
          otherParticipantReadAt: response.clientLastReadAt?.toISOString() ?? null,
          hasMoreMessages,
          initialMessages: [
            {
              id: `response-${response.id}`,
              content: response.message,
              createdAt: response.createdAt.toISOString(),
              senderId: response.provider.id,
              senderName: response.provider.name,
              sender: { id: response.provider.id, name: response.provider.name ?? "", image: null },
              status: "sent",
            },
            ...messages.map(mapMessage),
          ],
          requestBrief: {
            title: response.request.title,
            description: response.request.description,
            categoryLabel: categoryNames[0] || response.request.categoryRef?.name || response.request.category,
            location: response.request.location,
            budget: response.request.budget,
            deadline: response.request.deadline,
            createdAt: response.request.createdAt.toISOString(),
            responseCount: response.request._count.responses,
            attachmentCount: response.request.attachmentUrls.length,
          },
        },
      });
    }

    if (before) {
      const inquiry = await prisma.directInquiry.findFirst({
        where: { id, providerId: guard.userId },
        select: { id: true },
      });
      timer.mark("directGuardQuery");
      if (!inquiry) {
        return NextResponse.json({ success: false, error: "Žinutė nerasta" }, { status: 404 });
      }

      const older = await prisma.message.findMany({
        where: { directInquiryId: id, createdAt: { lt: before } },
        select: MESSAGE_SELECT,
        orderBy: { createdAt: "desc" },
        take: THREAD_HISTORY_PAGE_SIZE + 1,
      });
      timer.mark("olderMessagesQuery");
      const hasMoreMessages = older.length > THREAD_HISTORY_PAGE_SIZE;
      const messages = newestWindowChronological(older.slice(0, THREAD_HISTORY_PAGE_SIZE)).map(mapMessage);
      timer.end({ mode: "direct-history", messages: messages.length, hasMoreMessages });
      return NextResponse.json({ success: true, data: { messages, hasMoreMessages } });
    }

    const inquiry = await prisma.directInquiry.findFirst({
      where: { id, providerId: guard.userId },
      select: {
        id: true,
        providerId: true,
        description: true,
        budget: true,
        senderName: true,
        senderEmail: true,
        senderPhone: true,
        sender: { select: { image: true, name: true, lastSeenAt: true } },
        status: true,
        createdAt: true,
        clientLastReadAt: true,
        messages: {
          select: MESSAGE_SELECT,
          orderBy: { createdAt: "desc" },
          take: INITIAL_THREAD_MESSAGE_LIMIT + 1,
        },
      },
    });
    timer.mark("directQuery");

    if (!inquiry) {
      return NextResponse.json({ success: false, error: "Žinutė nerasta" }, { status: 404 });
    }

    after(() =>
      prisma.directInquiry
        .update({
          where: { id },
          data: { providerLastReadAt: new Date() },
          select: { id: true },
        })
        .catch(() => null)
    );

    const hasMoreMessages = inquiry.messages.length > INITIAL_THREAD_MESSAGE_LIMIT;
    const messages = newestWindowChronological(inquiry.messages.slice(0, INITIAL_THREAD_MESSAGE_LIMIT));
    const { sender, messages: _messages, ...data } = inquiry;
    timer.mark("map");
    timer.end({ mode: "direct", messages: messages.length });

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        type: "direct",
        title: inquiry.senderName?.trim() || inquiry.senderEmail,
        subtitle: inquiry.senderEmail,
        senderImage: sender?.image ?? null,
        senderAccountName: sender?.name ?? null,
        senderPresenceLevel: getPresenceLevel(sender?.lastSeenAt),
        senderPresenceLabel: formatLastSeen(sender?.lastSeenAt),
        hasMoreMessages,
        messages: messages.map(mapMessage),
      },
    });
  } catch (error) {
    console.error("Get inquiry error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}

/**
 * PATCH — archive / un-archive an inquiry (status: ARCHIVED or READ).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  try {
    const { id } = await params;
    const guard = await requireActiveProvider(req);
    if (!guard.authorized) return guard.response;

    const body = await req.json();
    const newStatus = body.status;

    if (!["READ", "ARCHIVED"].includes(newStatus)) {
      return NextResponse.json(
        { success: false, error: "Netinkamas statusas" },
        { status: 400 }
      );
    }

    // Verify ownership
    const inquiry = await prisma.directInquiry.findFirst({
      where: { id, providerId: guard.userId },
      select: { id: true },
    });

    if (!inquiry) {
      return NextResponse.json(
        { success: false, error: "Žinutė nerasta" },
        { status: 404 }
      );
    }

    const updated = await prisma.directInquiry.update({
      where: { id },
      data: { status: newStatus },
      select: { id: true, status: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update inquiry error:", error);
    return NextResponse.json(
      { success: false, error: "Klaida" },
      { status: 500 }
    );
  }
}
