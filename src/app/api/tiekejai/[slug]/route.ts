import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCuid } from "@/lib/slug";

/**
 * GET /api/tiekejai/[slug] — Public provider profile.
 * Accepts either the provider's slug (preferred) or, for backwards
 * compatibility, their user cuid. Returns safe, public-facing data for
 * active providers along with trust signals.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;

    let userId: string | null = null;

    // Slug-first lookup.
    const bySlug = await prisma.providerProfile.findUnique({
      where: { slug },
      select: { userId: true },
    });
    if (bySlug) {
      userId = bySlug.userId;
    } else if (isCuid(slug)) {
      // Legacy URL: treat the path segment as a user cuid.
      userId = slug;
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Tiekėjas nerastas" },
        { status: 404 }
      );
    }

    const provider = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        image: true,
        createdAt: true,
        emailVerified: true,
        providerProfile: {
          select: {
            description: true,
            headline: true,
            services: true,
            priceFrom: true,
            experienceYears: true,
            offersInvoices: true,
            availableForUrgent: true,
            location: true,
            phone: true,
            website: true,
            images: true,
            isVerified: true,
            isPremium: true,
            isYoungTalent: true,
            isGoat: true,
            isActive: true,
            moderationStatus: true,
            createdAt: true,
            categories: {
              select: {
                category: { select: { id: true, name: true, slug: true } },
              },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        _count: { select: { responses: true } },
        responses: {
          select: {
            id: true,
            createdAt: true,
            requestId: true,
          },
          orderBy: { createdAt: "desc" as const },
        },
      },
    });

    if (
      !provider ||
      !provider.providerProfile?.isActive ||
      provider.providerProfile?.moderationStatus !== "APPROVED" ||
      !provider.emailVerified
    ) {
      return NextResponse.json(
        { success: false, error: "Tiekėjas nerastas" },
        { status: 404 }
      );
    }

    const badge = provider.providerProfile.isVerified ? "Patikimas" : null;

    const images: string[] = provider.providerProfile.images ?? [];
    const categories = (provider.providerProfile.categories ?? []).map((link) => ({
      id: link.category.id,
      name: link.category.name,
      slug: link.category.slug,
    }));

    // --- Trust signals ---

    // 1. Profile completeness (0-100)
    const profile = provider.providerProfile;
    let completenessPoints = 0;
    const maxPoints = 7;
    if (profile.description && profile.description.length >= 20) completenessPoints++;
    if (profile.headline) completenessPoints++;
    if (categories.length > 0) completenessPoints++;
    if (profile.services) completenessPoints++;
    if (profile.location) completenessPoints++;
    if (profile.phone) completenessPoints++;
    if (images.length > 0) completenessPoints++;
    const profileCompleteness = Math.round((completenessPoints / maxPoints) * 100);

    // 2. Accepted responses count (how many of their responses were chosen by clients)
    const responseIds = provider.responses.map((r) => r.id);
    let acceptedCount = 0;
    if (responseIds.length > 0) {
      acceptedCount = await prisma.serviceRequest.count({
        where: {
          acceptedResponseId: { in: responseIds },
        },
      });
    }

    // 3. Average response time (how fast they respond to requests)
    let avgResponseTimeHours: number | null = null;
    if (provider.responses.length > 0) {
      // Get the requests these responses belong to (limit to last 20 for performance)
      const recentResponses = provider.responses.slice(0, 20);
      const requestIds = Array.from(new Set(recentResponses.map((r) => r.requestId)));
      const requests = await prisma.serviceRequest.findMany({
        where: { id: { in: requestIds } },
        select: { id: true, createdAt: true },
      });
      const requestMap = new Map(requests.map((r) => [r.id, r.createdAt]));

      let totalMs = 0;
      let counted = 0;
      for (const resp of recentResponses) {
        const reqCreated = requestMap.get(resp.requestId);
        if (reqCreated) {
          const diff = resp.createdAt.getTime() - reqCreated.getTime();
          if (diff > 0) {
            totalMs += diff;
            counted++;
          }
        }
      }
      if (counted > 0) {
        avgResponseTimeHours = Math.round(totalMs / counted / (1000 * 60 * 60));
      }
    }

    // 4. Reviews
    const reviews = await prisma.review.findMany({
      where: { providerId: provider.id, moderationStatus: "APPROVED" },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        client: { select: { name: true } },
        request: {
          select: {
            title: true,
            categoryRef: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const avgRating =
      reviews.length > 0
        ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
        : null;

    const data = {
      id: provider.id,
      name: provider.name,
      image: images[0] || provider.image || null,
      images,
      description: provider.providerProfile.description,
      headline: provider.providerProfile.headline,
      services: provider.providerProfile.services,
      priceFrom: provider.providerProfile.priceFrom,
      experienceYears: provider.providerProfile.experienceYears,
      offersInvoices: provider.providerProfile.offersInvoices,
      availableForUrgent: provider.providerProfile.availableForUrgent,
      categories,
      location: provider.providerProfile.location,
      website: provider.providerProfile.website,
      badge,
      isVerified: provider.providerProfile.isVerified,
      isPremium: provider.providerProfile.isPremium,
      isYoungTalent: provider.providerProfile.isYoungTalent,
      isGoat: provider.providerProfile.isGoat,
      responseCount: provider._count.responses,
      acceptedCount,
      avgResponseTimeHours,
      profileCompleteness,
      avgRating,
      totalReviews: reviews.length,
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        clientName: r.client?.name || "Klientas",
        requestTitle: r.request.title,
        requestCategory: r.request.categoryRef?.name ?? null,
      })),
      lastActiveAt: provider.responses[0]?.createdAt || provider.providerProfile.createdAt,
      memberSince: provider.createdAt,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Public provider profile error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
