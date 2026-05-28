import { prisma } from "@/lib/prisma";

/**
 * Unread-conversation count for the Messages quick-link. Its own small Suspense
 * boundary so the (relatively heavy) inbox scan never blocks the nav grid.
 * Mirrors the unread rule in /api/tiekejas/zinutes: a thread is unread when its
 * last activity is newer than the viewer's last-read time; archived threads
 * are excluded.
 */
export async function InboxUnreadBadge({ userId }: { userId: string }) {
  const [responses, inquiries] = await Promise.all([
    prisma.response.findMany({
      where: { providerId: userId },
      select: { lastMessageAt: true, providerLastReadAt: true },
    }),
    prisma.directInquiry.findMany({
      where: {
        OR: [{ providerId: userId }, { senderUserId: userId }],
        moderationStatus: "APPROVED",
      },
      select: {
        providerId: true,
        status: true,
        lastMessageAt: true,
        providerLastReadAt: true,
        clientLastReadAt: true,
      },
    }),
  ]);

  let totalUnread = 0;
  for (const r of responses) {
    if (r.lastMessageAt > r.providerLastReadAt) totalUnread++;
  }
  for (const q of inquiries) {
    if (q.status === "ARCHIVED") continue;
    const viewerIsProvider = q.providerId === userId;
    const lastReadAt = viewerIsProvider ? q.providerLastReadAt : q.clientLastReadAt;
    const unread = lastReadAt ? q.lastMessageAt > lastReadAt : !viewerIsProvider;
    if (unread) totalUnread++;
  }

  if (totalUnread === 0) return null;

  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-micro font-bold text-white">
      {totalUnread}
    </span>
  );
}
