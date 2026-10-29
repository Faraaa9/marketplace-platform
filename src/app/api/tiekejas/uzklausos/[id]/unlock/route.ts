import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveProvider } from "@/lib/provider-guard";
import { checkEligibility } from "@/lib/provider-eligibility";
import { activeCategoryFilter } from "@/lib/category-matching";
import { unlockLead } from "@/lib/credits";

/**
 * POST /api/tiekejas/uzklausos/[id]/unlock
 * Spends one credit to unlock a lead — reveals the client's contact details
 * and unlocks responding. Idempotent: unlocking an already-unlocked lead is
 * a no-op and is not charged again.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  try {
    const { id } = await params;
    const guard = await requireActiveProvider();
    if (!guard.authorized) return guard.response;

    const [request, profile] = await Promise.all([
      prisma.serviceRequest.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          clientId: true,
          categoryRef: { select: { id: true, rootId: true, parentId: true } },
          categories: { select: { category: { select: { id: true, rootId: true, parentId: true } } } },
        },
      }),
      prisma.providerProfile.findUnique({
        where: { id: guard.providerProfileId },
        select: {
          categories: {
            where: activeCategoryFilter(),
            select: { category: { select: { id: true, rootId: true, parentId: true } } },
          },
        },
      }),
    ]);

    if (!request) {
      return NextResponse.json({ success: false, error: "Užklausa nerasta" }, { status: 404 });
    }

    // Category eligibility still gates unlocking — no point paying for a lead
    // a provider could not serve or respond to.
    const providerCategories = (profile?.categories ?? []).map((c) => c.category);
    const eligibility = checkEligibility(
      guard.userId,
      { status: request.status, clientId: request.clientId, category: request.categoryRef, categories: request.categories },
      providerCategories,
    );
    if (!eligibility.allowed) {
      return NextResponse.json(
        { success: false, error: eligibility.message, code: eligibility.code },
        { status: 403 },
      );
    }

    const result = await unlockLead({
      providerProfileId: guard.providerProfileId,
      requestId: id,
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Nepakanka kreditų. Papildykite balansą.",
          code: "INSUFFICIENT_CREDITS",
          balance: result.balance,
        },
        { status: 402 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        unlocked: true,
        alreadyUnlocked: result.alreadyUnlocked,
        balance: result.balance,
      },
    });
  } catch (error) {
    console.error("Unlock lead error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
