import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { REVIEW_STATUSES, type ReviewStatus } from "@/lib/routing/review-queue";

/**
 * GET /api/admin/routing-review — list review items (default: PENDING, oldest
 * first so the queue drains FIFO). Admin only.
 * Query: ?status=PENDING|APPROVED|CORRECTED|all &page= &limit=
 */
export async function GET(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = (searchParams.get("status") || "PENDING").toUpperCase();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const where =
      statusParam === "ALL"
        ? {}
        : REVIEW_STATUSES.includes(statusParam as ReviewStatus)
          ? { status: statusParam }
          : null;
    if (where === null) {
      return NextResponse.json({ success: false, error: "Netinkamas statusas" }, { status: 400 });
    }

    const [items, total] = await Promise.all([
      prisma.routingReviewItem.findMany({
        where,
        select: {
          id: true,
          requestId: true,
          decisionLogId: true,
          routingVersion: true,
          title: true,
          description: true,
          city: true,
          requestStatus: true,
          aiPrimaryCategoryId: true,
          aiPrimaryCategoryName: true,
          aiCategoryIds: true,
          aiCategoryNames: true,
          aiConfidence: true,
          aiModel: true,
          status: true,
          reviewerId: true,
          reviewedAt: true,
          correctedPrimaryCategoryId: true,
          correctedPrimaryCategoryName: true,
          correctedCategoryIds: true,
          correctedCategoryNames: true,
          correctedIsAmbiguous: true,
          correctionNotes: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
      }),
      prisma.routingReviewItem.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Routing review list error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}

/**
 * POST /api/admin/routing-review — manually enqueue an existing routing
 * decision for review. Admin only. Body: { decisionLogId: string }.
 * The request snapshot is joined from ServiceRequest; the AI decision comes
 * from the RoutingDecisionLog row. Idempotent per (requestId, routingVersion).
 */
export async function POST(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as { decisionLogId?: unknown } | null;
    const decisionLogId =
      typeof body?.decisionLogId === "string" && body.decisionLogId.trim()
        ? body.decisionLogId.trim()
        : null;
    if (!decisionLogId) {
      return NextResponse.json(
        { success: false, error: "Trūksta decisionLogId" },
        { status: 400 },
      );
    }

    const log = await prisma.routingDecisionLog.findUnique({
      where: { id: decisionLogId },
      select: {
        id: true,
        requestId: true,
        routingVersion: true,
        v4CategoryIds: true,
        v4CategoryNames: true,
        routingConfidence: true,
      },
    });
    if (!log) {
      return NextResponse.json(
        { success: false, error: "Sprendimo įrašas nerastas" },
        { status: 404 },
      );
    }

    const request = await prisma.serviceRequest.findUnique({
      where: { id: log.requestId },
      select: { id: true, title: true, description: true, location: true, status: true },
    });
    if (!request) {
      return NextResponse.json({ success: false, error: "Užklausa nerasta" }, { status: 404 });
    }

    // create (not upsert) + unique constraint keeps an in-progress review
    // untouched on duplicate enqueue; report which outcome happened.
    let created = true;
    try {
      await prisma.routingReviewItem.create({
        data: {
          requestId: log.requestId,
          decisionLogId: log.id,
          routingVersion: log.routingVersion,
          title: request.title,
          description: request.description,
          city: request.location,
          requestStatus: request.status,
          aiPrimaryCategoryId: log.v4CategoryIds[0] ?? null,
          aiPrimaryCategoryName: log.v4CategoryNames[0] ?? null,
          aiCategoryIds: log.v4CategoryIds,
          aiCategoryNames: log.v4CategoryNames,
          aiConfidence: log.routingConfidence,
          aiModel: null,
        },
        select: { id: true },
      });
    } catch (error) {
      if ((error as { code?: string } | null)?.code !== "P2002") throw error;
      created = false;
    }

    return NextResponse.json({ success: true, data: { created } }, { status: created ? 201 : 200 });
  } catch (error) {
    console.error("Routing review enqueue error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
