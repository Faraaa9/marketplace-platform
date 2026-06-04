import { prisma } from "@/lib/prisma";
import { createServerTimer } from "@/lib/server-timing";

/**
 * Unread-conversation count for the Messages quick-link. Its own small Suspense
 * boundary so the (relatively heavy) inbox scan never blocks the nav grid.
 * Mirrors the unread rule in /api/tiekejas/zinutes: a thread is unread when its
 * last activity is newer than the viewer's last-read time; archived threads
 * are excluded.
 */
export async function InboxUnreadBadge({ userId }: { userId: string }) {
  const timer = createServerTimer("provider-dashboard-unread-badge");
  const [responseRows, providerInquiryRows, senderInquiryRows] = await Promise.all([
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM responses
      WHERE "providerId" = ${userId}
        AND "lastMessageAt" > "providerLastReadAt"
    `,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM direct_inquiries
      WHERE "providerId" = ${userId}
        AND "moderationStatus" = 'APPROVED'
        AND status <> 'ARCHIVED'
        AND "lastMessageAt" > "providerLastReadAt"
    `,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM direct_inquiries
      WHERE "senderUserId" = ${userId}
        AND "providerId" <> ${userId}
        AND "moderationStatus" = 'APPROVED'
        AND status <> 'ARCHIVED'
        AND ("clientLastReadAt" IS NULL OR "lastMessageAt" > "clientLastReadAt")
    `,
  ]);

  const totalUnread =
    (responseRows[0]?.count ?? 0) +
    (providerInquiryRows[0]?.count ?? 0) +
    (senderInquiryRows[0]?.count ?? 0);
  timer.end({ unread: totalUnread });

  if (totalUnread === 0) return null;

  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-micro font-bold text-white">
      {totalUnread}
    </span>
  );
}
