import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Stripe from "stripe";

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

    const { priceId } = await req.json();
    if (!priceId) {
      return NextResponse.json({ success: false, error: "Price ID reikalingas" }, { status: 400 });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/tiekėjas/planai?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/tiekėjas/planai?canceled=true`,
      metadata: {
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, data: { url: checkoutSession.url } });
  } catch (error) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json({ success: false, error: "Klaida kuriant mokėjimą" }, { status: 500 });
  }
}
