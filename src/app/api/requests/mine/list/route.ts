import { NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProviderAvatarImage } from "@/lib/provider-image";

export interface MineRequestOffer {
  id: string;
  providerName: string;
  providerImage: string | null;
  price: number | null;
  preview: string;
  lastMessageAt: string;
  unread: boolean;
}

export interface MineRequestItem {
  id: string;
  trackingToken: string;
  title: string;
  status: string;
  lastActivityAt: string;
  responseCount: number;
  /** Threads (providers) with something new — NOT message count. */
  unreadCount: number;
  offers: MineRequestOffer[];
}

// Active requests the signed-in user submitted, with their proposal threads —
// powers the merged inbox rows on /tiekejas/zinutes (request rows expand into
// this offers list; opening an offer goes to the tracker page).
export async function GET() {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Prisijunkite" }, { status: 401 });
    }

    const requests = await prisma.serviceRequest.findMany({
      where: {
        clientId: session.user.id,
        status: { in: ["OPEN", "PENDING_CONFIRMATION"] },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        trackingToken: true,
        title: true,
        status: true,
        createdAt: true,
        responses: {
          orderBy: { lastMessageAt: "desc" },
          select: {
            id: true,
            price: true,
            message: true,
            lastMessageAt: true,
            clientLastReadAt: true,
            provider: {
              select: {
                name: true,
                image: true,
                providerProfile: { select: { images: true, heroImageUrl: true } },
              },
            },
            messages: {
              select: { content: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    const data: MineRequestItem[] = requests.map((request) => {
      const offers: MineRequestOffer[] = request.responses.map((resp) => ({
        id: resp.id,
        providerName: resp.provider.name ?? "Tiekėjas",
        providerImage: getProviderAvatarImage(resp.provider),
        price: resp.price ?? null,
        preview: resp.messages[0]?.content ?? resp.message,
        lastMessageAt: resp.lastMessageAt.toISOString(),
        unread: !resp.clientLastReadAt || resp.lastMessageAt > resp.clientLastReadAt,
      }));
      const lastActivityAt = request.responses.reduce(
        (max, r) => (r.lastMessageAt > max ? r.lastMessageAt : max),
        request.createdAt,
      );
      return {
        id: request.id,
        trackingToken: request.trackingToken,
        title: request.title,
        status: request.status,
        lastActivityAt: lastActivityAt.toISOString(),
        responseCount: offers.length,
        unreadCount: offers.filter((offer) => offer.unread).length,
        offers,
      };
    });

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json({ success: false, error: "Serverio klaida" }, { status: 500 });
  }
}
