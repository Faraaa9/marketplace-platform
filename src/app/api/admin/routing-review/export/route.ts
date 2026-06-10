import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildEvalRecord } from "@/lib/routing/review-queue";

/**
 * GET /api/admin/routing-review/export — export REVIEWED items (APPROVED +
 * CORRECTED) as eval data. Admin only.
 *
 * Default format is JSONL, one record per line, field-compatible with
 * data/routing/eval/golden_eval_300_labeled.jsonl (suggested_* = AI decision,
 * gold_* = human label) so the output can be appended to / evaluated alongside
 * the existing golden set. `?format=json` returns a JSON array instead.
 * `?since=ISO-date` limits to reviews on/after that moment (incremental export).
 */
export async function GET(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") === "json" ? "json" : "jsonl";
    const sinceParam = searchParams.get("since");
    let since: Date | null = null;
    if (sinceParam) {
      const d = new Date(sinceParam);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ success: false, error: "Netinkama data" }, { status: 400 });
      }
      since = d;
    }

    const items = await prisma.routingReviewItem.findMany({
      where: {
        status: { in: ["APPROVED", "CORRECTED"] },
        ...(since ? { reviewedAt: { gte: since } } : {}),
      },
      select: {
        requestId: true,
        title: true,
        description: true,
        city: true,
        requestStatus: true,
        aiPrimaryCategoryName: true,
        aiCategoryNames: true,
        status: true,
        correctedPrimaryCategoryName: true,
        correctedCategoryNames: true,
        correctedIsAmbiguous: true,
        correctionNotes: true,
        reviewedAt: true,
      },
      orderBy: { reviewedAt: "asc" },
    });

    const records = items
      .map(buildEvalRecord)
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (format === "json") {
      return NextResponse.json({ success: true, data: records });
    }

    const jsonl = records.map((r) => JSON.stringify(r)).join("\n");
    return new NextResponse(jsonl ? jsonl + "\n" : "", {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Content-Disposition": 'attachment; filename="routing_review_eval.jsonl"',
      },
    });
  } catch (error) {
    console.error("Routing review export error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
