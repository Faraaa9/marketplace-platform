import { prisma } from "@/lib/prisma";
import {
  classifyDirectInquiries,
  classifyResponseThreads,
  recordFollowUpScan,
  summarizeFollowUps,
  type DirectInquiryFollowUpInput,
  type ResponseFollowUpInput,
} from "@/lib/ai/follow-up";
import ProviderFollowUpsCard, { type FollowUpItem } from "../ProviderFollowUpsCard";

/**
 * Server wrapper for the Follow-Up Agent card. Gated to active, verified
 * providers (mirrors the legacy `canAccessRequests` gate). Fetches stalled
 * response threads + direct inquiries and classifies them server-side, so the
 * scan happens during the stream rather than after hydration. Read-only — never
 * sends messages or spends credits.
 */
export async function FollowUpsCard({ userId }: { userId: string }) {
  const [user, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    }),
    prisma.providerProfile.findUnique({
      where: { userId },
      select: { isActive: true },
    }),
  ]);

  const canAccess = !!user?.emailVerified && (profile?.isActive ?? false);
  if (!canAccess) return null;

  const startedAt = Date.now();
  const lookback = new Date();
  lookback.setDate(lookback.getDate() - 30);

  const [responses, inquiries] = await Promise.all([
    prisma.response.findMany({
      where: { providerId: userId, createdAt: { gte: lookback } },
      select: {
        id: true,
        providerId: true,
        createdAt: true,
        lastMessageAt: true,
        request: { select: { id: true, status: true, title: true } },
        messages: {
          select: { senderId: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 200,
    }),
    prisma.directInquiry.findMany({
      where: {
        providerId: userId,
        moderationStatus: "APPROVED",
        createdAt: { gte: lookback },
      },
      select: {
        id: true,
        providerId: true,
        status: true,
        createdAt: true,
        lastMessageAt: true,
        senderUserId: true,
        messages: {
          select: { senderId: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 200,
    }),
  ]);

  const responseInputs: ResponseFollowUpInput[] = responses.map((r) => ({
    id: r.id,
    providerId: r.providerId,
    requestId: r.request.id,
    requestStatus: r.request.status,
    requestTitle: r.request.title,
    createdAt: r.createdAt,
    lastMessageAt: r.lastMessageAt,
    lastMessageSenderId: r.messages[0]?.senderId ?? r.providerId,
  }));

  const inquiryInputs: DirectInquiryFollowUpInput[] = inquiries.map((q) => ({
    id: q.id,
    providerId: q.providerId,
    status: q.status,
    createdAt: q.createdAt,
    lastMessageAt: q.lastMessageAt,
    senderUserId: q.senderUserId,
    lastMessageSenderId: q.messages[0]?.senderId ?? q.senderUserId,
  }));

  const threadFollowUps = [
    ...classifyResponseThreads(responseInputs),
    ...classifyDirectInquiries(inquiryInputs),
  ];
  const result = summarizeFollowUps(threadFollowUps, []);

  await recordFollowUpScan({
    scope: "provider",
    actorUserId: userId,
    result,
    startedAt,
  });

  const threads: FollowUpItem[] = result.threads
    .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity)
    .slice(0, 25)
    .map((thread) => ({
      type: thread.type,
      id: thread.id,
      // Response and direct inquiry follow-ups open in the unified inbox.
      href:
        thread.type === "response" && thread.requestId
          ? `/tiekejas/zinutes?thread=response-${thread.id}`
          : `/tiekejas/zinutes?thread=${thread.id}`,
      title: thread.title,
      ageDays: thread.ageDays,
      daysSinceActivity: thread.daysSinceActivity,
      recipient: thread.suggestion.recipient,
      actionLabel: thread.suggestion.actionLabel,
      reason: thread.suggestion.reason,
      bucket: thread.suggestion.bucket,
    }));

  return <ProviderFollowUpsCard threads={threads} total={result.totalThreads} />;
}
