import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateProviderCaches } from "@/lib/cache-invalidation";
import { syncFreeCategories } from "@/lib/provider-categories";

// Lightweight category-only update. Used by the AI onboarding confirmation step
// where the profile (text, images, moderation) is already saved and only the
// category assignment needs adjusting — so we skip the full PUT validation +
// moderation pass and just sync the free ProviderProfileCategory join rows.
// Paid (timed) categories are preserved and capped at the free limit inside
// syncFreeCategories.
export async function PATCH(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "PROVIDER") {
      return NextResponse.json(
        { success: false, error: "Neturite tiekėjo rolės", code: "NOT_PROVIDER" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    const rawIds = (body as { categoryIds?: unknown })?.categoryIds;
    if (!Array.isArray(rawIds) || rawIds.some((id) => typeof id !== "string")) {
      return NextResponse.json(
        { success: false, error: "Netinkamas kategorijų sąrašas" },
        { status: 400 },
      );
    }

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Profilis nerastas" },
        { status: 404 },
      );
    }

    const freeCategoryIds = await prisma.$transaction((tx) =>
      syncFreeCategories(tx, profile.id, rawIds as string[]),
    );

    revalidateProviderCaches(session.user.id);

    return NextResponse.json({ success: true, categoryIds: freeCategoryIds });
  } catch (error) {
    console.error("Provider category update error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko atnaujinti kategorijų" },
      { status: 500 },
    );
  }
}
