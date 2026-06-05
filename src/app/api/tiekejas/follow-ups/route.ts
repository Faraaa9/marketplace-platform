import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveProvider } from "@/lib/provider-guard";
import {
  classifyDirectInquiries,
  classifyResponseThreads,
  recordFollowUpScan,
  summarizeFollowUps,
  type DirectInquiryFollowUpInput,
  type ResponseFollowUpInput,
} from "@/lib/ai/follow-up";
import { isAiTouchpointEnabled } from "@/lib/ai/prompt-config";

/**
 * Read-only Follow-Up Agent for the active provider. Returns advisory
 * suggestions for stalled response threads and unanswered direct inquiries.
 * Never sends messages, never spends credits — strictly a render hint.
 */
export async function GET() {
  await connection();
  const guard = await requireActiveProvider();
  if (!guard.authorized) return guard.response;
  if (!(await isAiTouchpointEnabled("follow_up_scan"))) {
    return NextResponse.json({
      success: true,
      data: {
        threads: [],
        totals: {
          totalThreads: 0,
          countsByBucket: {
            client_waiting: 0,
            provider_waiting: 0,
            stale_open: 0,
            stale_won: 0,
          },
        },
        disabled: true,
      },
    });
  }

  const startedAt = Date.now();

  try {
    const lookback = new Date();
    lookback.setDate(lookback.getDate() - 30);

    const [responses, inquiries] = await Promise.all([
      prisma.response.findMany({
        where: {
          providerId: guard.userId,
          createdAt: { gte: lookback },
        },
        select: {
          id: true,
          providerId: true,
          createdAt: true,
          lastMessageAt: true,
          request: {
            select: { id: true, status: true, title: true },
          },
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
          providerId: guard.userId,
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
      // requestId is also used downstream to build the provider-facing URL
      // /tiekejas/uzklausos/{requestId} — never link to /tiekejas/zinutes/{id}
      // here, since that route is reserved for DirectInquiry IDs.
      requestId: r.request.id,
      requestStatus: r.request.status,
      requestTitle: r.request.title,
      createdAt: r.createdAt,
      lastMessageAt: r.lastMessageAt,
      // No chat messages yet → treat the offer itself as "from provider".
      lastMessageSenderId: r.messages[0]?.senderId ?? r.providerId,
    }));

    const inquiryInputs: DirectInquiryFollowUpInput[] = inquiries.map((q) => ({
      id: q.id,
      providerId: q.providerId,
      status: q.status,
      createdAt: q.createdAt,
      lastMessageAt: q.lastMessageAt,
      senderUserId: q.senderUserId,
      // No chat messages yet → opening inquiry counts as "from client".
      lastMessageSenderId: q.messages[0]?.senderId ?? q.senderUserId,
    }));

    const threadFollowUps = [
      ...classifyResponseThreads(responseInputs),
      ...classifyDirectInquiries(inquiryInputs),
    ];
    const result = summarizeFollowUps(threadFollowUps, []);

    await recordFollowUpScan({
      scope: "provider",
      actorUserId: guard.userId,
      result,
      startedAt,
    });

    const threads = result.threads
      .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity)
      .slice(0, 25)
      .map((thread) => {
        // Response and direct inquiry follow-ups open in the unified inbox.
        const href =
          thread.type === "response" && thread.requestId
            ? `/tiekejas/zinutes?thread=response-${thread.id}`
            : `/tiekejas/zinutes?thread=${thread.id}`;
        return {
          type: thread.type,
          id: thread.id,
          href,
          title: thread.title,
          ageDays: thread.ageDays,
          daysSinceActivity: thread.daysSinceActivity,
          recipient: thread.suggestion.recipient,
          actionLabel: thread.suggestion.actionLabel,
          reason: thread.suggestion.reason,
          bucket: thread.suggestion.bucket,
        };
      });

    return NextResponse.json({
      success: true,
      data: {
        threads,
        totals: {
          totalThreads: result.totalThreads,
          countsByBucket: result.countsByBucket,
        },
      },
    });
  } catch (error) {
    console.error("Follow-up agent (provider) klaida:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko paruošti priminimų" },
      { status: 500 },
    );
  }
}
