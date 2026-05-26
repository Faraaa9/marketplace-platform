import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildProviderLocationFilter } from "@/lib/provider-filters";
import { expandToMatchSet } from "@/lib/category-matching";

export const dynamic = "force-dynamic";

/**
 * GET /api/tiekejai — Public provider listing.
 * Only returns active, email-verified providers with safe fields.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "";
    const location = searchParams.get("location") || "";
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const perPage = 20;

    // Build filter — only active + email verified providers
    const where: Record<string, unknown> = {
      role: "PROVIDER",
      emailVerified: { not: null },
      providerProfile: { isActive: true, moderationStatus: "APPROVED" },
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { providerProfile: { description: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (category) {
      // ?category=<slug> — providers whose service categories match that branch.
      const picked = await prisma.category.findUnique({
        where: { slug: category },
        select: { id: true },
      });
      const matchSet = picked ? await expandToMatchSet([picked.id]) : [];
      where.providerProfile = {
        ...(where.providerProfile as Record<string, unknown>),
        categories: matchSet.length > 0
          ? { some: { categoryId: { in: matchSet } } }
          : { some: { categoryId: "__none__" } },
      };
    }

    if (location) {
      where.providerProfile = {
        ...(where.providerProfile as Record<string, unknown>),
        ...buildProviderLocationFilter(location),
      };
    }

    const [providers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          image: true,
          createdAt: true,
          providerProfile: {
            select: {
              description: true,
              location: true,
              images: true,
              isVerified: true,
              isPremium: true,
              isYoungTalent: true,
              isGoat: true,
              rating: true,
              reviewCount: true,
              categories: {
                select: {
                  category: { select: { id: true, name: true, slug: true } },
                },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
          _count: { select: { responses: true } },
          reviewsReceived: {
            select: { rating: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.user.count({ where }),
    ]);

    const mapped = providers.map((p) => {
      const images: string[] = p.providerProfile?.images ?? [];
      const categories = (p.providerProfile?.categories ?? []).map((link) => ({
        id: link.category.id,
        name: link.category.name,
        slug: link.category.slug,
      }));

      return {
        id: p.id,
        name: p.name,
        image: images[0] || p.image || null,
        description: p.providerProfile?.description || null,
        categories,
        location: p.providerProfile?.location || null,
        isVerified: p.providerProfile?.isVerified ?? false,
        isPremium: p.providerProfile?.isPremium ?? false,
        isYoungTalent: p.providerProfile?.isYoungTalent ?? false,
        isGoat: p.providerProfile?.isGoat ?? false,
        rating: p.providerProfile?.rating ?? null,
        reviewCount: p.providerProfile?.reviewCount ?? 0,
        responseCount: p._count.responses,
        memberSince: p.createdAt,
      };
    });

    // Sort: GOAT first, then premium, then verified, then by rating (null lowest), then by review count
    mapped.sort((a, b) => {
      if (a.isGoat !== b.isGoat) return a.isGoat ? -1 : 1;
      if (a.isPremium !== b.isPremium) return a.isPremium ? -1 : 1;
      if (a.isVerified !== b.isVerified) return a.isVerified ? -1 : 1;
      const aRating = a.rating ?? -1;
      const bRating = b.rating ?? -1;
      if (aRating !== bRating) return bRating - aRating;
      return b.reviewCount - a.reviewCount;
    });

    return NextResponse.json({
      success: true,
      data: { providers: mapped, total, pages: Math.ceil(total / perPage), page },
    });
  } catch (error) {
    console.error("Public providers error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
