import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isStoryEnabled } from "@/lib/platform-settings";

export const dynamic = "force-dynamic";

/**
 * GET — public endpoint: active stories for a provider
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // If stories are globally disabled, return empty
    if (!(await isStoryEnabled())) {
      return NextResponse.json({ success: true, data: [] });
    }

    const stories = await prisma.providerStory.findMany({
      where: {
        providerId: id,
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
