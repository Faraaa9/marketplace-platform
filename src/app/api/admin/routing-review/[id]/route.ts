import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseReviewSubmission } from "@/lib/routing/review-queue";

/**
 * PATCH /api/admin/routing-review/:id — submit a review. Admin only.
 * Body: { action: "approve" }
 *    or { action: "correct", correctedCategoryIds, correctedCategoryNames,
 *         correctedPrimaryCategoryId?, correctedPrimaryCategoryName?,
 *         isAmbiguous?, notes? }
 * Re-reviewing an already-reviewed item is allowed and overwrites the label
 * (mirrors re-labeling a golden-eval row).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => null);
    const parsed = parseReviewSubmission(body);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
    }
    const sub = parsed.value;

    const existing = await prisma.routingReviewItem.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Peržiūros įrašas nerastas" },
        { status: 404 },
      );
    }

    const updated = await prisma.routingReviewItem.update({
      where: { id },
      data: {
        status: sub.action === "approve" ? "APPROVED" : "CORRECTED",
        reviewerId: session.user.id,
        reviewedAt: new Date(),
        correctedPrimaryCategoryId: sub.correctedPrimaryCategoryId,
        correctedPrimaryCategoryName: sub.correctedPrimaryCategoryName,
        correctedCategoryIds: sub.correctedCategoryIds,
        correctedCategoryNames: sub.correctedCategoryNames,
        correctedIsAmbiguous: sub.correctedIsAmbiguous,
        correctionNotes: sub.correctionNotes,
      },
      select: { id: true, status: true, reviewedAt: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Routing review submit error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
