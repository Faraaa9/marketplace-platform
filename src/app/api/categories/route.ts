import { NextRequest, NextResponse } from "next/server";
import * as categoryService from "@/lib/imported/category-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/categories — list root categories or query by slug.
 *
 * Query params:
 *   ?roots=1        — get all root categories
 *   ?slug=xyz       — get single category by slug (with alias resolution)
 *   ?children=xyz   — get children of category with slug xyz
 *   ?subtree=xyz    — get full subtree of category with slug xyz
 *   ?stats=1        — get category stats
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    if (searchParams.get("stats") === "1") {
      const stats = await categoryService.getStats();
      return NextResponse.json({ success: true, data: stats });
    }

    const slug = searchParams.get("slug");
    if (slug) {
      const result = await categoryService.getBySlug(slug);
      if (!result) {
        return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: result });
    }

    const childrenSlug = searchParams.get("children");
    if (childrenSlug) {
      const result = await categoryService.getChildren(childrenSlug);
      if (!result) {
        return NextResponse.json({ success: false, error: "Parent category not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: result });
    }

    const subtreeSlug = searchParams.get("subtree");
    if (subtreeSlug) {
      const result = await categoryService.getSubtree(subtreeSlug);
      if (!result) {
        return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: result });
    }

    // Default: return roots
    const roots = await categoryService.getRoots();
    return NextResponse.json({ success: true, data: roots });
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
