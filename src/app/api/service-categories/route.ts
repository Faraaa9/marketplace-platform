import { NextResponse, connection } from "next/server";
import { getServiceCategoryGroups } from "@/lib/service-categories";


/**
 * Public — the curated service taxonomy (9 roots, each with its depth-1
 * categories) for category pickers in the request flow.
 */
export async function GET() {
  await connection();
  try {
    const groups = await getServiceCategoryGroups();
    return NextResponse.json({ success: true, data: groups });
  } catch (error) {
    console.error("Service categories error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
