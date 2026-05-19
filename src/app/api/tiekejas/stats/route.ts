import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS, getEffectivePlanType } from "@/lib/constants";
import { isStoryEnabled } from "@/lib/platform-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "PROVIDER") {
      return NextResponse.json(
        { success: false, error: "Neturite tiekėjo rolės", code: "NOT_PROVIDER" },
        { status: 403 }
      );
    }

    // Check for provider profile existence (not just role)
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        description: true,
        headline: true,
        services: true,
        specializations: true,
        location: true,
        phone: true,
        images: true,
        isActive: true,
        planType: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Neturite tiekėjo profilio", code: "NOT_PROVIDER" },
        { status: 403 }
      );
    }

    const specs: string[] = profile.specializations ?? [];

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const [totalRequests, matchingRequests, myResponses, thisMonthResponses, user, subscription] = await Promise.all([
      prisma.serviceRequest.count({ where: { status: "OPEN" } }),
      specs.length > 0
        ? prisma.serviceRequest.count({
            where: { status: "OPEN", category: { in: specs }, clientId: { not: session.user.id } },
          })
        : Promise.resolve(0),
      prisma.response.count({ where: { providerId: session.user.id } }),
      prisma.response.count({
        where: { providerId: session.user.id, createdAt: { gte: startOfMonth } },
      }),
      prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true, emailVerified: true } }),
      prisma.subscription.findUnique({ where: { userId: session.user.id }, select: { status: true } }),
    ]);

    const storedPlan = profile.planType || "FREE";
    const effectivePlan = getEffectivePlanType(storedPlan, subscription?.status);
    const limit = PLAN_LIMITS[effectivePlan]?.responsesPerMonth ?? 3;
    const responsesRemaining = limit === -1 ? -1 : Math.max(0, limit - thisMonthResponses);

    // Profile completeness
    const images: string[] = profile.images ?? [];
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

    // Profile image URL (first image)
    const profileImageUrl: string | null = images[0] ?? null;

    // Story feature flag + active count
    const storyEnabled = await isStoryEnabled();
    const activeStoryCount = storyEnabled
      ? await prisma.providerStory.count({
          where: { providerId: session.user.id, expiresAt: { gt: new Date() } },
        })
      : 0;

    // Accepted responses count
    const acceptedCount = await prisma.serviceRequest.count({
      where: {
        acceptedResponseId: { not: null },
        responses: { some: { providerId: session.user.id } },
      },
    });

    // Pending claim for this user (show pending state on dashboard)
    const pendingClaim = await prisma.claimRequest.findFirst({
      where: {
        requestedByUserId: session.user.id,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        status: true,
        supplier: { select: { displayName: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        userName: user?.name || null,
        userEmail: user?.email || null,
        totalRequests,
        matchingRequests,
        myResponses,
        specializations: specs,
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
        profileImageUrl,
        activeStoryCount,
        storyEnabled,
        pendingClaim: pendingClaim || null,
      },
    });
  } catch (error) {
    console.error("Provider stats error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
