import { NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createServerTimer } from "@/lib/server-timing";

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
  const timer = createServerTimer("realtime-read");
  try {
    const body = (await req.json().catch(() => null)) as ReadPayload | null;
    timer.mark("parseBody");
    if (!body || !isThreadKind(body.threadKind) || !body.threadId) {
      return NextResponse.json({ success: false, error: "Neteisinga užklausa" }, { status: 400 });
    }

    const trackingToken = typeof body.trackingToken === "string" ? body.trackingToken : null;
    const readAt = new Date();

    if (body.threadKind === "directInquiry") {
      if (trackingToken) {
        const tokenRead = await prisma.directInquiry.updateMany({
          where: { id: body.threadId, trackingToken },
          data: { clientLastReadAt: readAt },
        });
        timer.mark("tokenUpdate");
        if (tokenRead.count > 0) {
          timer.end({ kind: body.threadKind, path: "token" });
          return NextResponse.json({
            success: true,
            data: { field: "clientLastReadAt", readAt: readAt.toISOString() },
          });
        }
      }

      const session = await getServerSession(authOptions);
      timer.mark("session");
      const sessionUser = session?.user as { id?: string; role?: string } | undefined;
      const userId = sessionUser?.id ?? null;
      const isProvider = sessionUser?.role === "PROVIDER";

      if (userId && isProvider) {
        const providerRead = await prisma.directInquiry.updateMany({
          where: { id: body.threadId, providerId: userId },
          data: { providerLastReadAt: readAt },
        });
        timer.mark("providerUpdate");
        if (providerRead.count > 0) {
          timer.end({ kind: body.threadKind, path: "provider" });
          return NextResponse.json({
            success: true,
            data: { field: "providerLastReadAt", readAt: readAt.toISOString() },
          });
        }
      }

      if (userId) {
        const clientRead = await prisma.directInquiry.updateMany({
          where: { id: body.threadId, senderUserId: userId },
          data: { clientLastReadAt: readAt },
        });
        timer.mark("clientUpdate");
        if (clientRead.count > 0) {
          timer.end({ kind: body.threadKind, path: "client" });
          return NextResponse.json({
            success: true,
            data: { field: "clientLastReadAt", readAt: readAt.toISOString() },
          });
        }
      }

      const inquiry = await prisma.directInquiry.findUnique({
        where: { id: body.threadId },
        select: {
          id: true,
          trackingToken: true,
        },
      });
      timer.mark("tokenLookup");

      if (!inquiry) {
        return NextResponse.json({ success: false, error: "Pokalbis nerastas" }, { status: 404 });
      }

      if (trackingToken !== inquiry.trackingToken) {
        return NextResponse.json({ success: false, error: "Neturite teisės" }, { status: 403 });
      }

      await prisma.directInquiry.update({
        where: { id: inquiry.id },
        data: { clientLastReadAt: readAt },
        select: { id: true },
      });
      timer.mark("tokenUpdate");
      timer.end({ kind: body.threadKind, path: "token" });

      return NextResponse.json({
        success: true,
        data: { field: "clientLastReadAt", readAt: readAt.toISOString() },
      });
    }

    const session = await getServerSession(authOptions);
    timer.mark("session");
    const sessionUser = session?.user as { id?: string; role?: string } | undefined;
    const userId = sessionUser?.id ?? null;

    if (userId) {
      const providerRead = await prisma.response.updateMany({
        where: { id: body.threadId, providerId: userId },
        data: { providerLastReadAt: readAt },
      });
      timer.mark("providerUpdate");
      if (providerRead.count > 0) {
        timer.end({ kind: body.threadKind, path: "provider" });
        return NextResponse.json({
          success: true,
          data: { field: "providerLastReadAt", readAt: readAt.toISOString() },
        });
      }
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
    timer.mark("responseLookup");

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
    timer.mark("responseUpdate");
    timer.end({ kind: body.threadKind, path: field });

    return NextResponse.json({
      success: true,
      data: { field, readAt: readAt.toISOString() },
    });
  } catch (error) {
    console.error("[realtime/read] failed", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
