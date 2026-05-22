import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectivePlanType } from "@/lib/constants";
import { buildProviderLocationFilter } from "@/lib/provider-filters";

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
      // ?category=<slug> — providers whose curated categories include it.
      const picked = await prisma.category.findUnique({
        where: { slug: category },
        select: { id: true },
      });
      where.providerProfile = {
        ...(where.providerProfile as Record<string, unknown>),
        categories: picked
          ? { some: { categoryId: picked.id } }
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
              planType: true,
              categories: {
                select: {
                  category: { select: { id: true, name: true, slug: true } },
                },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
          subscription: { select: { status: true } },
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

    // Resolve effective plan and sort PRO first
    const mapped = providers.map((p) => {
      const planType = getEffectivePlanType(
        p.providerProfile?.planType || "FREE",
        p.subscription?.status
      );
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
        planType,
        responseCount: p._count.responses,
        memberSince: p.createdAt,
      };
    });

    // Sort: PRO first, then BASIC, then FREE
    const planOrder: Record<string, number> = { PRO: 0, BASIC: 1, FREE: 2 };
    mapped.sort((a, b) => (planOrder[a.planType] ?? 2) - (planOrder[b.planType] ?? 2));

    return NextResponse.json({
      success: true,
      data: { providers: mapped, total, pages: Math.ceil(total / perPage), page },
    });
  } catch (error) {
    console.error("Public providers error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
