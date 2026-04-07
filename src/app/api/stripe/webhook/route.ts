import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { sendEmail, subscriptionConfirmationEmail } from "@/lib/email";

// TODO: Set STRIPE_SECRET_KEY in .env.local
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2023-10-16",
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
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId) break;

        const subscriptionId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;

        const planType = priceId === process.env.STRIPE_PRO_PRICE_ID ? "PRO" : "BASIC";

        await prisma.subscription.upsert({
          where: { userId },
          update: {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscriptionId,
            planType,
            status: "ACTIVE",
            currentPeriodEnd: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000),
          },
          create: {
            userId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscriptionId,
            planType,
            status: "ACTIVE",
            currentPeriodEnd: new Date((subscription as unknown as { current_period_end: number }).current_period_end * 1000),
          },
        });

        await prisma.providerProfile.update({
          where: { userId },
          data: { planType },
        });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user?.email) {
          const emailData = subscriptionConfirmationEmail(user.name || "Tiekėjau", planType);
          await sendEmail({ to: user.email, ...emailData });
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
