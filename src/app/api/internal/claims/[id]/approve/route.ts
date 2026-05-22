import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as claimService from "@/lib/imported/claim-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/internal/claims/:id/approve — approve a pending claim.
 * Requires ADMIN session. Use /api/admin/claims/:id/approve for the full flow with email.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const result = await claimService.approveClaim(id, {
      reviewNotes: body.reviewNotes,
      reviewedByUserId: session.user.id,
    });

    if ("error" in result) {
      const status =
        result.error === "NOT_FOUND"
          ? 404
          : result.error === "APPROVAL_CONFLICT" || result.error === "IDENTITY_EXISTS"
            ? 409
            : 400;
      return NextResponse.json({ success: false, error: result.message, code: result.error }, { status });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("POST /api/internal/claims/:id/approve error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
