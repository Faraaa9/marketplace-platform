import { revalidateTag } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail, requestExpiredEmail } from "@/lib/email";
import { isPlaceholderTelegramEmail } from "@/lib/service-requests/link-user";
import { REQUEST_EXPIRY_DAYS } from "@/lib/account/request-progress";

/** An OPEN request with no activity (edit, reopen, offer, chat message or a
 *  provider's paid unlock) for REQUEST_EXPIRY_DAYS leaves the lead feed, gets a
 *  "Tiekėjas nerastas" stamp on the board, and the customer is told once. */
export { REQUEST_EXPIRY_DAYS };
export const EXPIRED_STATUS = "EXPIRED";
// Bounds one cron run's email burst; the backlog drains over a few days.
const MAX_PER_RUN = 50;
const EMAIL_BATCH = 10;

/** Real emails go to real customers, so the founder switches this on. */
export function isRequestExpiryEnabled(): boolean {
  return ["true", "1", "yes"].includes((process.env.REQUEST_EXPIRY_ENABLED ?? "").toLowerCase());
}

export interface ExpiryCandidate {
  status: string;
  moderationStatus: string;
  createdAt: Date;
  updatedAt: Date;
  /** Latest offer or chat message (Response.lastMessageAt). */
  lastResponseAt: Date | null;
  /** A provider who just paid to unlock must still be able to answer. */
  lastUnlockAt: Date | null;
}

/** The single expiry rule; the DB query below is only its pre-filter. */
export function shouldExpire(r: ExpiryCandidate, now: Date): boolean {
  if (r.status !== "OPEN" || r.moderationStatus !== "APPROVED") return false;
  const cutoff = now.getTime() - REQUEST_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  const lastActivity = Math.max(
    r.createdAt.getTime(),
    r.updatedAt.getTime(),
    r.lastResponseAt?.getTime() ?? 0,
    r.lastUnlockAt?.getTime() ?? 0,
  );
  return lastActivity < cutoff;
}

function candidateWhere(now: Date): Prisma.ServiceRequestWhereInput {
  const cutoff = new Date(now.getTime() - REQUEST_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  return {
    status: "OPEN",
    moderationStatus: "APPROVED",
    createdAt: { lt: cutoff },
    updatedAt: { lt: cutoff },
    responses: { none: { lastMessageAt: { gte: cutoff } } },
    leadUnlocks: { none: { createdAt: { gte: cutoff } } },
  };
}

async function findCandidates(now: Date, take?: number) {
  const rows = await prisma.serviceRequest.findMany({
    where: candidateWhere(now),
    orderBy: { updatedAt: "asc" },
    ...(take ? { take } : {}),
    select: {
      id: true,
      title: true,
      status: true,
      moderationStatus: true,
      createdAt: true,
      updatedAt: true,
      clientName: true,
      clientEmail: true,
      trackingToken: true,
      responses: { orderBy: { lastMessageAt: "desc" }, take: 1, select: { lastMessageAt: true } },
      leadUnlocks: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  });
  return rows.filter((r) =>
    shouldExpire(
      { ...r, lastResponseAt: r.responses[0]?.lastMessageAt ?? null, lastUnlockAt: r.leadUnlocks[0]?.createdAt ?? null },
      now,
    ),
  );
}

/** Dry-run count for the cron report while the flag is off. */
export async function countExpiryCandidates(now = new Date()): Promise<number> {
  return (await findCandidates(now)).length;
}

export async function expireStaleRequests(
  now = new Date(),
): Promise<{ expired: number; customers: number; emailed: number }> {
  const candidates = await findCandidates(now, MAX_PER_RUN);
  const expired: typeof candidates = [];
  for (const r of candidates) {
    // Conditional update: a customer edit or a new offer racing the cron wins.
    const { count } = await prisma.serviceRequest.updateMany({
      where: { id: r.id, ...candidateWhere(now) },
      data: { status: EXPIRED_STATUS },
    });
    if (count === 1) expired.push(r);
  }
  if (expired.length > 0) revalidateTag("requests", { expire: 0 });

  // One email per customer: a few customers hold a dozen stale requests each.
  const byCustomer = new Map<string, typeof expired>();
  for (const r of expired) {
    if (isPlaceholderTelegramEmail(r.clientEmail)) continue;
    const key = r.clientEmail.trim().toLowerCase();
    byCustomer.set(key, [...(byCustomer.get(key) ?? []), r]);
  }
  const customers = [...byCustomer.values()];
  let emailed = 0;
  for (let i = 0; i < customers.length; i += EMAIL_BATCH) {
    const results = await Promise.allSettled(
      customers.slice(i, i + EMAIL_BATCH).map((rows) =>
        sendEmail({
          to: rows[0].clientEmail,
          ...requestExpiredEmail(rows[0].clientName, rows, REQUEST_EXPIRY_DAYS),
        }),
      ),
    );
    emailed += results.filter((x) => x.status === "fulfilled" && x.value.success).length;
  }
  return { expired: expired.length, customers: customers.length, emailed };
}
