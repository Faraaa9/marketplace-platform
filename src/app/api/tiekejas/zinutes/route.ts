import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveProvider } from "@/lib/provider-guard";

export const dynamic = "force-dynamic";

/**
 * Unified provider inbox — request conversations (Response threads) and direct
 * inquiries, merged into one list sorted by most recent activity. A thread is
 * unread when its last activity is newer than the provider's last read time.
 */
type ConversationItem = {
  type: "request" | "direct";
  id: string;
  href: string;
  title: string;
  subtitle: string;
  preview: string;
  lastMessageAt: Date;
  unread: boolean;
  fromProvider: boolean;
  status: string;
  archived: boolean;
};

export async function GET() {
  try {
    const guard = await requireActiveProvider();
    if (!guard.authorized) return guard.response;

    const providerId = guard.userId;

    const [responses, inquiries] = await Promise.all([
      prisma.response.findMany({
        where: { providerId },
        select: {
          id: true,
          message: true,
          lastMessageAt: true,
          providerLastReadAt: true,
          request: { select: { id: true, title: true, status: true, clientName: true } },
          messages: {
            select: { content: true, createdAt: true, senderId: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.directInquiry.findMany({
        where: { providerId },
        select: {
          id: true,
          description: true,
          senderName: true,
          senderEmail: true,
          status: true,
          lastMessageAt: true,
          providerLastReadAt: true,
          messages: {
            select: { content: true, createdAt: true, senderId: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
    ]);

    const requestItems: ConversationItem[] = responses.map((r) => {
      const last = r.messages[0] ?? null;
      return {
        type: "request",
        id: r.id,
        href: `/tiekejas/uzklausos/${r.request.id}`,
        title: r.request.title,
        subtitle: r.request.clientName,
        // No chat messages yet → preview the offer (always the provider's).
        preview: last ? last.content : r.message,
        lastMessageAt: r.lastMessageAt,
        unread: r.lastMessageAt > r.providerLastReadAt,
        fromProvider: last ? last.senderId === providerId : true,
        status: r.request.status,
        archived: false,
      };
    });

    const directItems: ConversationItem[] = inquiries.map((q) => {
      const last = q.messages[0] ?? null;
      return {
        type: "direct",
        id: q.id,
        href: `/tiekejas/zinutes/${q.id}`,
        title: q.senderName?.trim() || q.senderEmail,
        subtitle: q.senderEmail,
        // No chat messages yet → preview the opening inquiry (the sender's).
        preview: last ? last.content : q.description,
        lastMessageAt: q.lastMessageAt,
        unread: q.lastMessageAt > q.providerLastReadAt,
        fromProvider: last ? last.senderId === providerId : false,
        status: q.status,
        archived: q.status === "ARCHIVED",
      };
    });

    const conversations = [...requestItems, ...directItems].sort(
      (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
    );

    const totalUnread = conversations.filter((c) => c.unread && !c.archived).length;

    return NextResponse.json({
      success: true,
      data: { conversations, totalUnread },
    });
  } catch (error) {
    console.error("Provider inbox error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
