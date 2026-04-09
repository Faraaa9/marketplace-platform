import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { sendEmail, emailVerificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimitAsync(`resend-verify:${ip}`, { maxRequests: 3, windowMs: 15 * 60 * 1000 });
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Bandykite vėliau." },
        { status: 429 }
      );
    }

    // Two modes: logged-in (no body needed) or by email
    const session = await getServerSession(authOptions);
    let email: string | undefined;

    if (session?.user?.email) {
      email = session.user.email;
    } else {
      const body = await req.json().catch(() => ({}));
      email = body.email;
    }

    if (!email) {
      return NextResponse.json({ success: false, error: "El. paštas privalomas" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, emailVerified: true },
    });

    // Always return success to prevent email enumeration
    if (!user || user.emailVerified) {
      return NextResponse.json({ success: true });
    }

    // Per-user rate limit
    const userRl = await rateLimitAsync(`resend-verify:user:${user.id}`, { maxRequests: 3, windowMs: 15 * 60 * 1000 });
    if (!userRl.success) {
      return NextResponse.json({ success: true }); // Silent — don't reveal rate limit per user
    }

    // Delete any existing tokens for this user
    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });

    // Create new token
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.emailVerificationToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const emailData = emailVerificationEmail(user.name || "Vartotojau", token);
    const emailResult = await sendEmail({ to: email, ...emailData });

    if (!emailResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Nepavyko išsiųsti patvirtinimo laiško. Patikrinkite el. pašto nustatymus ir bandykite dar kartą.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true, data: { mock: !!emailResult.mock } });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
