import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STORY_REACTION_EMOJIS } from "@/lib/stories/reactions";

const MAX_NAMED = 100;

/**
 * GET /api/provider/stories/[id]/viewers — owner-only insight for one story:
 * named viewers (logged-in), anonymous view count, and a reaction breakdown.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const story = await prisma.providerStory.findUnique({
      where: { id },
      select: { providerId: true },
    });
    if (!story) {
      return NextResponse.json({ success: false, error: "Story nerasta" }, { status: 404 });
    }
    if (story.providerId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Neturite teisės" }, { status: 403 });
    }

    const [views, reactions] = await Promise.all([
      prisma.storyView.findMany({
        where: { storyId: id },
        orderBy: { createdAt: "desc" },
        select: {
          createdAt: true,
          viewer: { select: { id: true, name: true, image: true } },
        },
        take: 500,
      }),
      prisma.storyReaction.findMany({
        where: { storyId: id },
        orderBy: { createdAt: "desc" },
        select: {
          emoji: true,
          viewer: { select: { id: true, name: true, image: true } },
        },
        take: 500,
      }),
    ]);

    const viewCount = views.length;
    const named = views
      .filter((v) => v.viewer)
      .slice(0, MAX_NAMED)
      .map((v) => ({
        id: v.viewer!.id,
        name: v.viewer!.name?.trim() || "Vartotojas",
        image: v.viewer!.image,
      }));
    const anonymousCount = views.filter((v) => !v.viewer).length;

    // Reaction breakdown in the canonical emoji order.
    const counts = new Map<string, number>();
    for (const r of reactions) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
    const reactionSummary = STORY_REACTION_EMOJIS
      .map((emoji) => ({ emoji, count: counts.get(emoji) ?? 0 }))
      .filter((r) => r.count > 0);

    const namedReactors = reactions
      .filter((r) => r.viewer)
      .slice(0, MAX_NAMED)
      .map((r) => ({
        id: r.viewer!.id,
        name: r.viewer!.name?.trim() || "Vartotojas",
        image: r.viewer!.image,
        emoji: r.emoji,
      }));

    return NextResponse.json({
      success: true,
      data: {
        viewCount,
        viewers: named,
        anonymousCount,
        reactions: reactionSummary,
        reactionCount: reactions.length,
        reactors: namedReactors,
      },
    });
  } catch (error) {
    console.error("Story viewers error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
