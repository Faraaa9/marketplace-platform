import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canManageSupplier } from "@/lib/imported/supplier-access";
import { supplierEditSchema, updateSupplierFields } from "@/lib/imported/supplier-update";
import * as supplierService from "@/lib/imported/supplier-service";

const getSupplierBySlugCached = unstable_cache(
  async (slug: string) => supplierService.getBySlug(slug),
  ["supplier-detail-by-slug"],
  { revalidate: 300, tags: ["suppliers"] }
);

/**
 * GET /api/suppliers/[slug] — get supplier by slug (public).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const supplier = await getSupplierBySlugCached(slug);
    if (!supplier) {
      return NextResponse.json({ success: false, error: "Supplier not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: supplier });
  } catch (error) {
    console.error("GET /api/suppliers/[slug] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/suppliers/[slug] — update supplier (owner/manager only).
 * Server-side access control: checks SupplierIdentity ownership.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;

    // Access control: must be owner/manager
    const canManage = await canManageSupplier(session.user.id, slug);
    if (!canManage) {
      return NextResponse.json({ success: false, error: "Neturite teises redaguoti sio profilio" }, { status: 403 });
    }

    // Resolve the imported provider profile by slug (unified ProviderProfile).
    const supplier = await supplierService.getBySlug(slug);
    if (!supplier) {
      return NextResponse.json({ success: false, error: "Tiekejas nerastas" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = supplierEditSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updated = await updateSupplierFields(supplier.id, parsed.data);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PUT /api/suppliers/[slug] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
