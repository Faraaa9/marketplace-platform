import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { isDynamicServerError } from "next/dist/client/components/hooks-server-context";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { countPendingModeration } from "@/lib/moderation/admin-actions";

export const dynamic = "force-dynamic";

type DayBucket = { date: string; label: string; count: number };

function buildDayBuckets(rows: { createdAt: Date }[]): DayBucket[] {
  const dayCounts = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dayCounts.set(date.toISOString().split("T")[0], 0);
  }
  for (const row of rows) {
    const key = row.createdAt.toISOString().split("T")[0];
    if (dayCounts.has(key)) {
      dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
    }
  }
  return Array.from(dayCounts.entries()).map(([date, count]) => ({
    date,
    label: new Date(date).toLocaleDateString("lt-LT", { month: "short", day: "numeric" }),
    count,
  }));
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalProviders,
      totalRequests,
      totalResponses,
      pendingRequests,
      pendingActivation,
      pendingClaims,
      pendingModeration,
      recentRequests,
      recentResponses,
      recentUsers,
      recentProviders,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "PROVIDER" } }),
      prisma.serviceRequest.count(),
      prisma.response.count(),
      prisma.serviceRequest.count({ where: { status: "PENDING_CONFIRMATION" } }),
      prisma.providerProfile.count({ where: { isActive: false } }),
      prisma.claimRequest.count({ where: { status: "pending" } }),
      countPendingModeration(),
      prisma.serviceRequest.findMany({
        where: { createdAt: { gte: fourteenDaysAgo } },
        select: { createdAt: true },
      }),
      prisma.response.findMany({
        where: { createdAt: { gte: fourteenDaysAgo } },
        select: { createdAt: true },
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: fourteenDaysAgo } },
        select: { createdAt: true },
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: fourteenDaysAgo }, role: "PROVIDER" },
        select: { createdAt: true },
      }),
    ]);

    const chartData = buildDayBuckets(recentRequests);
    const usersChart = buildDayBuckets(recentUsers);
    const providersChart = buildDayBuckets(recentProviders);
    const responsesChart = buildDayBuckets(recentResponses);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalProviders,
        totalRequests,
        totalResponses,
        pendingRequests,
        pendingActivation,
        pendingClaims,
        pendingModeration,
        chartData,
        usersChart,
        providersChart,
        responsesChart,
      },
    });
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error;
    }
    console.error("Admin stats error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
