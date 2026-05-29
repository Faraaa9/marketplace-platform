import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveViewerIdentity } from "@/lib/stories/identity";

/**
 * POST /api/stories/seen-state — body { storyIds: string[] }.
 * Returns which of those stories the current viewer has already seen. Used by
 * server-cached pages (e.g. a provider profile) where per-viewer seen-state
 * can't live in the cached render, so the ring resolves it client-side.
 */
export async function POST(req: NextRequest) {
  await connection();
  try {
    const body = await req.json().catch(() => ({}));
    const storyIds: string[] = Array.isArray(body?.storyIds)
      ? body.storyIds.filter((x: unknown) => typeof x === "string").slice(0, 100)
      : [];
    if (storyIds.length === 0) {
      return NextResponse.json({ success: true, seenIds: [] });
    }

    const { dedupeKey } = await resolveViewerIdentity({ createAnon: false });
    if (!dedupeKey) return NextResponse.json({ success: true, seenIds: [] });

    const seen = await prisma.storyView.findMany({
      where: { dedupeKey, storyId: { in: storyIds } },
      select: { storyId: true },
    });

    return NextResponse.json({ success: true, seenIds: seen.map((v) => v.storyId) });
  } catch (error) {
    console.error("Story seen-state error:", error);
    return NextResponse.json({ success: false, seenIds: [] }, { status: 500 });
  }
}
