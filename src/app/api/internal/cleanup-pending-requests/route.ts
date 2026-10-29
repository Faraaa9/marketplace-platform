import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendAlert } from "@/lib/alert";
import {
  countExpiryCandidates,
  expireStaleRequests,
  isRequestExpiryEnabled,
  REQUEST_EXPIRY_DAYS,
} from "@/lib/request-expiry";

const PENDING_CLEANUP_DAYS = 7;

/**
 * GET /api/internal/cleanup-pending-requests
 *
 * Vercel Cron daily DB hygiene: removes ServiceRequest rows stuck in
 * PENDING_CONFIRMATION older than PENDING_CLEANUP_DAYS — clients that never
 * confirmed their email. Those requests are invisible to everyone, just noise.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Same convention
 * used by /api/internal/claims/expire.
 *
 * Also expires OPEN requests idle for REQUEST_EXPIRY_DAYS (status EXPIRED +
 * one email to the customer). That part runs only with REQUEST_EXPIRY_ENABLED;
 * while off it reports how many requests WOULD expire.
 */
export async function GET(req: NextRequest) {
  await connection();
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!cronSecret) {
    // Vercel only sends the bearer when CRON_SECRET is set, so without it
    // every scheduled run is rejected and the job silently never runs.
    await sendAlert("cron:cleanup-pending:no-secret", "Cron cleanup-pending neveikia: nenustatytas CRON_SECRET", {});
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - PENDING_CLEANUP_DAYS * 24 * 60 * 60 * 1000);

    const result = await prisma.serviceRequest.deleteMany({
      where: {
        status: "PENDING_CONFIRMATION",
        createdAt: { lt: cutoff },
      },
    });

    console.info(
      `[cleanup-pending] Deleted ${result.count} stale PENDING_CONFIRMATION requests older than ${PENDING_CLEANUP_DAYS}d`,
    );

    const expiry = isRequestExpiryEnabled()
      ? { enabled: true, ...(await expireStaleRequests()) }
      : { enabled: false, wouldExpire: await countExpiryCandidates() };
    console.info(`[cleanup-pending] Request expiry (${REQUEST_EXPIRY_DAYS}d):`, JSON.stringify(expiry));

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      cutoff: cutoff.toISOString(),
      expiry,
    });
  } catch (error) {
    console.error("[cleanup-pending] Error:", error);
    await sendAlert("cron:cleanup-pending", "Cron cleanup-pending nepavyko", {
      Klaida: error instanceof Error ? error.stack ?? error.message : String(error),
    });
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
