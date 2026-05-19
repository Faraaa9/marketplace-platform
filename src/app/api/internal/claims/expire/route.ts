import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as claimService from "@/lib/imported/claim-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/internal/claims/expire — expire old pending claims.
 * Requires ADMIN session or valid CRON_SECRET.
 */
export async function POST(req: NextRequest) {
  try {
    // Allow cron secret for automated expiration
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCron) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id || session.user.role !== "ADMIN") {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
      }
    }

    const count = await claimService.expireOldClaims();
    return NextResponse.json({ success: true, data: { expired: count } });
  } catch (error) {
    console.error("POST /api/internal/claims/expire error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
