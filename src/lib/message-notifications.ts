import { prisma } from "@/lib/prisma";

/**
 * Create a "new message" notification for a conversation participant.
 *
 * Works for both request threads and direct-inquiry threads — `contextLabel`
 * is whatever names the conversation (a request title, or the other person).
 *
 * Skips creation when an unread NEW_MESSAGE notification for the same thread
 * already exists, so a burst of messages does not flood the bell. Best-effort:
 * swallows its own errors so a notification failure never blocks a message send.
 */
export async function createMessageNotification(params: {
  userId: string;
  link: string;
  contextLabel: string;
}): Promise<void> {
  const { userId, link, contextLabel } = params;
  try {
    const existing = await prisma.notification.findFirst({
      where: { userId, type: "NEW_MESSAGE", link, isRead: false },
      select: { id: true },
    });
    if (existing) return;

    await prisma.notification.create({
      data: {
        userId,
        type: "NEW_MESSAGE",
        title: "Nauja žinutė",
        body: `Pokalbyje „${contextLabel}"`,
        link,
      },
    });
  } catch (error) {
    console.error("Message notification error:", error);
  }
}
