import { NextResponse, connection, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveProvider } from "@/lib/provider-guard";
import { getProviderAvatarImage } from "@/lib/provider-image";
import { formatLastSeen, getPresenceLevel, type PresenceLevel } from "@/lib/presence";
import { getProviderInboxCache, setProviderInboxCache } from "@/lib/provider-inbox-cache";
import { createServerTimer } from "@/lib/server-timing";

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

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;
const LIST_CACHE_TTL_MS = 15_000;

type InboxResponseData = {
  conversations: ConversationItem[];
  totalUnread: number;
  nextCursor: string | null;
  hasMore: boolean;
};

function parseLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

export async function GET(req: NextRequest) {
  await connection();
  const timer = createServerTimer("provider-inbox");
  try {
    const guard = await requireActiveProvider(req);
    timer.mark("guard");
    if (!guard.authorized) return guard.response;

    const providerId = guard.userId;
    const summaryOnly = req.nextUrl.searchParams.get("summary") === "1";
    const threadParam = req.nextUrl.searchParams.get("thread")?.trim() || null;
    const responseThreadId = threadParam?.startsWith("response-")
      ? threadParam.replace(/^response-/, "")
      : null;
    const directThreadId = threadParam && !responseThreadId ? threadParam : null;
    const limit = threadParam ? 1 : parseLimit(req.nextUrl.searchParams.get("limit"));
    const cursorParam = req.nextUrl.searchParams.get("cursor");
    const cursorDate = cursorParam ? new Date(cursorParam) : null;
    const cursor =
      cursorDate && !Number.isNaN(cursorDate.getTime()) && !threadParam
        ? cursorDate
        : null;
    const pageTake = threadParam ? 1 : limit + 1;
    const listCacheKey =
      !summaryOnly && !threadParam
        ? `${providerId}:${limit}:${cursor?.toISOString() ?? "first"}`
        : null;

    if (listCacheKey) {
      const cached = getProviderInboxCache<InboxResponseData>(listCacheKey);
      if (cached) {
        timer.end({
          mode: "list",
          thread: "no",
          cache: "hit",
          conversations: cached.conversations.length,
          hasMore: cached.hasMore,
        });
        return NextResponse.json({ success: true, data: cached });
      }
    }

    if (summaryOnly) {
      const unreadCap = 100;
      const [responseRows, incomingInquiryRows, sentInquiryRows] = await Promise.all([
        prisma.$queryRaw<{ count: number }[]>`
          SELECT COUNT(*)::int AS count
          FROM responses
          WHERE "providerId" = ${providerId}
            AND "lastMessageAt" > "providerLastReadAt"
        `,
        prisma.$queryRaw<{ count: number }[]>`
          SELECT COUNT(*)::int AS count
          FROM direct_inquiries
          WHERE "providerId" = ${providerId}
            AND "moderationStatus" = 'APPROVED'
            AND status <> 'ARCHIVED'
            AND "lastMessageAt" > "providerLastReadAt"
        `,
        prisma.$queryRaw<{ count: number }[]>`
          SELECT COUNT(*)::int AS count
          FROM direct_inquiries
          WHERE "senderUserId" = ${providerId}
            AND "providerId" <> ${providerId}
            AND "moderationStatus" = 'APPROVED'
            AND status <> 'ARCHIVED'
            AND ("clientLastReadAt" IS NULL OR "lastMessageAt" > "clientLastReadAt")
        `,
      ]);
      timer.mark("summaryQuery");
      const cappedTotal =
        (responseRows[0]?.count ?? 0) +
        (incomingInquiryRows[0]?.count ?? 0) +
        (sentInquiryRows[0]?.count ?? 0);
      const totalUnread = Math.min(cappedTotal, unreadCap);
      timer.end({
        mode: "summary",
        responseUnread: responseRows[0]?.count ?? 0,
        incomingUnread: incomingInquiryRows[0]?.count ?? 0,
        sentUnread: sentInquiryRows[0]?.count ?? 0,
      });

      return NextResponse.json({
        success: true,
        data: { conversations: [], totalUnread },
      });
    }

    const shouldFetchResponses = !directThreadId;
    const shouldFetchInquiries = !responseThreadId;

    const [responses, inquiries] = await Promise.all([
      shouldFetchResponses ? prisma.response.findMany({
        where: {
          providerId,
          ...(responseThreadId ? { id: responseThreadId } : {}),
          ...(cursor ? { lastMessageAt: { lt: cursor } } : {}),
        },
        orderBy: { lastMessageAt: "desc" },
        take: pageTake,
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
      }) : Promise.resolve([]),
      shouldFetchInquiries ? prisma.directInquiry.findMany({
        where: {
          AND: [
            { OR: [{ providerId }, { senderUserId: providerId }] },
            { moderationStatus: "APPROVED" },
            ...(directThreadId ? [{ OR: [{ id: directThreadId }, { trackingToken: directThreadId }] }] : []),
            ...(cursor ? [{ lastMessageAt: { lt: cursor } }] : []),
          ],
        },
        orderBy: { lastMessageAt: "desc" },
        take: pageTake,
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
      }) : Promise.resolve([]),
    ]);
    timer.mark("listQueries");

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

    const sortedConversations = [...requestItems, ...directItems].sort(
      (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime()
    );
    const conversations = threadParam ? sortedConversations : sortedConversations.slice(0, limit);
    const hasMore = !threadParam && sortedConversations.length > limit;
    const nextCursor = hasMore
      ? conversations[conversations.length - 1]?.lastMessageAt.toISOString() ?? null
      : null;

    const totalUnread = conversations.filter((c) => c.unread && !c.archived).length;
    timer.mark("mapSort");
    timer.end({
      mode: threadParam ? "thread" : "list",
      thread: threadParam ? "yes" : "no",
      responses: responses.length,
      inquiries: inquiries.length,
      conversations: conversations.length,
      hasMore,
    });

    const data: InboxResponseData = { conversations, totalUnread, nextCursor, hasMore };
    if (listCacheKey) {
      setProviderInboxCache(listCacheKey, data, LIST_CACHE_TTL_MS);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Provider inbox error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
