import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/claims — list claims with pagination and filters.
 * Requires ADMIN session.
 */
export async function GET(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [claims, total] = await Promise.all([
      prisma.claimRequest.findMany({
        where,
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        skip,
        take: limit,
        select: {
          id: true,
          providerProfileId: true,
          requestedByEmail: true,
          requestedByUserId: true,
          verificationMethod: true,
          status: true,
          expiresAt: true,
          emailVerifiedAt: true,
          reviewedAt: true,
          reviewedByUserId: true,
          reviewNotes: true,
          submittedEvidenceJson: true,
          createdAt: true,
          updatedAt: true,
          providerProfile: {
            select: {
              id: true,
              displayName: true,
              slug: true,
              status: true,
              location: true,
              externalSourceUrl: true,
            },
          },
          requestedBy: {
            select: { id: true, name: true, email: true },
          },
          reviewedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.claimRequest.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: claims,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET /api/admin/claims error:", error);
    return NextResponse.json({ success: false, error: "Vidinė serverio klaida" }, { status: 500 });
  }
}
