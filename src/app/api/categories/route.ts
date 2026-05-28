import { NextRequest, NextResponse } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import * as categoryService from "@/lib/imported/category-service";

const CACHE_TTL = 3600;

async function getStatsCached() {
  "use cache";
  cacheLife({ revalidate: CACHE_TTL });
  cacheTag("categories");
  return categoryService.getStats();
}

async function getBySlugCached(slug: string) {
  "use cache";
  cacheLife({ revalidate: CACHE_TTL });
  cacheTag("categories");
  return categoryService.getBySlug(slug);
}

async function getChildrenCached(slug: string) {
  "use cache";
  cacheLife({ revalidate: CACHE_TTL });
  cacheTag("categories");
  return categoryService.getChildren(slug);
}

async function getSubtreeCached(slug: string) {
  "use cache";
  cacheLife({ revalidate: CACHE_TTL });
  cacheTag("categories");
  return categoryService.getSubtree(slug);
}

async function getRootsCached() {
  "use cache";
  cacheLife({ revalidate: CACHE_TTL });
  cacheTag("categories");
  return categoryService.getRoots();
}

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
      const stats = await getStatsCached();
      return NextResponse.json({ success: true, data: stats });
    }

    const slug = searchParams.get("slug");
    if (slug) {
      const result = await getBySlugCached(slug);
      if (!result) {
        return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: result });
    }

    const childrenSlug = searchParams.get("children");
    if (childrenSlug) {
      const result = await getChildrenCached(childrenSlug);
      if (!result) {
        return NextResponse.json({ success: false, error: "Parent category not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: result });
    }

    const subtreeSlug = searchParams.get("subtree");
    if (subtreeSlug) {
      const result = await getSubtreeCached(subtreeSlug);
      if (!result) {
        return NextResponse.json({ success: false, error: "Category not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: result });
    }

    // Default: return roots
    const roots = await getRootsCached();
    return NextResponse.json({ success: true, data: roots });
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
