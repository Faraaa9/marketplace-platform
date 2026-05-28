import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, passwordResetEmail } from "@/lib/email";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";

const RESEND_COOLDOWN_MS = 60 * 1000;

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2);
  return `${visible}***@${domain}`;
}

/**
 * Profile-only password reset trigger. The user is already authenticated, so
 * we skip the email-enumeration dance and just send a reset link to their
 * current address. Reuses the existing PasswordResetToken + reset-password flow.
 */
export async function POST(req: NextRequest) {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Prisijunkite" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const ipLimit = await rateLimitAsync(`profile-pwreset:ip:${ip}`, RATE_LIMITS.auth);
    if (!ipLimit.success) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Pabandykite vėliau." },
        { status: 429 },
      );
    }
    const userLimit = await rateLimitAsync(
      `profile-pwreset:user:${session.user.id}`,
      { maxRequests: 5, windowMs: 60 * 60 * 1000 },
    );
    if (!userLimit.success) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Pabandykite vėliau." },
        { status: 429 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: "Profilis nerastas" }, { status: 404 });
    }

    // Cooldown — block re-sends within 60s. Prevents accidental rapid-click spam.
    const lastToken = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (lastToken) {
      const sinceLast = Date.now() - lastToken.createdAt.getTime();
      if (sinceLast < RESEND_COOLDOWN_MS) {
        const retryIn = Math.ceil((RESEND_COOLDOWN_MS - sinceLast) / 1000);
        return NextResponse.json(
          {
            success: false,
            error: `Palaukite ${retryIn}s prieš siunčiant dar kartą.`,
            retryIn,
          },
          { status: 429 },
        );
      }
    }

    // Invalidate any prior reset tokens — only the freshest link should work.
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const token = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const emailData = passwordResetEmail(user.name || "Vartotojas", token);
    const result = await sendEmail({ to: user.email, ...emailData });
    if (!result.success) {
      console.error("Profile send-password-reset: nepavyko išsiųsti laiško", result.error);
      return NextResponse.json(
        { success: false, error: "Nepavyko išsiųsti laiško. Pabandykite vėliau." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { maskedEmail: maskEmail(user.email), emailMock: !!result.mock },
    });
  } catch (error) {
    console.error("Profile send-password-reset error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko išsiųsti atstatymo laiško" },
      { status: 500 },
    );
  }
}
