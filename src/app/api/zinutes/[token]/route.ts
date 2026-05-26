import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPresenceLevel } from "@/lib/presence";
import { getProviderAvatarImage } from "@/lib/provider-image";

/**
 * GET a direct-inquiry conversation by its tracking token — sender side.
 *
 * Auth: possession of the tracking token proves ownership. A logged-in user
 * must match the inquiry's sender when the inquiry has a known sender account.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

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
        provider: {
          select: {
            name: true,
            image: true,
            lastSeenAt: true,
            providerProfile: { select: { images: true, heroImageUrl: true } },
          },
        },
        messages: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
            senderName: true,
            sender: { select: { id: true, name: true, image: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!inquiry) {
      return NextResponse.json({ success: false, error: "Pokalbis nerastas" }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    if (session?.user?.id && inquiry.senderUserId && inquiry.senderUserId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Neturite teisės" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: inquiry.id,
        providerId: inquiry.providerId,
        providerName: inquiry.provider.name,
        providerImage: getProviderAvatarImage(inquiry.provider),
        presenceLevel: getPresenceLevel(inquiry.provider.lastSeenAt),
        description: inquiry.description,
        budget: inquiry.budget,
        senderName: inquiry.senderName,
        createdAt: inquiry.createdAt,
        providerLastReadAt: inquiry.providerLastReadAt,
        messages: inquiry.messages,
      },
    });
  } catch (error) {
    console.error("Get inquiry conversation error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
