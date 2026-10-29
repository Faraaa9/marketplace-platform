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
  | "REFUND_REVERSAL"
  | "DISPUTE_REVERSAL";

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

/** A Prisma client or an open interactive transaction. */
type Db = Prisma.TransactionClient;

/**
 * Take a row lock on the provider's profile for the rest of the transaction.
 * Every balance change updates this row, so holding the lock serialises
 * check-then-write sequences (starter grant, refund reconciliation) against
 * each other and against concurrent spends.
 */
async function lockProviderProfile(db: Db, providerProfileId: string): Promise<void> {
  await db.$queryRaw`SELECT id FROM provider_profiles WHERE id = ${providerProfileId} FOR UPDATE`;
}

/**
 * Add credits to a provider and write a ledger row, atomically. Used for
 * purchases, admin gifts and starter grants. When `stripeCheckoutSessionId`
 * is supplied the grant is idempotent — a redelivered Stripe webhook for the
 * same checkout session credits the account only once.
 *
 * Pass `db` to run inside the caller's transaction (the Stripe webhook does,
 * so the grant and the event claim commit or roll back together). In that
 * mode a unique-constraint race is not swallowed: it aborts the caller's
 * transaction, and the caller's retry sees the winning grant.
 */
export async function grantCredits(
  input: GrantCreditsInput,
  db?: Db,
): Promise<GrantCreditsResult> {
  const { amount, stripeCheckoutSessionId } = input;

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`grantCredits: amount must be a positive integer, got ${amount}`);
  }

  if (db) return applyGrant(db, input);

  try {
    return await prisma.$transaction((tx) => applyGrant(tx, input));
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

async function applyGrant(tx: Db, input: GrantCreditsInput): Promise<GrantCreditsResult> {
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
      // A concurrent unlock of this same lead may have spent the last credit
      // while we waited on the row lock — that is success, not a shortfall.
      const balance = await getCreditBalance(providerProfileId);
      if (await isLeadUnlocked(providerProfileId, requestId)) {
        return { ok: true, alreadyUnlocked: true, balance };
      }
      return { ok: false, reason: "INSUFFICIENT_CREDITS", balance };
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

/** Net credits a reversal row wrote off as uncollectable (see its note markers). */
function writtenOff(note: string | null): number {
  const short = note?.match(/neišieškota (\d+) kr\./);
  const cancelled = note?.match(/skola panaikinta (\d+) kr\./);
  return (short ? Number(short[1]) : 0) - (cancelled ? Number(cancelled[1]) : 0);
}

export type ChargeReversalType = "REFUND_REVERSAL" | "DISPUTE_REVERSAL";

export type ChargeReversalResult =
  | {
      ok: true;
      /** Credits moved by this call: positive = taken back, negative = restored. */
      reversed: number;
      /** Credits that should have been taken back but the balance did not cover. */
      shortfall: number;
      balance: number;
    }
  | { ok: false; reason: "PURCHASE_NOT_FOUND" };

/**
 * Bring the credits of a Stripe-paid purchase in line with the money the
 * platform has lost on that charge — for refunds and for disputes.
 *
 * The target is proportional: losing 3 € of a 10 € charge takes back 30 % of
 * the purchased credits. Stripe reports cumulative amounts (`amount_refunded`,
 * a dispute's amount), so the call computes target minus what this reversal
 * type already took and moves only the difference. That makes it idempotent
 * and lets several partial refunds add up correctly. A target below what was
 * taken (a dispute closed in the provider's favour → lostCents 0) restores
 * the difference.
 *
 * The balance is never driven below zero: when the provider already spent the
 * credits, only what is left is taken and the uncovered remainder is written
 * off — recorded in the ledger note and logged for manual follow-up, never
 * silently collected from a later purchase.
 *
 * Must run inside a transaction (`db`), so the caller can commit it together
 * with its own bookkeeping (the webhook event claim).
 */
export async function reconcileChargeReversal(
  db: Db,
  input: {
    stripeChargeId: string;
    type: ChargeReversalType;
    /** Cumulative cents lost on the charge for this type; 0 restores everything. */
    lostCents: number;
    /** The charge's full amount in cents. */
    chargeAmountCents: number;
    /** Stripe refund/dispute id, for the ledger note. */
    reference?: string;
  },
): Promise<ChargeReversalResult> {
  const { stripeChargeId, type, lostCents, chargeAmountCents, reference } = input;

  const purchase = await db.creditTransaction.findFirst({
    where: { stripeChargeId, type: "PURCHASE" },
    select: { amount: true, providerProfileId: true },
  });
  if (!purchase) return { ok: false, reason: "PURCHASE_NOT_FOUND" };
  const { providerProfileId } = purchase;

  await lockProviderProfile(db, providerProfileId);

  const prior = await db.creditTransaction.findMany({
    where: {
      providerProfileId,
      stripeChargeId,
      type: { in: ["REFUND_REVERSAL", "DISPUTE_REVERSAL"] },
    },
    select: { type: true, amount: true, note: true },
  });
  // A reversal is settled by credits actually taken (negative ledger amounts)
  // plus credits written off as uncollectable. The write-off lives in the
  // note — the schema has no column for it — and counting it keeps a later
  // event on this charge from collecting the same debt again.
  // ponytail: note-encoded write-off; add an `uncollected` column if reporting needs it.
  const settledOf = (rows: typeof prior) =>
    rows.reduce((sum, r) => sum - r.amount + writtenOff(r.note), 0);
  const sameType = prior.filter((r) => r.type === type);
  const takenSameType = -sameType.reduce((sum, r) => sum + r.amount, 0);
  const settledSameType = settledOf(sameType);
  const settledAll = settledOf(prior);

  const ratio = chargeAmountCents > 0 ? Math.min(Math.max(lostCents / chargeAmountCents, 0), 1) : 1;
  const target = Math.round(purchase.amount * ratio);
  let delta = target - settledSameType;
  // Refund + dispute together never take back more than was bought.
  if (delta > 0) delta = Math.min(delta, purchase.amount - settledAll);

  const profile = await db.providerProfile.findUnique({
    where: { id: providerProfileId },
    select: { creditBalance: true },
  });
  const balanceBefore = profile?.creditBalance ?? 0;
  if (delta === 0) return { ok: true, reversed: 0, shortfall: 0, balance: balanceBefore };

  let take: number;
  let shortfall = 0;
  let forgiven = 0;
  if (delta > 0) {
    take = Math.min(delta, Math.max(balanceBefore, 0));
    shortfall = delta - take;
  } else {
    // Give back only what was really taken; a written-off debt is just cancelled.
    const restore = Math.min(-delta, takenSameType);
    forgiven = -delta - restore;
    take = -restore;
  }

  const updated = await db.providerProfile.update({
    where: { id: providerProfileId },
    data: { creditBalance: { decrement: take } },
    select: { creditBalance: true },
  });

  const label = type === "DISPUTE_REVERSAL" ? "Stripe ginčas" : "Stripe grąžinimas";
  const noteParts = [
    delta > 0 ? `${label} (−${take} kr.)` : `${label} laimėtas (+${-take} kr.)`,
    `prarasta ${(lostCents / 100).toFixed(2)} iš ${(chargeAmountCents / 100).toFixed(2)}`,
  ];
  if (reference) noteParts.push(reference);
  if (shortfall > 0) {
    noteParts.push(`neišieškota ${shortfall} kr.`);
    console.error(
      `[credits] ${type} on ${stripeChargeId}: provider ${providerProfileId} lacked ${shortfall} credits to reverse — manual follow-up needed.`,
    );
  }
  if (forgiven > 0) noteParts.push(`skola panaikinta ${forgiven} kr.`);

  await db.creditTransaction.create({
    data: {
      providerProfileId,
      amount: -take,
      balanceAfter: updated.creditBalance,
      type,
      note: noteParts.join(" · "),
      stripeChargeId,
    },
  });

  return { ok: true, reversed: take, shortfall, balance: updated.creditBalance };
}

/**
 * Grant a new provider their free starter credits. Idempotent — a provider
 * receives exactly one starter grant ever, regardless of how often this runs.
 * The profile row lock makes the check-then-grant safe under concurrency.
 */
export async function grantStarterCredits(providerProfileId: string): Promise<void> {
  const amount = await getFreeStarterCredits();
  if (amount <= 0) return;

  await prisma.$transaction(async (tx) => {
    await lockProviderProfile(tx, providerProfileId);
    const existing = await tx.creditTransaction.findFirst({
      where: { providerProfileId, type: "STARTER_GRANT" },
      select: { id: true },
    });
    if (existing) return;

    await grantCredits(
      { providerProfileId, amount, type: "STARTER_GRANT", note: "Startiniai kreditai" },
      tx,
    );
  });
}
