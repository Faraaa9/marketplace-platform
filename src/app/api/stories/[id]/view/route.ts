import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveViewerIdentity } from "@/lib/stories/identity";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";

/**
 * POST /api/stories/[id]/view — record that the current viewer saw this story.
 * Idempotent per viewer (first view time is kept). The provider's own views
 * are not counted so their stats stay meaningful.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await connection();
  try {
    const { id } = await params;

    const ip = getClientIp(req);
    const rl = await rateLimitAsync(`story:view:${ip}`, {
      maxRequests: 120,
      windowMs: 60 * 1000,
    });
    if (!rl.success) {
      return NextResponse.json({ success: false }, { status: 429 });
    }

    const story = await prisma.providerStory.findFirst({
      where: { id, moderationStatus: "APPROVED", expiresAt: { gt: new Date() } },
      select: { id: true, providerId: true },
    });
    if (!story) {
      return NextResponse.json(
        { success: false, error: "Story nerasta" },
        { status: 404 },
      );
    }

    const { viewerId, dedupeKey } = await resolveViewerIdentity({ createAnon: true });
    if (!dedupeKey) return NextResponse.json({ success: true });

    // Don't count the provider viewing their own story.
    if (viewerId && viewerId === story.providerId) {
      return NextResponse.json({ success: true, own: true });
    }

    const [, reaction] = await Promise.all([
      prisma.storyView.upsert({
        where: { storyId_dedupeKey: { storyId: id, dedupeKey } },
        create: { storyId: id, viewerId, dedupeKey },
        update: {},
      }),
      prisma.storyReaction.findUnique({
        where: { storyId_dedupeKey: { storyId: id, dedupeKey } },
        select: { emoji: true },
      }),
    ]);

    return NextResponse.json({ success: true, myReaction: reaction?.emoji ?? null });
  } catch (error) {
    console.error("Story view error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
