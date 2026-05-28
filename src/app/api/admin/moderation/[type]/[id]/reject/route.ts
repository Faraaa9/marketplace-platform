import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { moderateEntity, isModerationType } from "@/lib/moderation/admin-actions";

/** POST /api/admin/moderation/:type/:id/reject — reject a held item. Admin only. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { type, id } = await params;
    if (!isModerationType(type)) {
      return NextResponse.json(
        { success: false, error: "Nežinomas turinio tipas" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const result = await moderateEntity(type, id, "reject", session.user.id, body.reviewNotes);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error === "NOT_FOUND" ? 404 : 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin moderation reject error:", error);
    return NextResponse.json({ success: false, error: "Vidinė serverio klaida" }, { status: 500 });
  }
}
