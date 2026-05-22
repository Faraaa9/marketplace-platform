import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStoryEnabled } from "@/lib/platform-settings";
import { expandToMatchSet } from "@/lib/category-matching";

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

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        description: true,
        headline: true,
        services: true,
        categories: { select: { categoryId: true } },
        location: true,
        phone: true,
        images: true,
        isActive: true,
        creditBalance: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Neturite tiekėjo profilio", code: "NOT_PROVIDER" },
        { status: 403 }
      );
    }

    const categoryIds = profile.categories.map((c) => c.categoryId);
    const matchSet = await expandToMatchSet(categoryIds);

    const [totalRequests, matchingRequests, myResponseRows, user] = await Promise.all([
      prisma.serviceRequest.count({ where: { status: "OPEN" } }),
      categoryIds.length > 0
        ? prisma.serviceRequest.count({
            where: { status: "OPEN", categoryId: { in: matchSet }, clientId: { not: session.user.id } },
          })
        : Promise.resolve(0),
      prisma.response.findMany({
        where: { providerId: session.user.id },
        select: { id: true, request: { select: { acceptedResponseId: true } } },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true, emailVerified: true },
      }),
    ]);

    // Profile completeness
    const images: string[] = profile.images ?? [];
    const completenessItems = [
      { key: "description", done: !!(profile.description && profile.description.length >= 20), label: "Aprašymas" },
      { key: "headline", done: !!profile.headline, label: "Antraštė" },
      { key: "categories", done: categoryIds.length > 0, label: "Kategorijos" },
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

    // Total responses sent, and how many of those offers the client accepted.
    // "Accepted" means the request's accepted response is one of this
    // provider's own — not merely that some response on it was accepted.
    const myResponses = myResponseRows.length;
    const acceptedCount = myResponseRows.filter(
      (row) => row.request.acceptedResponseId === row.id,
    ).length;

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
        categoryCount: categoryIds.length,
        creditBalance: profile.creditBalance,
        isActive: profile.isActive || false,
        emailVerified: !!user?.emailVerified,
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
