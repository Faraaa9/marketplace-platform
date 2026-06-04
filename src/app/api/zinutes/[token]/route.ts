import { after, NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatLastSeen, getPresenceLevel } from "@/lib/presence";
import { getProviderAvatarImage } from "@/lib/provider-image";
import { createServerTimer } from "@/lib/server-timing";

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

    timer.end({ messages: inquiry.messages.length });
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
        messages: inquiry.messages,
      },
    });
  } catch (error) {
    console.error("Get inquiry conversation error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
