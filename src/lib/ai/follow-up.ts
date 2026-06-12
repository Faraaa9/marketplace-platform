import { recordAiRun } from "@/lib/ai/audit";

/**
 * Follow-Up Agent MVP — advisory only.
 *
 * Detects stalled conversations and unresponsive leads and proposes a safe
 * next action (always a human-driven suggestion: send a follow-up, refresh
 * the description, broaden category). Never auto-sends messages, never
 * spends credits, never marks anything unread.
 *
 * The detector is fully deterministic and runs without an LLM call, so it's
 * cheap to render in admin/provider views. We still write one AiRun row per
 * materialized scan so the admin AI health view can track usage, but no
 * private text leaves this module: only counts, IDs, and bucket labels.
 */
export const FOLLOW_UP_BUCKETS = [
  "provider_replied_client_silent",
  "client_open_no_provider_replies",
  "provider_no_reply_to_lead",
  "client_inquiry_provider_silent",
] as const;

export type FollowUpBucket = (typeof FOLLOW_UP_BUCKETS)[number];

export type FollowUpActor = "provider" | "client";

export type FollowUpSuggestion = {
  bucket: FollowUpBucket;
  /**
   * Who *should* be nudged. The agent doesn't send anything — this only tells
   * the UI whose turn it is.
   */
  recipient: FollowUpActor;
  /**
   * Short Lithuanian description of the suggested human action. Safe to render
   * directly in the UI.
   */
  actionLabel: string;
  /**
   * Why this thread is flagged. Short Lithuanian sentence. No personal data.
   */
  reason: string;
};

const ACTION_BY_BUCKET: Record<FollowUpBucket, { recipient: FollowUpActor; actionLabel: string; reason: string }> = {
  provider_replied_client_silent: {
    recipient: "client",
    actionLabel: "Priminti klientui, kad laukia pasiūlymo",
    reason: "Tiekėjas atsakė, bet klientas dar nereagavo.",
  },
  client_open_no_provider_replies: {
    recipient: "provider",
    actionLabel: "Pasiūlyti aktyviems tiekėjams pažiūrėti šią užklausą",
    reason: "Atvira užklausa be tiekėjų atsakymų.",
  },
  provider_no_reply_to_lead: {
    recipient: "provider",
    actionLabel: "Priminti tiekėjui apie laukiantį lead'ą",
    reason: "Klientas parašė papildomą žinutę, į kurią tiekėjas dar neatsakė.",
  },
  client_inquiry_provider_silent: {
    recipient: "provider",
    actionLabel: "Priminti tiekėjui apie tiesioginę žinutę",
    reason: "Kliento žinutė be tiekėjo atsakymo.",
  },
};

/**
 * Thresholds, in days. Tuned to be conservative — we only flag a thread if it
 * has clearly stalled, so the UI doesn't drown the user in nudges.
 */
export const FOLLOW_UP_THRESHOLDS = {
  providerRepliedClientSilent: 2,
  clientOpenNoProviderReplies: 3,
  providerNoReplyToLead: 1,
  clientInquiryProviderSilent: 2,
  /** Cap so we don't surface ancient threads forever. */
  maxAgeDays: 30,
} as const;

export interface ResponseFollowUpInput {
  id: string;
  providerId: string;
  requestId: string;
  requestStatus: string;
  requestTitle: string;
  createdAt: Date;
  lastMessageAt: Date;
  lastMessageSenderId: string | null;
}

export interface RequestFollowUpInput {
  id: string;
  title: string;
  status: string;
  createdAt: Date;
  responseCount: number;
}

export interface DirectInquiryFollowUpInput {
  id: string;
  providerId: string;
  status: string;
  createdAt: Date;
  lastMessageAt: Date;
  lastMessageSenderId: string | null;
  /**
   * For inbound inquiries the "client" is the inquiry sender (senderUserId or
   * null guest). For provider-initiated outgoing inquiries this is the
   * receiving provider. The detector only flags the inbound case.
   */
  senderUserId: string | null;
}

export interface FollowUpThread {
  type: "response" | "direct";
  id: string;
  /**
   * For `type === "response"` this is the parent ServiceRequest ID. The
   * provider-facing detail lives at `/tiekejas/uzklausa/{requestId}`, not
   * `/tiekejas/zinutes/{responseId}` (that route is for DirectInquiry IDs).
   * Undefined for direct inquiries — their `id` already lines up with the
   * `/tiekejas/zinutes/{id}` route.
   */
  requestId?: string;
  /** Owner provider — used to filter per-provider feeds. */
  providerId: string;
  title: string;
  ageDays: number;
  daysSinceActivity: number;
  suggestion: FollowUpSuggestion;
}

export interface FollowUpRequestSignal {
  id: string;
  title: string;
  ageDays: number;
  suggestion: FollowUpSuggestion;
}

export interface FollowUpScanResult {
  threads: FollowUpThread[];
  unansweredRequests: FollowUpRequestSignal[];
  countsByBucket: Record<FollowUpBucket, number>;
  totalThreads: number;
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function makeSuggestion(bucket: FollowUpBucket): FollowUpSuggestion {
  const base = ACTION_BY_BUCKET[bucket];
  return { bucket, ...base };
}

/**
 * Classifies Response threads (provider <-> client chat under a request).
 *
 * - provider sent the most recent message AND it sat for >= N days → client silent
 * - client sent the most recent message AND it sat for >= N days → provider silent
 */
export function classifyResponseThreads(
  threads: ResponseFollowUpInput[],
  now: Date = new Date(),
): FollowUpThread[] {
  const out: FollowUpThread[] = [];

  for (const thread of threads) {
    if (thread.requestStatus !== "OPEN") continue;

    const ageDays = daysBetween(thread.createdAt, now);
    if (ageDays > FOLLOW_UP_THRESHOLDS.maxAgeDays) continue;

    const daysSinceActivity = daysBetween(thread.lastMessageAt, now);

    // Provider sent the last thing → waiting for the client.
    if (
      thread.lastMessageSenderId === thread.providerId &&
      daysSinceActivity >= FOLLOW_UP_THRESHOLDS.providerRepliedClientSilent
    ) {
      out.push({
        type: "response",
        id: thread.id,
        requestId: thread.requestId,
        providerId: thread.providerId,
        title: thread.requestTitle,
        ageDays,
        daysSinceActivity,
        suggestion: makeSuggestion("provider_replied_client_silent"),
      });
      continue;
    }

    // Client sent the last message → waiting for the provider.
    if (
      thread.lastMessageSenderId !== null &&
      thread.lastMessageSenderId !== thread.providerId &&
      daysSinceActivity >= FOLLOW_UP_THRESHOLDS.providerNoReplyToLead
    ) {
      out.push({
        type: "response",
        id: thread.id,
        requestId: thread.requestId,
        providerId: thread.providerId,
        title: thread.requestTitle,
        ageDays,
        daysSinceActivity,
        suggestion: makeSuggestion("provider_no_reply_to_lead"),
      });
    }
  }

  return out;
}

/**
 * Classifies open ServiceRequest entries that have collected zero responses
 * after a quiet window. Used for admin signals and the per-client view.
 */
export function classifyUnansweredRequests(
  requests: RequestFollowUpInput[],
  now: Date = new Date(),
): FollowUpRequestSignal[] {
  const out: FollowUpRequestSignal[] = [];

  for (const request of requests) {
    if (request.status !== "OPEN") continue;
    if (request.responseCount > 0) continue;

    const ageDays = daysBetween(request.createdAt, now);
    if (ageDays < FOLLOW_UP_THRESHOLDS.clientOpenNoProviderReplies) continue;
    if (ageDays > FOLLOW_UP_THRESHOLDS.maxAgeDays) continue;

    out.push({
      id: request.id,
      title: request.title,
      ageDays,
      suggestion: makeSuggestion("client_open_no_provider_replies"),
    });
  }

  return out;
}

/**
 * Classifies inbound DirectInquiry threads where the client wrote but the
 * provider hasn't answered yet.
 */
export function classifyDirectInquiries(
  inquiries: DirectInquiryFollowUpInput[],
  now: Date = new Date(),
): FollowUpThread[] {
  const out: FollowUpThread[] = [];

  for (const inquiry of inquiries) {
    if (inquiry.status === "ARCHIVED") continue;

    const ageDays = daysBetween(inquiry.createdAt, now);
    if (ageDays > FOLLOW_UP_THRESHOLDS.maxAgeDays) continue;

    const daysSinceActivity = daysBetween(inquiry.lastMessageAt, now);

    // Last message is from the client (or there are no chat replies yet) and
    // the inquiry has been sitting quietly past the threshold.
    const lastFromProvider = inquiry.lastMessageSenderId === inquiry.providerId;
    if (lastFromProvider) continue;

    if (daysSinceActivity < FOLLOW_UP_THRESHOLDS.clientInquiryProviderSilent) continue;

    out.push({
      type: "direct",
      id: inquiry.id,
      providerId: inquiry.providerId,
      // Title is intentionally generic — we don't pull the inquiry body so
      // private text doesn't leak through this advisory feed.
      title: "Žinutė",
      ageDays,
      daysSinceActivity,
      suggestion: makeSuggestion("client_inquiry_provider_silent"),
    });
  }

  return out;
}

function emptyCounts(): Record<FollowUpBucket, number> {
  return {
    provider_replied_client_silent: 0,
    client_open_no_provider_replies: 0,
    provider_no_reply_to_lead: 0,
    client_inquiry_provider_silent: 0,
  };
}

export function summarizeFollowUps(
  threads: FollowUpThread[],
  unansweredRequests: FollowUpRequestSignal[],
): FollowUpScanResult {
  const countsByBucket = emptyCounts();
  for (const thread of threads) {
    countsByBucket[thread.suggestion.bucket] += 1;
  }
  for (const request of unansweredRequests) {
    countsByBucket[request.suggestion.bucket] += 1;
  }
  return {
    threads,
    unansweredRequests,
    countsByBucket,
    totalThreads: threads.length + unansweredRequests.length,
  };
}

export interface RecordFollowUpScanInput {
  scope: "admin" | "provider";
  actorUserId?: string;
  result: FollowUpScanResult;
  startedAt: number;
}

/**
 * Records one AiRun entry for an admin/provider follow-up scan. Metadata is
 * scoped to counts only — never thread IDs, titles, or message text.
 */
export async function recordFollowUpScan(input: RecordFollowUpScanInput): Promise<void> {
  await recordAiRun({
    feature: "follow_up_scan",
    status: "success",
    provider: "internal",
    promptVersion: "follow-up-detector-v1",
    latencyMs: Date.now() - input.startedAt,
    actorUserId: input.actorUserId,
    entityType: input.scope === "admin" ? "AdminScan" : "ProviderScan",
    metadata: {
      scope: input.scope,
      totalThreads: input.result.totalThreads,
      ...input.result.countsByBucket,
    },
  });
}
