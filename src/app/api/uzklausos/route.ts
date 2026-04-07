import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const category = searchParams.get("category") || "";
    const location = searchParams.get("location") || "";
    const perPage = 20;

    const where: Record<string, unknown> = { status: "OPEN" };
    if (category) where.category = category;
    if (location) where.location = location;

    const [requests, total] = await Promise.all([
      prisma.serviceRequest.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          location: true,
          budget: true,
          createdAt: true,
          _count: { select: { responses: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.serviceRequest.count({ where }),
    ]);

    const pages = Math.ceil(total / perPage);

    return NextResponse.json({
      success: true,
      data: { requests, total, pages, page },
    });
  } catch (error) {
    console.error("Public requests error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko gauti užklausų" },
      { status: 500 }
    );
  }
}
