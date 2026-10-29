import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveProvider } from "@/lib/provider-guard";
import { getCreditBalance, getCreditLedger } from "@/lib/credits";

/**
 * GET /api/tiekejas/kreditai
 * Credit balance, the buyable packs, and recent ledger history for the
 * provider's own credits page.
 */
export async function GET() {
  await connection();
  try {
    const guard = await requireActiveProvider();
    if (!guard.authorized) return guard.response;

    // Live balance, not guard.creditBalance: the guard caches it for 2 min,
    // which showed a stale number right after an unlock or a purchase.
    const [packs, ledger, balance] = await Promise.all([
      prisma.creditPack.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, credits: true, priceCents: true, currency: true },
      }),
      getCreditLedger(guard.providerProfileId, 20),
      getCreditBalance(guard.providerProfileId),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        balance,
        packs,
        ledger,
      },
    });
  } catch (error) {
    console.error("Provider credits error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
