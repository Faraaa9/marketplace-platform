import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Prisijunkite" }, { status: 401 });
    }

    const requests = await prisma.serviceRequest.findMany({
      where: { clientId: session.user.id },
      select: {
        id: true,
        trackingToken: true,
        title: true,
        categoryRef: { select: { name: true } },
        location: true,
        status: true,
        createdAt: true,
        _count: { select: { responses: true } },
        responses: {
          select: { createdAt: true },
          orderBy: { createdAt: "desc" as const },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Flatten last response date
    const data = requests.map(({ responses, ...rest }) => ({
      ...rest,
      lastResponseAt: responses[0]?.createdAt || null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Get my requests error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
