import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS, getEffectivePlanType } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check for provider profile existence (not just role)
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Neturite tiekėjo profilio", code: "NOT_PROVIDER" },
        { status: 403 }
      );
    }

    const [totalRequests, myResponses, user, subscription] = await Promise.all([
      prisma.serviceRequest.count({ where: { status: "OPEN" } }),
      prisma.response.count({ where: { providerId: session.user.id } }),
      prisma.user.findUnique({ where: { id: session.user.id }, select: { emailVerified: true } }),
      prisma.subscription.findUnique({ where: { userId: session.user.id }, select: { status: true } }),
    ]);

    const thisMonthResponses = await prisma.response.count({
      where: {
        providerId: session.user.id,
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    });

    const storedPlan = profile.planType || "FREE";
    const effectivePlan = getEffectivePlanType(storedPlan, subscription?.status);
    const limit = PLAN_LIMITS[effectivePlan]?.responsesPerMonth ?? 3;
    const responsesRemaining = limit === -1 ? -1 : Math.max(0, limit - thisMonthResponses);

    return NextResponse.json({
      success: true,
      data: {
        totalRequests,
        myResponses,
        thisMonthResponses,
        planType: effectivePlan,
        storedPlanType: storedPlan,
        subscriptionStatus: subscription?.status || null,
        isActive: profile.isActive || false,
        emailVerified: !!user?.emailVerified,
        responsesRemaining,
        responsesLimit: limit,
      },
    });
  } catch (error) {
    console.error("Provider stats error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
