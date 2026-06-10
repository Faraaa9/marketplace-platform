import { NextRequest, NextResponse, connection } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { sendEmail, creditPurchaseEmail } from "@/lib/email";
import { grantCredits, reverseRefund } from "@/lib/credits";
import { claimWebhookEvent } from "@/lib/webhook-events";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(req: NextRequest) {
  await connection();
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Persistent dedup — survives crashes between side effect and 200 response.
    // The CreditTransaction.stripeCheckoutSessionId unique check still acts as
    // a second belt for the happy path, but this is the source of truth.
    const claimed = await claimWebhookEvent({
      source: "stripe",
      externalId: event.id,
      eventType: event.type,
    });
    if (!claimed) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession = event.data.object as Stripe.Checkout.Session;

        // Phase 4: checkout is one-time credit purchases only.
        if (
          checkoutSession.mode !== "payment" ||
          checkoutSession.payment_status !== "paid"
        ) {
          break;
        }

        const providerProfileId = checkoutSession.metadata?.providerProfileId;
        const creditsRaw = checkoutSession.metadata?.credits;
        const creditPackId = checkoutSession.metadata?.creditPackId;
        if (!providerProfileId || !creditsRaw) {
          console.error("Credit purchase webhook missing metadata:", checkoutSession.id);
          break;
        }
        const credits = parseInt(creditsRaw, 10);
        if (!Number.isInteger(credits) || credits <= 0) {
          console.error("Credit purchase webhook bad credits value:", creditsRaw);
          break;
        }

        // Stripe attaches the underlying charge id to the PaymentIntent. We
        // store it so charge.refunded can locate this purchase later.
        const stripeChargeId = await resolveLatestChargeId(checkoutSession);

        const result = await grantCredits({
          providerProfileId,
          amount: credits,
          type: "PURCHASE",
          note: `Kreditų pirkimas (${credits})`,
          creditPackId: creditPackId || undefined,
          stripeCheckoutSessionId: checkoutSession.id,
          stripeChargeId,
        });

        if (!result.alreadyProcessed) {
          const profile = await prisma.providerProfile.findUnique({
            where: { id: providerProfileId },
            select: { user: { select: { name: true, email: true } } },
          });
          if (profile?.user?.email) {
            const emailData = creditPurchaseEmail(
              profile.user.name || "Tiekėjau",
              credits,
              result.balance,
            );
            await sendEmail({ to: profile.user.email, ...emailData });
          }
        }

        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        // Only act on actual refunds: the event also fires after a partial
        // refund — same semantics; we reverse the full purchase grant.
        if (charge.amount_refunded <= 0) break;

        const refundId = charge.refunds?.data?.[0]?.id;
        const result = await reverseRefund({
          stripeChargeId: charge.id,
          refundedAmountCents: charge.amount_refunded,
          refundId,
        });
        if (!result.ok) {
          // Refund for a charge we never granted credits against (legacy data
          // pre-stripeChargeId, or an out-of-band charge). Log loudly so admin
          // can reconcile manually.
          console.error(
            `[stripe] charge.refunded for ${charge.id} — no matching PURCHASE in ledger; manual reconciliation needed.`,
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const sub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "CANCELED" },
          });
          await prisma.providerProfile.update({
            where: { userId: sub.userId },
            data: { planType: "FREE" },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as unknown as { subscription: string };
        const sub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: invoice.subscription },
        });
        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "PAST_DUE" },
          });
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

/**
 * Resolve the Stripe charge id for a completed checkout session. We try the
 * cheap path first (session.payment_intent string + latest_charge) and only
 * make a second API call if we have a payment_intent id but no expanded
 * latest_charge from the original event payload.
 */
async function resolveLatestChargeId(
  session: Stripe.Checkout.Session,
): Promise<string | undefined> {
  const intent = session.payment_intent;
  if (!intent) return undefined;
  if (typeof intent === "object" && intent.latest_charge) {
    return typeof intent.latest_charge === "string"
      ? intent.latest_charge
      : intent.latest_charge.id;
  }
  try {
    const id = typeof intent === "string" ? intent : intent.id;
    const fetched = await stripe.paymentIntents.retrieve(id);
    if (!fetched.latest_charge) return undefined;
    return typeof fetched.latest_charge === "string"
      ? fetched.latest_charge
      : fetched.latest_charge.id;
  } catch (error) {
    console.error("[stripe] failed to resolve charge id for session:", session.id, error);
    return undefined;
  }
}
