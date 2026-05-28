import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listModeration,
  isModerationType,
  isModerationStatus,
} from "@/lib/moderation/admin-actions";

/** GET /api/admin/moderation?status=&type=&page= — moderation review queue. */
export async function GET(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = (searchParams.get("status") || "PENDING").toUpperCase();
    const status = isModerationStatus(statusParam) ? statusParam : "PENDING";
    const typeParam = searchParams.get("type") || "";
    const type = isModerationType(typeParam) ? typeParam : null;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const perPage = 20;

    const { items, total } = await listModeration({ type, status, page, perPage });

    return NextResponse.json({
      success: true,
      data: items,
      pagination: { page, limit: perPage, total, totalPages: Math.ceil(total / perPage) },
    });
  } catch (error) {
    console.error("Admin moderation list error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
