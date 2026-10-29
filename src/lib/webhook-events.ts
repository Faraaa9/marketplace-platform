import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type WebhookSource = "stripe" | "resend" | "telegram";

/**
 * Atomically claim a webhook delivery so the caller knows whether to process
 * it. The (source, externalId) unique constraint enforces single-processing
 * across crashes, redeliveries, and parallel invocations on Vercel.
 *
 * Returns `true` if THIS call claimed the event (proceed with side effects).
 * Returns `false` if another call already claimed it (skip — return 200 quickly).
 *
 * Pass `db` (an interactive transaction) to make the claim part of the work:
 * if the side effects fail, the claim rolls back with them and a redelivery
 * is processed again. Inside a transaction a `false` result means the
 * transaction is already aborted — the caller must throw, not continue.
 */
export async function claimWebhookEvent(input: {
  source: WebhookSource;
  externalId: string;
  eventType?: string;
  payload?: Record<string, unknown>;
}, db: Prisma.TransactionClient = prisma): Promise<boolean> {
  try {
    await db.webhookEvent.create({
      data: {
        source: input.source,
        externalId: input.externalId,
        eventType: input.eventType,
        payload: input.payload as Prisma.InputJsonValue | undefined,
      },
    });
    return true;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return false;
    }
    throw error;
  }
}
