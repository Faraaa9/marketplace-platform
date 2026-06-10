import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getFreeStarterCredits } from "@/lib/platform-settings";

/**
 * Pay-per-lead credit core (Phase 4).
 *
 * A provider spends credits to unlock client requests (leads). Unlocking a
 * lead reveals the client's contact details and unlocks responding. The
 * cached balance lives on `ProviderProfile.creditBalance`; every change is
 * mirrored in the append-only `CreditTransaction` ledger.
 */

/** A lead unlock always costs exactly one credit. */
export const CREDITS_PER_UNLOCK = 1;

// Category visibility pricing lives in a client-safe module so the editor UI
// can import it too; re-exported here for existing server-side callers.
export {
  FREE_CATEGORY_LIMIT,
  CREDITS_PER_CATEGORY_MONTH,
  CATEGORY_PERIOD_DAYS,
  MAX_CATEGORY_MONTHS,
} from "@/lib/category-pricing";
import {
  CREDITS_PER_CATEGORY_MONTH,
  CATEGORY_PERIOD_DAYS,
  MAX_CATEGORY_MONTHS,
} from "@/lib/category-pricing";

export type CreditTransactionType =
  | "PURCHASE"
  | "UNLOCK_SPEND"
  | "ADMIN_GRANT"
  | "STARTER_GRANT"
  | "CATEGORY_UNLOCK"
  | "REFUND_REVERSAL";

/** A paid category counts as active while it has no expiry or expires later. */
export function isCategoryActive(expiresAt: Date | null | undefined): boolean {
  return expiresAt == null || expiresAt.getTime() > Date.now();
}

/**
 * Thrown inside the unlock transaction to roll it back when the provider
 * cannot afford the unlock. Never escapes this module — it is caught and
 * converted into a clean `{ ok: false }` result.
 */
class InsufficientCreditsError extends Error {}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Reads
// ─────────────────────────────────────────────────────────────────────────

/** Current cached credit balance for a provider. */
export async function getCreditBalance(providerProfileId: string): Promise<number> {
  const profile = await prisma.providerProfile.findUnique({
    where: { id: providerProfileId },
    select: { creditBalance: true },
  });
  return profile?.creditBalance ?? 0;
}

/** Whether this provider has unlocked a specific request. */
export async function isLeadUnlocked(
  providerProfileId: string,
  requestId: string,
): Promise<boolean> {
  const unlock = await prisma.leadUnlock.findUnique({
    where: { requestId_providerProfileId: { requestId, providerProfileId } },
    select: { id: true },
  });
  return unlock !== null;
}

/**
 * The subset of `requestIds` this provider has unlocked. Used by the board to
 * mark lock state across a page of leads in a single query.
 */
export async function getUnlockedRequestIds(
  providerProfileId: string,
  requestIds: string[],
): Promise<Set<string>> {
  if (requestIds.length === 0) return new Set();
  const unlocks = await prisma.leadUnlock.findMany({
    where: { providerProfileId, requestId: { in: requestIds } },
    select: { requestId: true },
  });
  return new Set(unlocks.map((u) => u.requestId));
}

/** Recent ledger entries for a provider, newest first. */
export async function getCreditLedger(providerProfileId: string, limit = 50) {
  return prisma.creditTransaction.findMany({
    where: { providerProfileId },
    select: {
      id: true,
      amount: true,
      balanceAfter: true,
      type: true,
      note: true,
      requestId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Writes
// ─────────────────────────────────────────────────────────────────────────

export interface GrantCreditsInput {
  providerProfileId: string;
  /** Positive number of credits to add. */
  amount: number;
  type: CreditTransactionType;
  note?: string;
  adminUserId?: string;
  creditPackId?: string;
  requestId?: string;
  /** Stripe checkout session id — the idempotency key for purchases. */
  stripeCheckoutSessionId?: string;
  /** Stripe charge id (latest_charge on the PaymentIntent) — joined later by charge.refunded. */
  stripeChargeId?: string;
}

export interface GrantCreditsResult {
  balance: number;
  /** True when this exact grant had already been applied (idempotent no-op). */
  alreadyProcessed: boolean;
}

/**
 * Add credits to a provider and write a ledger row, atomically. Used for
 * purchases, admin gifts and starter grants. When `stripeCheckoutSessionId`
 * is supplied the grant is idempotent — a redelivered Stripe webhook for the
 * same checkout session credits the account only once.
 */
export async function grantCredits(
  input: GrantCreditsInput,
): Promise<GrantCreditsResult> {
  const {
    providerProfileId,
    amount,
    type,
    note,
    adminUserId,
    creditPackId,
    requestId,
    stripeCheckoutSessionId,
    stripeChargeId,
  } = input;

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`grantCredits: amount must be a positive integer, got ${amount}`);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // Idempotency: a checkout session credits the account exactly once.
      if (stripeCheckoutSessionId) {
        const existing = await tx.creditTransaction.findUnique({
          where: { stripeCheckoutSessionId },
          select: { balanceAfter: true },
        });
        if (existing) {
          return { balance: existing.balanceAfter, alreadyProcessed: true };
        }
      }

      const updated = await tx.providerProfile.update({
        where: { id: providerProfileId },
        data: { creditBalance: { increment: amount } },
        select: { creditBalance: true },
      });

      await tx.creditTransaction.create({
        data: {
          providerProfileId,
          amount,
          balanceAfter: updated.creditBalance,
          type,
          note,
          adminUserId,
          creditPackId,
          requestId,
          stripeCheckoutSessionId,
          stripeChargeId,
        },
      });

      return { balance: updated.creditBalance, alreadyProcessed: false };
    });
  } catch (error) {
    // Concurrent webhook delivery lost the race on the unique session id —
    // the purchase was already credited by the winning call.
    if (stripeCheckoutSessionId && isUniqueConstraintError(error)) {
      const existing = await prisma.creditTransaction.findUnique({
        where: { stripeCheckoutSessionId },
        select: { balanceAfter: true },
      });
      return { balance: existing?.balanceAfter ?? 0, alreadyProcessed: true };
    }
    throw error;
  }
}

export type UnlockResult =
  | { ok: true; alreadyUnlocked: boolean; balance: number }
  | { ok: false; reason: "INSUFFICIENT_CREDITS"; balance: number };

/**
 * Unlock a lead for a provider: spend one credit, record the unlock and the
 * ledger entry — all atomically.
 *
 * Concurrency is handled by two guards working together:
 *  - the `LeadUnlock` unique index on (requestId, providerProfileId) — a
 *    double-click cannot create two unlocks, so it cannot charge twice;
 *  - a conditional decrement (`creditBalance >= 1`) — the balance can never
 *    go negative even under racing unlocks.
 * If either guard trips, the whole transaction rolls back, leaving no
 * partial unlock and no partial charge.
 */
export async function unlockLead(input: {
  providerProfileId: string;
  requestId: string;
}): Promise<UnlockResult> {
  const { providerProfileId, requestId } = input;

  // Fast path: already unlocked (common when a provider revisits a lead).
  const existing = await prisma.leadUnlock.findUnique({
    where: { requestId_providerProfileId: { requestId, providerProfileId } },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: true,
      alreadyUnlocked: true,
      balance: await getCreditBalance(providerProfileId),
    };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // Atomic compare-and-decrement. count === 0 means the provider could
      // not afford it; throwing rolls the transaction back untouched.
      const decremented = await tx.providerProfile.updateMany({
        where: {
          id: providerProfileId,
          creditBalance: { gte: CREDITS_PER_UNLOCK },
        },
        data: { creditBalance: { decrement: CREDITS_PER_UNLOCK } },
      });
      if (decremented.count === 0) {
        throw new InsufficientCreditsError();
      }

      // Claim the unlock. A concurrent winner makes this throw a unique
      // violation, which rolls back the decrement above — never charging twice.
      await tx.leadUnlock.create({
        data: { requestId, providerProfileId, source: "unlock" },
      });

      const profile = await tx.providerProfile.findUnique({
        where: { id: providerProfileId },
        select: { creditBalance: true },
      });
      const balanceAfter = profile?.creditBalance ?? 0;

      await tx.creditTransaction.create({
        data: {
          providerProfileId,
          amount: -CREDITS_PER_UNLOCK,
          balanceAfter,
          type: "UNLOCK_SPEND",
          requestId,
          note: "Užklausos atrakinimas",
        },
      });

      return { ok: true as const, alreadyUnlocked: false, balance: balanceAfter };
    });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return {
        ok: false,
        reason: "INSUFFICIENT_CREDITS",
        balance: await getCreditBalance(providerProfileId),
      };
    }
    // A concurrent unlock won the race; our transaction rolled back fully.
    // The lead is unlocked and was charged exactly once — report success.
    if (isUniqueConstraintError(error)) {
      return {
        ok: true,
        alreadyUnlocked: true,
        balance: await getCreditBalance(providerProfileId),
      };
    }
    throw error;
  }
}

export type CategoryUnlockResult =
  | { ok: true; alreadyFree: boolean; balance: number; expiresAt: Date; cost: number }
  | { ok: false; reason: "INSUFFICIENT_CREDITS"; balance: number };

/**
 * Unlock (or renew) an extra service category for a provider for `months`
 * 30-day periods, spending credits atomically.
 *
 * - If the category is already a FREE base category (expiresAt null) it stays
 *   free — no charge, reported as `alreadyFree`.
 * - Renewing before expiry stacks: the new expiry extends from the later of
 *   now or the current expiry, so paid time is never lost.
 * - The conditional decrement (`creditBalance >= cost`) keeps the balance from
 *   going negative under racing requests; on shortfall the whole transaction
 *   rolls back.
 */
export async function unlockCategory(input: {
  providerProfileId: string;
  categoryId: string;
  months: number;
}): Promise<CategoryUnlockResult> {
  const { providerProfileId, categoryId } = input;
  const months = Math.min(
    Math.max(1, Math.floor(input.months || 1)),
    MAX_CATEGORY_MONTHS,
  );
  const cost = months * CREDITS_PER_CATEGORY_MONTH;
  const periodMs = CATEGORY_PERIOD_DAYS * 24 * 60 * 60 * 1000;

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.providerProfileCategory.findUnique({
        where: {
          providerProfileId_categoryId: { providerProfileId, categoryId },
        },
        select: { id: true, expiresAt: true, sortOrder: true },
      });

      // Already a permanent free/base category — nothing to buy.
      if (existing && existing.expiresAt == null) {
        return {
          ok: true as const,
          alreadyFree: true,
          balance: await getCreditBalance(providerProfileId),
          expiresAt: new Date(8640000000000000), // sentinel "never"
          cost: 0,
        };
      }

      const decremented = await tx.providerProfile.updateMany({
        where: { id: providerProfileId, creditBalance: { gte: cost } },
        data: { creditBalance: { decrement: cost } },
      });
      if (decremented.count === 0) {
        throw new InsufficientCreditsError();
      }

      // Stack on top of remaining paid time if renewing early.
      const base = Math.max(
        Date.now(),
        existing?.expiresAt ? existing.expiresAt.getTime() : Date.now(),
      );
      const newExpiry = new Date(base + months * periodMs);

      if (existing) {
        await tx.providerProfileCategory.update({
          where: { id: existing.id },
          data: { expiresAt: newExpiry },
        });
      } else {
        const last = await tx.providerProfileCategory.findFirst({
          where: { providerProfileId },
          orderBy: { sortOrder: "desc" },
          select: { sortOrder: true },
        });
        await tx.providerProfileCategory.create({
          data: {
            providerProfileId,
            categoryId,
            sortOrder: (last?.sortOrder ?? -1) + 1,
            expiresAt: newExpiry,
          },
        });
      }

      const profile = await tx.providerProfile.findUnique({
        where: { id: providerProfileId },
        select: { creditBalance: true },
      });
      const balanceAfter = profile?.creditBalance ?? 0;

      await tx.creditTransaction.create({
        data: {
          providerProfileId,
          amount: -cost,
          balanceAfter,
          type: "CATEGORY_UNLOCK",
          categoryId,
          note: `Kategorijos atrakinimas (${months} mėn.)`,
        },
      });

      return {
        ok: true as const,
        alreadyFree: false,
        balance: balanceAfter,
        expiresAt: newExpiry,
        cost,
      };
    });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return {
        ok: false,
        reason: "INSUFFICIENT_CREDITS",
        balance: await getCreditBalance(providerProfileId),
      };
    }
    throw error;
  }
}

export type ReverseRefundResult =
  | { ok: true; alreadyReversed: boolean; balance: number; reversed: number }
  | { ok: false; reason: "PURCHASE_NOT_FOUND" };

/**
 * Reverse a previously granted purchase after Stripe reports a refund.
 *
 * Idempotent on (originalCheckoutSessionId): a redelivered or repeated
 * `charge.refunded` event will not double-reverse. The reversal can take the
 * balance negative — that is intentional. If the provider already spent the
 * credits we still owe the platform, and admin gets a visible negative
 * balance to follow up on.
 */
export async function reverseRefund(input: {
  /** The PURCHASE ledger row to reverse, located via Stripe charge id. */
  stripeChargeId: string;
  /** Refunded amount in the original currency unit (cents). For audit only. */
  refundedAmountCents?: number;
  /** Stripe refund id — included in the note for audit. */
  refundId?: string;
}): Promise<ReverseRefundResult> {
  const { stripeChargeId, refundedAmountCents, refundId } = input;

  const purchase = await prisma.creditTransaction.findFirst({
    where: { stripeChargeId, type: "PURCHASE" },
    select: {
      id: true,
      amount: true,
      providerProfileId: true,
      stripeCheckoutSessionId: true,
    },
  });
  if (!purchase) {
    return { ok: false, reason: "PURCHASE_NOT_FOUND" };
  }

  const existingReversal = await prisma.creditTransaction.findFirst({
    where: {
      type: "REFUND_REVERSAL",
      stripeChargeId,
      providerProfileId: purchase.providerProfileId,
    },
    select: { id: true, balanceAfter: true },
  });
  if (existingReversal) {
    return {
      ok: true,
      alreadyReversed: true,
      balance: existingReversal.balanceAfter,
      reversed: 0,
    };
  }

  const reverseAmount = purchase.amount;

  try {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.providerProfile.update({
        where: { id: purchase.providerProfileId },
        data: { creditBalance: { decrement: reverseAmount } },
        select: { creditBalance: true },
      });

      const noteParts = [`Stripe grąžinimas (${reverseAmount} kr.)`];
      if (refundId) noteParts.push(`refund=${refundId}`);
      if (refundedAmountCents != null) {
        noteParts.push(`refunded=${(refundedAmountCents / 100).toFixed(2)}`);
      }

      await tx.creditTransaction.create({
        data: {
          providerProfileId: purchase.providerProfileId,
          amount: -reverseAmount,
          balanceAfter: updated.creditBalance,
          type: "REFUND_REVERSAL",
          note: noteParts.join(" · "),
          stripeChargeId,
        },
      });

      return {
        ok: true as const,
        alreadyReversed: false,
        balance: updated.creditBalance,
        reversed: reverseAmount,
      };
    });
  } catch (error) {
    // Lost the race to a concurrent webhook delivery — the other call wrote
    // the reversal. Refetch and report alreadyReversed.
    if (isUniqueConstraintError(error)) {
      const existing = await prisma.creditTransaction.findFirst({
        where: {
          type: "REFUND_REVERSAL",
          stripeChargeId,
          providerProfileId: purchase.providerProfileId,
        },
        select: { balanceAfter: true },
      });
      return {
        ok: true,
        alreadyReversed: true,
        balance: existing?.balanceAfter ?? 0,
        reversed: 0,
      };
    }
    throw error;
  }
}

/**
 * Grant a new provider their free starter credits. Idempotent — a provider
 * receives exactly one starter grant ever, regardless of how often this runs.
 */
export async function grantStarterCredits(providerProfileId: string): Promise<void> {
  const existing = await prisma.creditTransaction.findFirst({
    where: { providerProfileId, type: "STARTER_GRANT" },
    select: { id: true },
  });
  if (existing) return;

  const amount = await getFreeStarterCredits();
  if (amount <= 0) return;

  await grantCredits({
    providerProfileId,
    amount,
    type: "STARTER_GRANT",
    note: "Startiniai kreditai",
  });
}
