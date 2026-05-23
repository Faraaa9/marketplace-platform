import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { sendEmail, creditPurchaseEmail } from "@/lib/email";
import { grantCredits } from "@/lib/credits";

// TODO: Set STRIPE_SECRET_KEY in .env.local
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2026-04-22.dahlia",
});

export async function POST(req: NextRequest) {
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

        // Idempotent on the checkout session id — a redelivered webhook
        // credits the account only once.
        const result = await grantCredits({
          providerProfileId,
          amount: credits,
          type: "PURCHASE",
          note: `Kreditų pirkimas (${credits})`,
          creditPackId: creditPackId || undefined,
          stripeCheckoutSessionId: checkoutSession.id,
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
