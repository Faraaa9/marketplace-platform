import { prisma } from "@/lib/prisma";
import {
  classifyDirectInquiries,
  classifyResponseThreads,
  classifyUnansweredRequests,
  recordFollowUpScan,
  summarizeFollowUps,
  type DirectInquiryFollowUpInput,
  type FollowUpBucket,
  type RequestFollowUpInput,
  type ResponseFollowUpInput,
} from "@/lib/ai/follow-up";

export type FollowUpAdminSignal = {
  totalThreads: number;
  countsByBucket: Record<FollowUpBucket, number>;
  stalledLeads: Array<{
    type: "response" | "direct";
    id: string;
    title: string;
    daysSinceActivity: number;
    bucket: FollowUpBucket;
  }>;
  unansweredRequests: Array<{
    id: string;
    title: string;
    ageDays: number;
  }>;
  recommendations: string[];
};

const EMPTY: FollowUpAdminSignal = {
  totalThreads: 0,
  countsByBucket: {
    provider_replied_client_silent: 0,
    client_open_no_provider_replies: 0,
    provider_no_reply_to_lead: 0,
    client_inquiry_provider_silent: 0,
  },
  stalledLeads: [],
  unansweredRequests: [],
  recommendations: [],
};

/**
 * Admin-side Follow-Up Agent signal — aggregates the deterministic detector
 * counts across all providers and surfaces the top stalled threads + a few
 * recommendation strings. Audit happens through `recordFollowUpScan`, which
 * records counts only.
 */
export async function getFollowUpAdminSignal(
  since: Date,
): Promise<FollowUpAdminSignal> {
  const startedAt = Date.now();
  try {
    const [responses, inquiries, openRequests] = await Promise.all([
      prisma.response.findMany({
        where: { createdAt: { gte: since } },
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
        take: 1500,
      }),
      prisma.directInquiry.findMany({
        where: {
          createdAt: { gte: since },
          moderationStatus: "APPROVED",
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
        take: 1500,
      }),
      prisma.serviceRequest.findMany({
        where: {
          createdAt: { gte: since },
          moderationStatus: "APPROVED",
        },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          _count: { select: { responses: true } },
        },
        take: 1500,
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

    const requestInputs: RequestFollowUpInput[] = openRequests.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      createdAt: r.createdAt,
      responseCount: r._count.responses,
    }));

    const threadFollowUps = [
      ...classifyResponseThreads(responseInputs),
      ...classifyDirectInquiries(inquiryInputs),
    ];
    const unansweredRequests = classifyUnansweredRequests(requestInputs);
    const result = summarizeFollowUps(threadFollowUps, unansweredRequests);

    await recordFollowUpScan({
      scope: "admin",
      result,
      startedAt,
    });

    const recommendations: string[] = [];
    if (result.countsByBucket.client_open_no_provider_replies > 0) {
      recommendations.push(
        `${result.countsByBucket.client_open_no_provider_replies} užklausos be atsakymų — peržiūrėti tinkamus tiekėjus.`,
      );
    }
    if (result.countsByBucket.provider_no_reply_to_lead > 0) {
      recommendations.push(
        `${result.countsByBucket.provider_no_reply_to_lead} pokalbiai laukia tiekėjo atsakymo — verta priminti.`,
      );
    }
    if (result.countsByBucket.provider_replied_client_silent > 0) {
      recommendations.push(
        `${result.countsByBucket.provider_replied_client_silent} klientai dar nereagavo į tiekėjo pasiūlymą.`,
      );
    }
    if (result.countsByBucket.client_inquiry_provider_silent > 0) {
      recommendations.push(
        `${result.countsByBucket.client_inquiry_provider_silent} tiesioginės žinutės laukia tiekėjo atsakymo.`,
      );
    }
    if (recommendations.length === 0) {
      recommendations.push("Aktyvūs pokalbiai juda be didelių pauzių.");
    }

    const stalledLeads = result.threads
      .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity)
      .slice(0, 5)
      .map((thread) => ({
        type: thread.type,
        id: thread.id,
        title: thread.title,
        daysSinceActivity: thread.daysSinceActivity,
        bucket: thread.suggestion.bucket,
      }));

    const unansweredOut = result.unansweredRequests.slice(0, 5).map((request) => ({
      id: request.id,
      title: request.title,
      ageDays: request.ageDays,
    }));

    return {
      totalThreads: result.totalThreads,
      countsByBucket: result.countsByBucket,
      stalledLeads,
      unansweredRequests: unansweredOut,
      recommendations,
    };
  } catch (error) {
    console.error("Admin follow-up signal error:", error);
    return EMPTY;
  }
}
