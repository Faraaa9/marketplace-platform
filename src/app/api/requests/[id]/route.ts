import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const request = await prisma.serviceRequest.findUnique({
      where: { id: params.id },
      include: {
        responses: {
          include: {
            provider: {
              select: { id: true, name: true, image: true, providerProfile: { select: { planType: true, location: true } } },
            },
            messages: {
              include: { sender: { select: { id: true, name: true } } },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!request) {
      return NextResponse.json({ success: false, error: "Užklausa nerasta" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: request });
  } catch (error) {
    console.error("Get request error:", error);
    return NextResponse.json({ success: false, error: "Klaida gaunant užklausą" }, { status: 500 });
  }
}
