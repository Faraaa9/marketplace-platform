import { NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ThreadKind = "response" | "directInquiry";

interface ReadPayload {
  threadKind?: string;
  threadId?: string;
  trackingToken?: string | null;
}

function isThreadKind(value: string | undefined): value is ThreadKind {
  return value === "response" || value === "directInquiry";
}

export async function POST(req: Request) {
  await connection();
  try {
    const body = (await req.json().catch(() => null)) as ReadPayload | null;
    if (!body || !isThreadKind(body.threadKind) || !body.threadId) {
      return NextResponse.json({ success: false, error: "Neteisinga užklausa" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
    const trackingToken = typeof body.trackingToken === "string" ? body.trackingToken : null;
    const readAt = new Date();

    if (body.threadKind === "directInquiry") {
      const inquiry = await prisma.directInquiry.findUnique({
        where: { id: body.threadId },
        select: {
          id: true,
          providerId: true,
          senderUserId: true,
          trackingToken: true,
        },
      });

      if (!inquiry) {
        return NextResponse.json({ success: false, error: "Pokalbis nerastas" }, { status: 404 });
      }

      const field =
        userId && userId === inquiry.providerId
          ? "providerLastReadAt"
          : (userId && userId === inquiry.senderUserId) || trackingToken === inquiry.trackingToken
            ? "clientLastReadAt"
            : null;

      if (!field) {
        return NextResponse.json({ success: false, error: "Neturite teisės" }, { status: 403 });
      }

      await prisma.directInquiry.update({
        where: { id: inquiry.id },
        data:
          field === "providerLastReadAt"
            ? { providerLastReadAt: readAt }
            : { clientLastReadAt: readAt },
        select: { id: true },
      });

      return NextResponse.json({
        success: true,
        data: { field, readAt: readAt.toISOString() },
      });
    }

    const response = await prisma.response.findUnique({
      where: { id: body.threadId },
      select: {
        id: true,
        providerId: true,
        request: {
          select: {
            clientId: true,
            trackingToken: true,
          },
        },
      },
    });

    if (!response) {
      return NextResponse.json({ success: false, error: "Pokalbis nerastas" }, { status: 404 });
    }

    const field =
      userId && userId === response.providerId
        ? "providerLastReadAt"
        : (userId && userId === response.request.clientId) ||
            trackingToken === response.request.trackingToken
          ? "clientLastReadAt"
          : null;

    if (!field) {
      return NextResponse.json({ success: false, error: "Neturite teisės" }, { status: 403 });
    }

    await prisma.response.update({
      where: { id: response.id },
      data:
        field === "providerLastReadAt"
          ? { providerLastReadAt: readAt }
          : { clientLastReadAt: readAt },
      select: { id: true },
    });

    return NextResponse.json({
      success: true,
      data: { field, readAt: readAt.toISOString() },
    });
  } catch (error) {
    console.error("[realtime/read] failed", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
