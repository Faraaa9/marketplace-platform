import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isDynamicServerError } from "next/dist/client/components/hooks-server-context";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const BODY_PREVIEW_LIMIT = 4000;

/** GET /api/admin/laiskai — paginated list of emails received via the Resend inbound webhook. */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const where =
      statusParam === "INBOX" || statusParam === "ROUTED" ? { status: statusParam } : {};

    const [total, emails] = await Promise.all([
      prisma.inboundEmail.count({ where }),
      prisma.inboundEmail.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          fromAddress: true,
          toAddress: true,
          subject: true,
          textBody: true,
          status: true,
          routedMessageId: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: emails.map((email) => ({
        ...email,
        textBody: email.textBody?.slice(0, BODY_PREVIEW_LIMIT) ?? null,
      })),
      pagination: {
        page,
        limit: PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      },
    });
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error;
    }
    console.error("Admin inbound emails error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
