import { NextRequest, NextResponse } from "next/server";
import * as supplierService from "@/lib/imported/supplier-service";

export const dynamic = "force-dynamic";

/**
 * GET /api/suppliers — imported supplier records (from paslaugos-crawler).
 *
 * Query params:
 *   ?slug=xyz         — single supplier by slug
 *   ?category=xyz     — filter by category slug
 *   ?city=Vilnius     — filter by city
 *   ?limit=50         — page size (max 200)
 *   ?offset=0         — pagination offset
 *   ?stats=1          — get supplier stats
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    if (searchParams.get("stats") === "1") {
      const stats = await supplierService.getStats();
      return NextResponse.json({ success: true, data: stats });
    }

    const slug = searchParams.get("slug");
    if (slug) {
      const supplier = await supplierService.getBySlug(slug);
      if (!supplier) {
        return NextResponse.json({ success: false, error: "Supplier not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: supplier });
    }

    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0") || 0;
    const city = searchParams.get("city") || undefined;
    const categorySlug = searchParams.get("category") || undefined;

    const result = await supplierService.list({ limit, offset, city, categorySlug });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("GET /api/suppliers error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
