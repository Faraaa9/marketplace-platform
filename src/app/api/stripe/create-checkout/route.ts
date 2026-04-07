import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

// TODO: Set STRIPE_SECRET_KEY in .env.local
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2023-10-16",
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROVIDER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await req.json();

    // Server-side plan-to-price mapping — never trust client-provided price IDs
    const PLAN_PRICE_MAP: Record<string, string | undefined> = {
      BASIC: process.env.STRIPE_BASIC_PRICE_ID,
      PRO: process.env.STRIPE_PRO_PRICE_ID,
    };

    if (!plan || !(plan in PLAN_PRICE_MAP)) {
      return NextResponse.json({ success: false, error: "Netinkamas planas" }, { status: 400 });
    }

    const priceId = PLAN_PRICE_MAP[plan];
    if (!priceId) {
      // TODO: Set STRIPE_BASIC_PRICE_ID / STRIPE_PRO_PRICE_ID in .env.local
      console.error(`Missing Stripe price ID for plan: ${plan}`);
      return NextResponse.json({ success: false, error: "Plano kaina nesukonfigūruota" }, { status: 500 });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/tiekejas/planai?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/tiekejas/planai?canceled=true`,
      metadata: {
        userId: session.user.id,
        plan,
      },
    });

    return NextResponse.json({ success: true, data: { url: checkoutSession.url } });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ success: false, error: "Klaida kuriant mokėjimą" }, { status: 500 });
  }
}
