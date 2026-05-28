import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

// TODO: Set STRIPE_SECRET_KEY in .env.local
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2026-04-22.dahlia",
});

/**
 * POST /api/stripe/create-checkout
 * Starts a one-time Stripe Checkout for a credit pack. The pack (and its
 * price) is resolved server-side from the database — never trust a
 * client-supplied price. The webhook credits the account on payment.
 */
export async function POST(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROVIDER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Neturite tiekėjo profilio" },
        { status: 403 },
      );
    }

    const { creditPackId } = await req.json();
    if (!creditPackId || typeof creditPackId !== "string") {
      return NextResponse.json({ success: false, error: "Nenurodytas paketas" }, { status: 400 });
    }

    const pack = await prisma.creditPack.findUnique({
      where: { id: creditPackId },
      select: {
        id: true,
        name: true,
        credits: true,
        priceCents: true,
        currency: true,
        isActive: true,
      },
    });
    if (!pack || !pack.isActive) {
      return NextResponse.json({ success: false, error: "Paketas neprieinamas" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: pack.currency,
            product_data: { name: `${pack.name} — PaslaugųRinka` },
            unit_amount: pack.priceCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/tiekejas/planai?success=true`,
      cancel_url: `${appUrl}/tiekejas/planai?canceled=true`,
      metadata: {
        userId: session.user.id,
        providerProfileId: profile.id,
        creditPackId: pack.id,
        // Snapshot the credit count so the webhook credits exactly what was
        // bought, even if an admin re-prices the pack afterward.
        credits: String(pack.credits),
      },
    });

    return NextResponse.json({ success: true, data: { url: checkoutSession.url } });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ success: false, error: "Klaida kuriant mokėjimą" }, { status: 500 });
  }
}
