import { NextResponse, connection, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveProvider } from "@/lib/provider-guard";
import { getProviderAvatarImage } from "@/lib/provider-image";
import { formatLastSeen, getPresenceLevel, type PresenceLevel } from "@/lib/presence";

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
  avatarImage: string | null;
  presenceLevel: PresenceLevel;
  presenceLabel: string | null;
};

export async function GET(req: NextRequest) {
  await connection();
  try {
    const guard = await requireActiveProvider();
    if (!guard.authorized) return guard.response;

    const providerId = guard.userId;
    const threadParam = req.nextUrl.searchParams.get("thread")?.trim() || null;
    const responseThreadId = threadParam?.startsWith("response-")
      ? threadParam.replace(/^response-/, "")
      : null;
    const directThreadId = threadParam && !responseThreadId ? threadParam : null;

    const [responses, inquiries] = await Promise.all([
      prisma.response.findMany({
        where: {
          providerId,
          ...(responseThreadId ? { id: responseThreadId } : {}),
          ...(directThreadId ? { id: "__never__" } : {}),
        },
        select: {
          id: true,
          message: true,
          lastMessageAt: true,
          providerLastReadAt: true,
          request: {
            select: {
              id: true,
              title: true,
              status: true,
              clientName: true,
              client: { select: { image: true, lastSeenAt: true } },
            },
          },
          messages: {
            select: { content: true, createdAt: true, senderId: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      prisma.directInquiry.findMany({
        where: {
          AND: [
            { OR: [{ providerId }, { senderUserId: providerId }] },
            { moderationStatus: "APPROVED" },
            ...(responseThreadId ? [{ id: "__never__" }] : []),
            ...(directThreadId ? [{ OR: [{ id: directThreadId }, { trackingToken: directThreadId }] }] : []),
          ],
        },
        select: {
          id: true,
          trackingToken: true,
          providerId: true,
          description: true,
          senderName: true,
          senderEmail: true,
          status: true,
          lastMessageAt: true,
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
          sender: { select: { image: true, lastSeenAt: true } },
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
        href: `/tiekejas/zinutes/response-${r.id}`,
        title: r.request.title,
        subtitle: r.request.clientName,
        // No chat messages yet → preview the offer (always the provider's).
        preview: last ? last.content : r.message,
        lastMessageAt: r.lastMessageAt,
        unread: r.lastMessageAt > r.providerLastReadAt,
        fromProvider: last ? last.senderId === providerId : true,
        status: r.request.status,
        archived: false,
        avatarImage: r.request.client?.image ?? null,
        presenceLevel: getPresenceLevel(r.request.client?.lastSeenAt),
        presenceLabel: formatLastSeen(r.request.client?.lastSeenAt),
      };
    });

    const directItems: ConversationItem[] = inquiries.map((q) => {
      const last = q.messages[0] ?? null;
      const viewerIsProvider = q.providerId === providerId;
      // Outgoing direct inquiry (provider acting as sender) lives at the
      // tracking-token route; incoming lives in the provider inbox detail.
      const href = viewerIsProvider
        ? `/tiekejas/zinutes/${q.id}`
        : `/zinutes/${q.trackingToken}`;
      const title = viewerIsProvider
        ? (q.senderName?.trim() || q.senderEmail)
        : (q.provider.name || "Tiekėjas");
      const subtitle = viewerIsProvider ? q.senderEmail : "Mano išsiųsta žinutė";
      const lastReadAt = viewerIsProvider ? q.providerLastReadAt : q.clientLastReadAt;
      return {
        type: "direct",
        id: q.id,
        href,
        title,
        subtitle,
        // No chat messages yet → preview the opening inquiry.
        preview: last ? last.content : q.description,
        lastMessageAt: q.lastMessageAt,
        unread: lastReadAt ? q.lastMessageAt > lastReadAt : !viewerIsProvider,
        fromProvider: last ? last.senderId === providerId : viewerIsProvider,
        status: q.status,
        archived: q.status === "ARCHIVED",
        avatarImage: viewerIsProvider ? q.sender?.image ?? null : getProviderAvatarImage(q.provider),
        presenceLevel: viewerIsProvider ? getPresenceLevel(q.sender?.lastSeenAt) : getPresenceLevel(q.provider.lastSeenAt),
        presenceLabel: viewerIsProvider ? formatLastSeen(q.sender?.lastSeenAt) : formatLastSeen(q.provider.lastSeenAt),
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
