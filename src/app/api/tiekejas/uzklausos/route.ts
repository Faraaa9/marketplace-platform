import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveProvider } from "@/lib/provider-guard";
import { expandToMatchSet } from "@/lib/category-matching";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const guard = await requireActiveProvider();
    if (!guard.authorized) return guard.response;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const category = searchParams.get("category") || "";
    const location = searchParams.get("location") || "";
    const search = searchParams.get("search") || "";
    const sort = searchParams.get("sort") || "relevance";
    const perPage = 20;

    // Load provider profile — curated categories drive matching + relevance.
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: guard.userId },
      select: {
        location: true,
        categories: { select: { categoryId: true } },
      },
    });

    const providerCategoryIds = profile?.categories.map((c) => c.categoryId) ?? [];
    const providerLocation = profile?.location || "";

    // The set of request categoryIds this provider can serve (tree-aware).
    const providerMatchSet = await expandToMatchSet(providerCategoryIds);

    // An explicit ?category= filter (curated slug) narrows to that branch.
    let filterIds = providerMatchSet;
    if (category) {
      const picked = await prisma.category.findUnique({
        where: { slug: category },
        select: { id: true },
      });
      filterIds = picked ? await expandToMatchSet([picked.id]) : [];
    }

    const where: Record<string, unknown> = {
      status: "OPEN",
      moderationStatus: "APPROVED",
      clientId: { not: guard.userId },
      categoryId: { in: filterIds },
    };
    if (location) where.location = location;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const allRequests = await prisma.serviceRequest.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        categoryId: true,
        categoryRef: { select: { id: true, name: true } },
        location: true,
        budget: true,
        status: true,
        createdAt: true,
        _count: { select: { responses: true } },
        responses: {
          where: { providerId: guard.userId },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Score relevance + mark responded.
    const providerMatch = new Set(providerMatchSet);
    const scored = allRequests.map((reqRow) => {
      let score = 0;
      if (reqRow.categoryId && providerMatch.has(reqRow.categoryId)) score += 2;
      if (
        reqRow.location === providerLocation ||
        reqRow.location === "Visa Lietuva" ||
        providerLocation === "Visa Lietuva"
      ) {
        score += 1;
      }
      const { responses, ...rest } = reqRow;
      return { ...rest, relevance: score, hasResponded: responses.length > 0 };
    });

    // Sort
    if (sort === "newest") {
      scored.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } else {
      // relevance (default)
      scored.sort((a, b) => {
        if (b.relevance !== a.relevance) return b.relevance - a.relevance;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    const total = scored.length;
    const pages = Math.ceil(total / perPage);
    const paginated = scored.slice((page - 1) * perPage, page * perPage);

    return NextResponse.json({
      success: true,
      data: {
        requests: paginated,
        total,
        pages,
        page,
        hasCategories: providerCategoryIds.length > 0,
        providerCategoryIds,
      },
    });
  } catch (error) {
    console.error("Provider requests error:", error);
    return NextResponse.json(
      { success: false, error: "Klaida" },
      { status: 500 }
    );
  }
}
