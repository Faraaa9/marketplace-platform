import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sanitizeHtml } from "@/lib/sanitize";
import { createMessageNotification } from "@/lib/message-notifications";
import { sendEmail } from "@/lib/email";
import {
  findReplyTarget,
  stripQuotedReply,
  htmlToText,
  type ReplyTarget,
} from "@/lib/inbound-email";

/** A received email, normalised from the Resend inbound webhook + Received Emails API. */
export interface InboundEmailInput {
  resendEmailId: string;
  messageId: string | null;
  from: string;
  to: string[];
  subject: string | null;
  text: string | null;
  html: string | null;
  headers: Record<string, string> | null;
}

/** Mirrors messageSchema.content.max — keeps inbound replies sized like UI messages. */
const MAX_MESSAGE_LENGTH = 1000;
const MAX_STORED_BODY = 100_000;

type RouteResult = { status: "ROUTED" | "INBOX"; messageId: string | null };

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Detects auto-replies, bounces and list mail so they never post into a thread. */
function isAutomatedEmail(headers: Record<string, string> | null): boolean {
  if (!headers) return false;
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    lower[k.toLowerCase()] = String(v).toLowerCase();
  }
  const autoSubmitted = lower["auto-submitted"];
  if (autoSubmitted && autoSubmitted !== "no") return true;
  const precedence = lower["precedence"];
  if (precedence && ["bulk", "auto_reply", "junk", "list"].includes(precedence)) {
    return true;
  }
  if (lower["x-autoreply"] || lower["x-autorespond"] || lower["list-id"]) return true;
  return false;
}

/**
 * Process one received email: persist it, and either post it into the matching
 * conversation thread (when the recipient carries a valid reply token) or
 * forward it to the support address.
 *
 * Idempotent — Resend retries webhooks, and the unique resendEmailId means a
 * repeat delivery is a no-op.
 */
export async function routeInboundEmail(input: InboundEmailInput): Promise<void> {
  let record: { id: string };
  try {
    record = await prisma.inboundEmail.create({
      data: {
        resendEmailId: input.resendEmailId,
        messageId: input.messageId,
        fromAddress: input.from.slice(0, 320),
        toAddress: (input.to[0] ?? "").slice(0, 320),
        subject: input.subject?.slice(0, 500) ?? null,
        textBody: input.text?.slice(0, MAX_STORED_BODY) ?? null,
        htmlBody: input.html?.slice(0, MAX_STORED_BODY) ?? null,
      },
      select: { id: true },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      console.log(`[inbound] duplicate webhook for ${input.resendEmailId} — skipped`);
      return;
    }
    throw error; // claim failed — let the webhook return 500 so Resend retries
  }

  // Post-claim work is best-effort: the email is already safely persisted, so a
  // failure here degrades to "visible in the admin inbox" rather than lost mail.
  try {
    // Auto-replies / bounces / list mail: keep as an inbox record, never route.
    if (isAutomatedEmail(input.headers)) {
      console.log(`[inbound] automated email ${input.resendEmailId} — kept in inbox`);
      return;
    }

    const bodyText = input.text?.trim() || (input.html ? htmlToText(input.html) : "");
    const cleaned = stripQuotedReply(bodyText);
    const replyTarget = findReplyTarget(input.to);

    if (replyTarget) {
      const result = await deliverReplyToThread(replyTarget, cleaned);
      if (result.status === "ROUTED") {
        await prisma.inboundEmail.update({
          where: { id: record.id },
          data: { status: "ROUTED", routedMessageId: result.messageId },
        });
        return;
      }
      // Token was valid but the thread is gone/closed or the body was empty —
      // fall through so the email still surfaces in the support inbox.
    }

    await forwardToSupport(input, cleaned);
  } catch (error) {
    console.error(
      `[inbound] post-claim processing failed for ${input.resendEmailId}:`,
      error,
    );
  }
}

async function deliverReplyToThread(
  target: ReplyTarget,
  cleanedBody: string,
): Promise<RouteResult> {
  const content = sanitizeHtml(cleanedBody).trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!content) {
    console.warn(`[inbound] empty reply body for ${target.kind}:${target.threadId}`);
    return { status: "INBOX", messageId: null };
  }
  return target.kind === "response"
    ? deliverResponseReply(target, content)
    : deliverInquiryReply(target, content);
}

async function deliverResponseReply(
  target: ReplyTarget,
  content: string,
): Promise<RouteResult> {
  const response = await prisma.response.findUnique({
    where: { id: target.threadId },
    select: {
      id: true,
      providerId: true,
      provider: { select: { name: true } },
      request: {
        select: {
          id: true,
          clientId: true,
          clientName: true,
          title: true,
          status: true,
          trackingToken: true,
        },
      },
    },
  });
  if (!response || response.request.status === "CLOSED") {
    return { status: "INBOX", messageId: null };
  }

  const fromClient = target.role === "client";
  const senderId = fromClient ? response.request.clientId : response.providerId;
  const senderName = fromClient ? response.request.clientName : response.provider.name;

  const now = new Date();
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        responseId: response.id,
        senderId: senderId ?? null,
        senderName: senderName ?? null,
        content,
      },
      select: { id: true },
    }),
    prisma.response.update({
      where: { id: response.id },
      data: { lastMessageAt: now, ...(fromClient ? {} : { providerLastReadAt: now }) },
    }),
  ]);

  // Notify the other participant — best-effort.
  if (fromClient) {
    await createMessageNotification({
      userId: response.providerId,
      link: `/tiekejas/uzklausos/${response.request.id}`,
      contextLabel: response.request.title,
    });
  } else if (response.request.clientId) {
    await createMessageNotification({
      userId: response.request.clientId,
      link: `/uzklausos/sekti/${response.request.trackingToken}`,
      contextLabel: response.request.title,
    });
  }

  return { status: "ROUTED", messageId: message.id };
}

async function deliverInquiryReply(
  target: ReplyTarget,
  content: string,
): Promise<RouteResult> {
  const inquiry = await prisma.directInquiry.findUnique({
    where: { id: target.threadId },
    select: {
      id: true,
      providerId: true,
      senderUserId: true,
      senderName: true,
      trackingToken: true,
      provider: { select: { name: true } },
    },
  });
  if (!inquiry) {
    return { status: "INBOX", messageId: null };
  }

  const fromClient = target.role === "client";
  const senderId = fromClient ? inquiry.senderUserId : inquiry.providerId;
  const senderName = fromClient
    ? inquiry.senderName ?? "Klientas"
    : inquiry.provider.name;

  const now = new Date();
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        directInquiryId: inquiry.id,
        senderId: senderId ?? null,
        senderName: senderName ?? null,
        content,
      },
      select: { id: true },
    }),
    prisma.directInquiry.update({
      where: { id: inquiry.id },
      data: { lastMessageAt: now, ...(fromClient ? {} : { providerLastReadAt: now }) },
    }),
  ]);

  if (fromClient) {
    await createMessageNotification({
      userId: inquiry.providerId,
      link: `/tiekejas/zinutes/${inquiry.id}`,
      contextLabel: senderName ?? "Klientas",
    });
  } else if (inquiry.senderUserId) {
    await createMessageNotification({
      userId: inquiry.senderUserId,
      link: `/zinutes/${inquiry.trackingToken}`,
      contextLabel: inquiry.provider.name ?? "Tiekėjas",
    });
  }

  return { status: "ROUTED", messageId: message.id };
}

/** Email a copy of a support-bound inbound message to the founder/admin address. */
async function forwardToSupport(input: InboundEmailInput, cleaned: string): Promise<void> {
  const forwardTo =
    process.env.INBOUND_FORWARD_TO?.trim() || process.env.EMAIL_REPLY_TO?.trim();
  if (!forwardTo) {
    console.log(
      "[inbound] no INBOUND_FORWARD_TO/EMAIL_REPLY_TO set — email kept in admin inbox only",
    );
    return;
  }

  const subject = input.subject?.trim() || "(be temos)";
  const body = input.text?.trim() || cleaned || "(tuščias laiškas)";

  await sendEmail({
    to: forwardTo,
    subject: `[Gautas laiškas] ${subject}`,
    html: `
      <div style="font-family: sans-serif; max-width: 640px; margin: 0 auto;">
        <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">Naujas laiškas gautas per paslaugurinka.lt</p>
        <p style="margin:0 0 2px;"><strong>Nuo:</strong> ${escapeHtml(input.from)}</p>
        <p style="margin:0 0 2px;"><strong>Kam:</strong> ${escapeHtml(input.to.join(", "))}</p>
        <p style="margin:0 0 12px;"><strong>Tema:</strong> ${escapeHtml(subject)}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;" />
        <pre style="white-space:pre-wrap;font-family:sans-serif;font-size:14px;color:#111827;">${escapeHtml(body)}</pre>
      </div>
    `,
  });
}
