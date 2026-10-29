import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { sendEmail, creditPurchaseEmail } from "@/lib/email";
import { grantCredits, reconcileChargeReversal } from "@/lib/credits";
import { claimWebhookEvent } from "@/lib/webhook-events";

/** Stripe API reads the handler needs; injected so tests can run without Stripe. */
export interface StripeLookups {
  checkoutChargeId(session: Stripe.Checkout.Session): Promise<string | undefined>;
  chargeAmountCents(chargeId: string): Promise<number>;
}

export interface StripeEventOutcome {
  duplicate: boolean;
  /** Best-effort side effects (emails) to run only after the work committed. */
  afterCommit?: () => Promise<void>;
}

class DuplicateEventError extends Error {}

/**
 * Process one verified Stripe event. The event claim and every database side
 * effect share one transaction: if anything throws, nothing is recorded, the
 * route answers 500 and Stripe's retry processes the event from scratch.
 * Stripe API reads happen before the transaction so it stays short.
 */
export async function handleStripeEvent(
  event: Stripe.Event,
  lookups: StripeLookups = liveLookups,
): Promise<StripeEventOutcome> {
  const prepared = await prepare(event, lookups);

  try {
    const afterCommit = await prisma.$transaction(async (tx) => {
      const claimed = await claimWebhookEvent(
        { source: "stripe", externalId: event.id, eventType: event.type },
        tx,
      );
      if (!claimed) throw new DuplicateEventError();

      switch (prepared.kind) {
        case "purchase": {
          const { providerProfileId, credits, creditPackId, sessionId, chargeId } = prepared;
          const result = await grantCredits(
            {
              providerProfileId,
              amount: credits,
              type: "PURCHASE",
              note: `Kreditų pirkimas (${credits})`,
              creditPackId,
              stripeCheckoutSessionId: sessionId,
              stripeChargeId: chargeId,
            },
            tx,
          );
          if (result.alreadyProcessed) return undefined;
          return () => sendPurchaseEmail(providerProfileId, credits, result.balance);
        }

        case "reversal": {
          const result = await reconcileChargeReversal(tx, prepared.input);
          if (!result.ok) {
            // A charge we never granted credits against (an out-of-band
            // payment). Nothing to reverse; flag it for manual reconciliation.
            console.error(
              `[stripe] ${event.type} for ${prepared.input.stripeChargeId} — no matching PURCHASE in ledger; manual reconciliation needed.`,
            );
          }
          return undefined;
        }

        case "subscription_deleted": {
          const sub = await tx.subscription.findFirst({
            where: { stripeSubscriptionId: prepared.subscriptionId },
            select: { id: true, userId: true },
          });
          if (sub) {
            await tx.subscription.update({ where: { id: sub.id }, data: { status: "CANCELED" } });
            await tx.providerProfile.update({
              where: { userId: sub.userId },
              data: { planType: "FREE" },
            });
          }
          return undefined;
        }

        case "invoice_failed": {
          const sub = await tx.subscription.findFirst({
            where: { stripeSubscriptionId: prepared.subscriptionId },
            select: { id: true },
          });
          if (sub) {
            await tx.subscription.update({ where: { id: sub.id }, data: { status: "PAST_DUE" } });
          }
          return undefined;
        }

        case "ignore":
          return undefined;
      }
    });
    return { duplicate: false, afterCommit };
  } catch (error) {
    if (error instanceof DuplicateEventError) return { duplicate: true };
    throw error;
  }
}

type Prepared =
  | {
      kind: "purchase";
      providerProfileId: string;
      credits: number;
      creditPackId?: string;
      sessionId: string;
      chargeId?: string;
    }
  | { kind: "reversal"; input: Parameters<typeof reconcileChargeReversal>[1] }
  | { kind: "subscription_deleted"; subscriptionId: string }
  | { kind: "invoice_failed"; subscriptionId: string }
  | { kind: "ignore" };

async function prepare(event: Stripe.Event, lookups: StripeLookups): Promise<Prepared> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      // Checkout is one-time credit purchases only.
      if (session.mode !== "payment" || session.payment_status !== "paid") {
        return { kind: "ignore" };
      }
      const providerProfileId = session.metadata?.providerProfileId;
      const creditsRaw = session.metadata?.credits;
      if (!providerProfileId || !creditsRaw) {
        console.error("[stripe] credit purchase webhook missing metadata:", session.id);
        return { kind: "ignore" };
      }
      const credits = parseInt(creditsRaw, 10);
      if (!Number.isInteger(credits) || credits <= 0) {
        console.error("[stripe] credit purchase webhook bad credits value:", creditsRaw);
        return { kind: "ignore" };
      }
      return {
        kind: "purchase",
        providerProfileId,
        credits,
        creditPackId: session.metadata?.creditPackId || undefined,
        sessionId: session.id,
        // Stored so refunds and disputes can find this purchase later. A
        // lookup failure throws: better a Stripe retry than an unmatchable row.
        chargeId: await lookups.checkoutChargeId(session),
      };
    }

    case "charge.refunded": {
      const charge = event.data.object;
      // amount_refunded is cumulative, so every partial refund event carries
      // the full picture and reconciliation only moves the difference.
      return {
        kind: "reversal",
        input: {
          stripeChargeId: charge.id,
          type: "REFUND_REVERSAL",
          lostCents: charge.amount_refunded,
          chargeAmountCents: charge.amount,
          reference: charge.refunds?.data?.[0]?.id,
        },
      };
    }

    // Stripe pulls the disputed funds when the dispute opens, so credits go
    // then; a dispute closed as won gives them back.
    case "charge.dispute.created":
    case "charge.dispute.closed": {
      const dispute = event.data.object;
      // Inquiries (warning_* statuses) are questions from the bank; Stripe does
      // not take the money, so they open with no credit change and close as a win.
      if (event.type === "charge.dispute.created" && dispute.status.startsWith("warning_")) {
        return { kind: "ignore" };
      }
      const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id;
      const won =
        event.type === "charge.dispute.closed" &&
        (dispute.status === "won" || dispute.status === "warning_closed");
      return {
        kind: "reversal",
        input: {
          stripeChargeId: chargeId,
          type: "DISPUTE_REVERSAL",
          lostCents: won ? 0 : dispute.amount,
          chargeAmountCents: await lookups.chargeAmountCents(chargeId),
          reference: dispute.id,
        },
      };
    }

    case "customer.subscription.deleted":
      return { kind: "subscription_deleted", subscriptionId: event.data.object.id };

    case "invoice.payment_failed": {
      const invoice = event.data.object as unknown as { subscription: string };
      return { kind: "invoice_failed", subscriptionId: invoice.subscription };
    }

    default:
      return { kind: "ignore" };
  }
}

const liveLookups: StripeLookups = {
  async checkoutChargeId(session) {
    const intent = session.payment_intent;
    // A fully discounted session has nothing to charge or refund. Any other
    // gap throws: a Stripe retry beats storing a purchase no refund can find.
    if (!intent) {
      if (!session.amount_total) return undefined;
      throw new Error(`[stripe] paid checkout ${session.id} has no payment_intent`);
    }
    const charge =
      typeof intent === "object" && intent.latest_charge
        ? intent.latest_charge
        : (await getStripe().paymentIntents.retrieve(typeof intent === "string" ? intent : intent.id))
            .latest_charge;
    if (!charge) throw new Error(`[stripe] paid checkout ${session.id} has no charge yet`);
    return typeof charge === "string" ? charge : charge.id;
  },
  async chargeAmountCents(chargeId) {
    return (await getStripe().charges.retrieve(chargeId)).amount;
  },
};

async function sendPurchaseEmail(providerProfileId: string, credits: number, balance: number) {
  const profile = await prisma.providerProfile.findUnique({
    where: { id: providerProfileId },
    select: { user: { select: { name: true, email: true } } },
  });
  if (!profile?.user?.email) return;
  await sendEmail({
    to: profile.user.email,
    ...creditPurchaseEmail(profile.user.name || "Tiekėjau", credits, balance),
  });
}
