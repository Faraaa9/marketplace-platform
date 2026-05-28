import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStoryEnabled } from "@/lib/platform-settings";
import { isCuid } from "@/lib/slug";


/**
 * GET — public endpoint: active stories for a provider.
 * Accepts either slug or legacy cuid in the `[slug]` segment.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  await connection();
  try {
    const { slug } = await params;

    // If stories are globally disabled, return empty
    if (!(await isStoryEnabled())) {
      return NextResponse.json({ success: true, data: [] });
    }

    let providerId: string | null = null;

    const bySlug = await prisma.providerProfile.findUnique({
      where: { slug },
      select: { userId: true },
    });
    if (bySlug) {
      providerId = bySlug.userId;
    } else if (isCuid(slug)) {
      providerId = slug;
    }

    if (!providerId) {
      return NextResponse.json({ success: true, data: [] });
    }

    const stories = await prisma.providerStory.findMany({
      where: {
        providerId,
        moderationStatus: "APPROVED",
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        imageUrl: true,
        text: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: stories });
  } catch (error) {
    console.error("Public stories error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
