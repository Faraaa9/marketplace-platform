import { NextResponse } from "next/server";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Lightweight liveness + readiness probe for uptime monitoring.
 *
 * Returns 200 only when Prisma can issue a trivial query — this rules out the
 * single most common production outage (DB pool exhausted, migration in
 * flight, Supabase down). Anything more elaborate (Stripe ping, Resend ping)
 * would burn outbound rate limit on every poll for marginal extra signal.
 *
 * Response shape stays JSON so an alerting tool can pick up specific
 * sub-checks if needed.
 */
export async function GET() {
  // Opts the route out of the cacheComponents (Next 16 PPR) static shell —
  // an uptime probe must always hit the live DB.
  await connection();

  const startedAt = Date.now();
  let dbOk = false;
  let dbLatencyMs = 0;
  let error: string | undefined;

  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
    dbOk = true;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const status = dbOk ? 200 : 503;
  return NextResponse.json(
    {
      ok: dbOk,
      uptime: process.uptime?.() ?? null,
      checks: { db: { ok: dbOk, latencyMs: dbLatencyMs, error } },
      tookMs: Date.now() - startedAt,
    },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
