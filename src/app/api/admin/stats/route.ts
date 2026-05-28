import { NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { isDynamicServerError } from "next/dist/client/components/hooks-server-context";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { countPendingModeration } from "@/lib/moderation/admin-actions";
import { buildDayBuckets } from "@/lib/admin/day-buckets";
import { getAiUsageStats } from "@/lib/admin/ai-usage";
import { getMarketplaceIntelligence } from "@/lib/admin/marketplace-intelligence";
import { getFollowUpAdminSignal } from "@/lib/admin/follow-up-signal";

export async function GET() {
  await connection();
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
      aiUsage,
      marketplaceIntelligence,
      followUps,
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
      getAiUsageStats(fourteenDaysAgo),
      getMarketplaceIntelligence(fourteenDaysAgo),
      getFollowUpAdminSignal(fourteenDaysAgo),
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
        aiUsage,
        marketplaceIntelligence,
        followUps,
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
