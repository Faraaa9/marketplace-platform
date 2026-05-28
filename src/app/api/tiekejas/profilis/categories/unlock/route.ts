import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveProvider } from "@/lib/provider-guard";
import { revalidateProviderCaches } from "@/lib/cache-invalidation";
import { unlockCategory, MAX_CATEGORY_MONTHS } from "@/lib/credits";

/**
 * POST /api/tiekejas/profilis/categories/unlock
 * Spend credits to unlock (or renew) an extra service category for a number of
 * 30-day periods. Body: { categoryId: string, months: number }.
 */
export async function POST(req: NextRequest) {
  await connection();
  try {
    const guard = await requireActiveProvider();
    if (!guard.authorized) return guard.response;

    const body = await req.json().catch(() => null);
    const categoryId = (body as { categoryId?: unknown })?.categoryId;
    const monthsRaw = (body as { months?: unknown })?.months;
    if (typeof categoryId !== "string" || !categoryId) {
      return NextResponse.json(
        { success: false, error: "Nenurodyta kategorija" },
        { status: 400 },
      );
    }
    const months = Math.min(
      Math.max(1, Math.floor(Number(monthsRaw) || 1)),
      MAX_CATEGORY_MONTHS,
    );

    const category = await prisma.category.findFirst({
      where: { id: categoryId, isActive: true },
      select: { id: true },
    });
    if (!category) {
      return NextResponse.json(
        { success: false, error: "Kategorija nerasta" },
        { status: 404 },
      );
    }

    const result = await unlockCategory({
      providerProfileId: guard.providerProfileId,
      categoryId,
      months,
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

    revalidateProviderCaches(guard.userId);

    return NextResponse.json({
      success: true,
      data: {
        alreadyFree: result.alreadyFree,
        balance: result.balance,
        expiresAt: result.expiresAt,
        cost: result.cost,
      },
    });
  } catch (error) {
    console.error("Category unlock error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
