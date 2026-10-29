import { NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProviderAvatarImage } from "@/lib/provider-image";

/**
 * Customer inbox — every conversation the signed-in user has with providers:
 * offer threads on their own requests (Response) and direct inquiries they
 * sent from a profile page. `threadId` is what `/paskyra/zinutes?thread=` takes:
 * `response-<id>` for offers, the inquiry tracking token for direct threads.
 */
export type CustomerConversation = {
  kind: "response" | "direct";
  threadId: string;
  /** Tracking token that authorizes the thread APIs (request or inquiry token). */
  token: string;
  /** Response id for offer threads, inquiry id for direct threads. */
  id: string;
  providerId: string;
  providerName: string;
  providerImage: string | null;
  about: string;
  preview: string;
  lastMessageAt: Date;
  unread: boolean;
  fromMe: boolean;
};

const PROVIDER_SELECT = {
  name: true,
  image: true,
  providerProfile: { select: { images: true, heroImageUrl: true } },
} as const;

const LAST_MESSAGE = {
  select: { content: true, senderId: true },
  orderBy: { createdAt: "desc" as const },
  take: 1,
};

export async function GET() {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Prisijunkite" }, { status: 401 });
    }
    const userId = session.user.id;

    const [responses, inquiries] = await Promise.all([
      prisma.response.findMany({
        where: { request: { clientId: userId } },
        orderBy: { lastMessageAt: "desc" },
        take: 100,
        select: {
          id: true,
          providerId: true,
          message: true,
          createdAt: true,
          lastMessageAt: true,
          clientLastReadAt: true,
          request: { select: { title: true, trackingToken: true } },
          provider: { select: PROVIDER_SELECT },
          messages: LAST_MESSAGE,
        },
      }),
      prisma.directInquiry.findMany({
        where: { senderUserId: userId, moderationStatus: "APPROVED", status: { not: "ARCHIVED" } },
        orderBy: { lastMessageAt: "desc" },
        take: 100,
        select: {
          id: true,
          trackingToken: true,
          providerId: true,
          description: true,
          lastMessageAt: true,
          clientLastReadAt: true,
          provider: { select: PROVIDER_SELECT },
          messages: LAST_MESSAGE,
        },
      }),
    ]);

    const offerThreads: CustomerConversation[] = responses.map((r) => {
      const last = r.messages[0] ?? null;
      const lastRead = r.clientLastReadAt?.getTime() ?? 0;
      // Unread = the provider spoke last after the customer's last visit (a
      // brand-new offer counts: the offer itself is the provider's message).
      const unread = last
        ? last.senderId === r.providerId && r.lastMessageAt.getTime() > lastRead
        : r.createdAt.getTime() > lastRead;
      return {
        kind: "response",
        threadId: `response-${r.id}`,
        token: r.request.trackingToken,
        id: r.id,
        providerId: r.providerId,
        providerName: r.provider.name || "Meistras",
        providerImage: getProviderAvatarImage(r.provider),
        about: r.request.title,
        preview: last ? last.content : r.message,
        lastMessageAt: r.lastMessageAt,
        unread,
        fromMe: last ? last.senderId !== r.providerId : false,
      };
    });

    const directThreads: CustomerConversation[] = inquiries.map((q) => {
      const last = q.messages[0] ?? null;
      const lastRead = q.clientLastReadAt?.getTime() ?? 0;
      return {
        kind: "direct",
        threadId: q.trackingToken,
        token: q.trackingToken,
        id: q.id,
        providerId: q.providerId,
        providerName: q.provider.name || "Meistras",
        providerImage: getProviderAvatarImage(q.provider),
        about: "Tiesioginė žinutė",
        // First send has no chat messages yet → preview the opening inquiry.
        preview: last ? last.content : q.description,
        lastMessageAt: q.lastMessageAt,
        unread: !!last && last.senderId === q.providerId && q.lastMessageAt.getTime() > lastRead,
        fromMe: last ? last.senderId !== q.providerId : true,
      };
    });

    const conversations = [...offerThreads, ...directThreads].sort(
      (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
    );

    return NextResponse.json({
      success: true,
      data: { conversations, totalUnread: conversations.filter((c) => c.unread).length },
    });
  } catch (error) {
    console.error("Customer inbox error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
