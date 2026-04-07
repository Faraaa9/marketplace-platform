import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { messageSchema } from "@/lib/validations";
import { sanitizeHtml } from "@/lib/sanitize";

/**
 * Post a message to a response thread.
 * Only the provider who owns the response OR the client who owns the request can post.
 * params.id = response ID (the thread)
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Prisijunkite" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: (parsed.error.issues?.[0]?.message || "Validacijos klaida") }, { status: 400 });
    }

    // Fetch response with its parent request to check ownership
    const response = await prisma.response.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        providerId: true,
        request: {
          select: { clientId: true },
        },
      },
    });

    if (!response) {
      return NextResponse.json({ success: false, error: "Atsakymas nerastas" }, { status: 404 });
    }

    // Authorization: only the response's provider or the request's client can post
    const isProvider = response.providerId === session.user.id;
    const isClient = response.request.clientId === session.user.id;

    if (!isProvider && !isClient) {
      return NextResponse.json({ success: false, error: "Neturite teisės rašyti šioje diskusijoje" }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        responseId: params.id,
        senderId: session.user.id,
        senderName: session.user.name || null,
        content: sanitizeHtml(parsed.data.content),
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        senderName: true,
        sender: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ success: false, error: "Klaida siunčiant žinutę" }, { status: 500 });
  }
}
