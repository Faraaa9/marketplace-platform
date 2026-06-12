import { NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Lightweight summary for the "active requests" strip on /uzklausos/nauja and
// the header badge: how many of the user's requests are live and how many
// proposal conversations hold messages the client hasn't read yet.
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
      select: {
        responses: {
          select: { lastMessageAt: true, clientLastReadAt: true },
        },
      },
    });

    let unreadCount = 0;
    for (const request of requests) {
      for (const response of request.responses) {
        if (!response.clientLastReadAt || response.lastMessageAt > response.clientLastReadAt) {
          unreadCount += 1;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: { activeCount: requests.length, unreadCount },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Serverio klaida" }, { status: 500 });
  }
}
