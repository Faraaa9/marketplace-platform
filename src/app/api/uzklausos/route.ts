import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { expandToMatchSet } from "@/lib/category-matching";
import { resolveCategoryParam } from "@/lib/service-categories";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const category = searchParams.get("category") || "";
    const location = searchParams.get("location") || "";
    const budget = searchParams.get("budget") || "";
    const search = searchParams.get("search") || "";
    const perPage = 20;

    const where: Record<string, unknown> = { status: "OPEN", moderationStatus: "APPROVED" };
    if (category) {
      // `?category=<slug>` — resolve a curated slug or a legacy code (via
      // CategoryAlias). A root slug expands to its children so the board
      // shows the whole branch; an unknown value yields an empty result.
      const categoryId = await resolveCategoryParam(category);
      where.categoryId = {
        in: categoryId ? await expandToMatchSet([categoryId]) : ([] as string[]),
      };
    }
    if (location) where.location = location;
    if (budget) where.budget = budget;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [requests, total] = await Promise.all([
      prisma.serviceRequest.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          categoryRef: { select: { name: true } },
          location: true,
          budget: true,
          createdAt: true,
          _count: { select: { responses: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.serviceRequest.count({ where }),
    ]);

    const pages = Math.ceil(total / perPage);

    // Keep the response field name `category` — now the curated category
    // display name — so existing consumers keep working.
    const serialized = requests.map(({ categoryRef, ...r }) => ({
      ...r,
      category: categoryRef?.name ?? "",
    }));

    return NextResponse.json({
      success: true,
      data: { requests: serialized, total, pages, page },
    });
  } catch (error) {
    console.error("Public requests error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko gauti užklausų" },
      { status: 500 }
    );
  }
}
