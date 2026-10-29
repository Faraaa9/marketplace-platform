import { NextRequest, NextResponse, connection } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { handleStripeEvent } from "@/lib/stripe-webhook";

export async function POST(req: NextRequest) {
  await connection();

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  let stripe: Stripe;
  try {
    if (!webhookSecret) throw new Error("[stripe] STRIPE_WEBHOOK_SECRET is not set — webhooks cannot be verified");
    stripe = getStripe();
  } catch (error) {
    // Misconfiguration, not a bad request: 500 keeps Stripe retrying and
    // shows failing deliveries in its dashboard until the env is fixed.
    console.error(error);
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let outcome;
  try {
    outcome = await handleStripeEvent(event);
  } catch (error) {
    // Nothing was committed; Stripe's retry will process the event again.
    console.error(`[stripe] webhook ${event.type} ${event.id} failed:`, error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  if (outcome.afterCommit) {
    try {
      await outcome.afterCommit();
    } catch (error) {
      // The credits are committed; a failed email must not trigger a retry.
      console.error(`[stripe] post-commit side effect for ${event.id} failed:`, error);
    }
  }

  return NextResponse.json({ received: true, duplicate: outcome.duplicate });
}
