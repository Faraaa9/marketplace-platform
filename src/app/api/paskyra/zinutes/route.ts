import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatLastSeen, getPresenceLevel, type PresenceLevel } from "@/lib/presence";
import { getProviderAvatarImage } from "@/lib/provider-image";

export const dynamic = "force-dynamic";

/**
 * User's sent direct-inquiry threads — inquiries this user initiated by
 * messaging a provider from a profile page. Unread state is derived from
 * matching unread NEW_MESSAGE notifications, since the sender side does not
 * carry its own lastReadAt timestamp on the inquiry record.
 */
type SentConversationItem = {
  id: string;
  trackingToken: string;
  href: string;
  providerName: string;
  providerImage: string | null;
  presenceLevel: PresenceLevel;
  presenceLabel: string | null;
  preview: string;
  lastMessageAt: Date;
  unread: boolean;
  fromMe: boolean;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Prisijunkite" }, { status: 401 });
    }

    const userId = session.user.id;

    const [inquiries, unreadNotifications] = await Promise.all([
      prisma.directInquiry.findMany({
        where: { senderUserId: userId, moderationStatus: "APPROVED" },
        select: {
          id: true,
          trackingToken: true,
          description: true,
          lastMessageAt: true,
          provider: {
            select: {
              name: true,
              image: true,
              lastSeenAt: true,
              providerProfile: { select: { images: true, heroImageUrl: true } },
            },
          },
          messages: {
            select: { content: true, senderId: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { lastMessageAt: "desc" },
      }),
      prisma.notification.findMany({
        where: {
          userId,
          type: "NEW_MESSAGE",
          isRead: false,
          link: { startsWith: "/zinutes/" },
        },
        select: { link: true },
      }),
    ]);

    const unreadTokens = new Set(
      unreadNotifications
        .map((n) => n.link?.replace(/^\/zinutes\//, "").split("?")[0] ?? "")
        .filter(Boolean)
    );

    const conversations: SentConversationItem[] = inquiries.map((q) => {
      const last = q.messages[0] ?? null;
      const fromMe = last ? last.senderId === userId : true;
      return {
        id: q.id,
        trackingToken: q.trackingToken,
        href: `/zinutes/${q.trackingToken}`,
        providerName: q.provider.name || "Tiekėjas",
        providerImage: getProviderAvatarImage(q.provider),
        presenceLevel: getPresenceLevel(q.provider.lastSeenAt),
        presenceLabel: formatLastSeen(q.provider.lastSeenAt),
        // First send has no chat messages yet → preview the opening inquiry.
        preview: last ? last.content : q.description,
        lastMessageAt: q.lastMessageAt,
        unread: unreadTokens.has(q.trackingToken),
        fromMe,
      };
    });

    const totalUnread = conversations.filter((c) => c.unread).length;

    return NextResponse.json({
      success: true,
      data: { conversations, totalUnread },
    });
  } catch (error) {
    console.error("My sent inquiries error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
