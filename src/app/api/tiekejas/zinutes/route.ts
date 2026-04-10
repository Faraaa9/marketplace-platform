import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveProvider } from "@/lib/provider-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const guard = await requireActiveProvider();
    if (!guard.authorized) return guard.response;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || ""; // "", "NEW", "READ", "ARCHIVED"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const perPage = 20;

    const where: Record<string, unknown> = {
      providerId: guard.userId,
    };
    if (status) {
      where.status = status;
    } else {
      // Default: show NEW and READ (not archived)
      where.status = { in: ["NEW", "READ"] };
    }

    const [inquiries, total, unreadCount] = await Promise.all([
      prisma.directInquiry.findMany({
        where,
        select: {
          id: true,
          description: true,
          budget: true,
          senderEmail: true,
          senderPhone: true,
          senderName: true,
          senderUserId: true,
          status: true,
          createdAt: true,
          sender: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.directInquiry.count({ where }),
      prisma.directInquiry.count({
        where: { providerId: guard.userId, status: "NEW" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        inquiries,
        total,
        pages: Math.ceil(total / perPage),
        page,
        unreadCount,
      },
    });
  } catch (error) {
    console.error("Provider inquiries error:", error);
    return NextResponse.json(
      { success: false, error: "Klaida" },
      { status: 500 }
    );
  }
}
