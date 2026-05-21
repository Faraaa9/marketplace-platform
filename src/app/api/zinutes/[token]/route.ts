import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
        provider: { select: { name: true } },
        messages: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
            senderName: true,
            sender: { select: { id: true, name: true } },
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
        description: inquiry.description,
        budget: inquiry.budget,
        senderName: inquiry.senderName,
        createdAt: inquiry.createdAt,
        messages: inquiry.messages,
      },
    });
  } catch (error) {
    console.error("Get inquiry conversation error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
