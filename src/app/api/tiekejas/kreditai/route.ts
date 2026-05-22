import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveProvider } from "@/lib/provider-guard";
import { getCreditLedger } from "@/lib/credits";

export const dynamic = "force-dynamic";

/**
 * GET /api/tiekejas/kreditai
 * Credit balance, the buyable packs, and recent ledger history for the
 * provider's own credits page.
 */
export async function GET() {
  try {
    const guard = await requireActiveProvider();
    if (!guard.authorized) return guard.response;

    const [packs, ledger] = await Promise.all([
      prisma.creditPack.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, credits: true, priceCents: true, currency: true },
      }),
      getCreditLedger(guard.providerProfileId, 20),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        balance: guard.creditBalance,
        packs,
        ledger,
      },
    });
  } catch (error) {
    console.error("Provider credits error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
