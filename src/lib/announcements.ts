import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

export interface AnnouncementCardData {
  id: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  icon: string;
}

/**
 * Active announcement cards for the given audience values (e.g. ["PROVIDER","ALL"]),
 * respecting the optional start/end window, ordered for display. Dismissal is
 * applied separately by the caller (cookie) so this stays cacheable-by-audience.
 */
export async function getActiveAnnouncementCards(
  audiences: string[],
): Promise<AnnouncementCardData[]> {
  // Cache Components: reading the current time requires first entering the
  // request scope. connection() defers to request time; the surfaces that use
  // this are already dynamic (Suspense), so this just makes it explicit/safe.
  await connection();
  const now = new Date();
  return prisma.announcementCard.findMany({
    where: {
      isActive: true,
      audience: { in: audiences },
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      body: true,
      ctaLabel: true,
      ctaHref: true,
      icon: true,
    },
  });
}
