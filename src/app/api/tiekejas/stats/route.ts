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

    // Profile completeness
    let images: string[] = [];
    try {
      const parsed = JSON.parse(profile.images || "[]");
      images = Array.isArray(parsed) ? parsed : [];
    } catch {}
    let specs: string[] = [];
    try { specs = JSON.parse(profile.specializations || "[]"); } catch {}

    const completenessItems = [
      { key: "description", done: !!(profile.description && profile.description.length >= 20), label: "Aprašymas" },
      { key: "headline", done: !!profile.headline, label: "Antraštė" },
      { key: "specializations", done: specs.length > 0, label: "Specializacijos" },
      { key: "services", done: !!profile.services, label: "Paslaugos" },
      { key: "location", done: !!profile.location, label: "Miestas" },
      { key: "phone", done: !!profile.phone, label: "Telefonas" },
      { key: "images", done: images.length > 0, label: "Nuotraukos" },
    ];
    const profileCompleteness = Math.round(
      (completenessItems.filter((i) => i.done).length / completenessItems.length) * 100
    );
    const missingProfileItems = completenessItems.filter((i) => !i.done).map((i) => i.label);

    // Accepted responses count
    const acceptedCount = await prisma.serviceRequest.count({
      where: {
        acceptedResponseId: { not: null },
        responses: { some: { providerId: session.user.id } },
      },
    });

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
        profileCompleteness,
        missingProfileItems,
        acceptedCount,
      },
    });
  } catch (error) {
    console.error("Provider stats error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
