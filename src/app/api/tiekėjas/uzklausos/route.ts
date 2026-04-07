import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROVIDER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
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
          status: true,
          createdAt: true,
          _count: { select: { responses: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.serviceRequest.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: { requests, total, pages: Math.ceil(total / perPage), page },
    });
  } catch (error) {
    console.error("Provider requests error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
