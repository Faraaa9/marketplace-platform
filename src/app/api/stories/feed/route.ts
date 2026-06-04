import { NextResponse, connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { resolveViewerIdentity } from "@/lib/stories/identity";

async function getActiveStoriesForFeed() {
  "use cache";
  cacheLife({ revalidate: 60 });
  cacheTag("stories");

  return prisma.providerStory.findMany({
    where: {
      moderationStatus: "APPROVED",
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      imageUrl: true,
      text: true,
      expiresAt: true,
      createdAt: true,
      providerId: true,
      provider: {
        select: {
          id: true,
          name: true,
          image: true,
          providerProfile: {
            select: { slug: true, isActive: true },
          },
        },
      },
    },
    take: 200,
  });
}

/**
 * GET /api/stories/feed
 *
 * Returns all active (non-expired, approved) stories grouped by provider.
 * Used by the header strip to show all providers with current stories.
 */
export async function GET() {
  await connection();
  try {
    const stories = await getActiveStoriesForFeed();

    // Which of these stories has the current viewer already seen? Read-only:
    // a brand-new visitor (no cookie yet) has simply seen nothing.
    const { dedupeKey } = await resolveViewerIdentity({ createAnon: false });
    const seenIds = new Set<string>();
    if (dedupeKey && stories.length > 0) {
      const seen = await prisma.storyView.findMany({
        where: { dedupeKey, storyId: { in: stories.map((s) => s.id) } },
        select: { storyId: true },
      });
      for (const v of seen) seenIds.add(v.storyId);
    }

    // Group by provider
    const byProvider = new Map<
      string,
      {
        providerId: string;
        providerName: string;
        providerImage: string | null;
        providerSlug: string;
        latestCreatedAt: string;
        stories: Array<{
          id: string;
          imageUrl: string;
          text: string | null;
          expiresAt: string;
          createdAt: string;
        }>;
      }
    >();

    for (const s of stories) {
      if (!s.provider?.providerProfile?.isActive) continue;
      const slug = s.provider.providerProfile.slug;
      if (!slug) continue;

      const existing = byProvider.get(s.providerId);
      if (existing) {
        existing.stories.push({
          id: s.id,
          imageUrl: s.imageUrl,
          text: s.text,
          expiresAt: s.expiresAt.toISOString(),
          createdAt: s.createdAt.toISOString(),
        });
      } else {
        byProvider.set(s.providerId, {
          providerId: s.providerId,
          providerName: s.provider.name || "Tiekėjas",
          providerImage: s.provider.image,
          providerSlug: slug,
          latestCreatedAt: s.createdAt.toISOString(),
          stories: [
            {
              id: s.id,
              imageUrl: s.imageUrl,
              text: s.text,
              expiresAt: s.expiresAt.toISOString(),
              createdAt: s.createdAt.toISOString(),
            },
          ],
        });
      }
    }

    // Reverse stories so oldest-first within each provider (natural reading order)
    const data = Array.from(byProvider.values())
      .map((p) => ({
        ...p,
        stories: [...p.stories].reverse(),
        seen: p.stories.every((s) => seenIds.has(s.id)),
      }))
      .sort((a, b) => b.latestCreatedAt.localeCompare(a.latestCreatedAt));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Stories feed error:", error);
    return NextResponse.json(
      { success: false, error: "Klaida" },
      { status: 500 }
    );
  }
}
