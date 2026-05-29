import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveViewerIdentity } from "@/lib/stories/identity";
import { isValidReaction } from "@/lib/stories/reactions";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";

/**
 * POST /api/stories/[id]/reaction — set or change the current viewer's reaction.
 * Body: { emoji }. One reaction per viewer per story (re-tapping replaces it).
 * The provider is notified on a logged-in viewer's first reaction, throttled to
 * one notification per reactor per hour so changing the emoji doesn't spam.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await connection();
  try {
    const { id } = await params;

    const ip = getClientIp(req);
    const rl = await rateLimitAsync(`story:react:${ip}`, {
      maxRequests: 30,
      windowMs: 60 * 1000,
    });
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Per daug reakcijų. Pabandykite vėliau." },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const emoji = typeof body?.emoji === "string" ? body.emoji : "";
    if (!isValidReaction(emoji)) {
      return NextResponse.json(
        { success: false, error: "Netinkama reakcija" },
        { status: 400 },
      );
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

    // Reacting to your own story is meaningless — ignore quietly.
    if (viewerId && viewerId === story.providerId) {
      return NextResponse.json({ success: true, own: true });
    }

    const existing = await prisma.storyReaction.findUnique({
      where: { storyId_dedupeKey: { storyId: id, dedupeKey } },
      select: { id: true },
    });

    await prisma.storyReaction.upsert({
      where: { storyId_dedupeKey: { storyId: id, dedupeKey } },
      create: { storyId: id, viewerId, dedupeKey, emoji },
      update: { emoji },
    });

    // Notify the provider — only for named (logged-in) reactors, only on the
    // first reaction, throttled so emoji-swapping doesn't generate noise.
    if (viewerId && !existing) {
      const notifyRl = await rateLimitAsync(
        `story:react:notify:${story.providerId}:${viewerId}`,
        { maxRequests: 1, windowMs: 60 * 60 * 1000 },
      );
      if (notifyRl.success) {
        const reactor = await prisma.user.findUnique({
          where: { id: viewerId },
          select: { name: true },
        });
        await prisma.notification.create({
          data: {
            userId: story.providerId,
            type: "STORY_REACTION",
            title: "Nauja reakcija į story",
            body: `${reactor?.name?.trim() || "Kažkas"} sureagavo ${emoji} į jūsų story`,
            link: "/tiekejas",
          },
        });
      }
    }

    return NextResponse.json({ success: true, emoji });
  } catch (error) {
    console.error("Story reaction error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

/**
 * DELETE /api/stories/[id]/reaction — remove the current viewer's reaction.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await connection();
  try {
    const { id } = await params;
    const { dedupeKey } = await resolveViewerIdentity({ createAnon: false });
    if (!dedupeKey) return NextResponse.json({ success: true });

    await prisma.storyReaction.deleteMany({
      where: { storyId: id, dedupeKey },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Story reaction delete error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
