import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail, directInquiryVerificationEmail } from "@/lib/email";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const MAX_RESENDS = 3;
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

/**
 * Resend verification code for a pending direct inquiry.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pendingId } = body;

    if (!pendingId) {
      return NextResponse.json(
        { success: false, error: "Trūksta duomenų" },
        { status: 400 }
      );
    }

    // Rate limit per IP
    const ip = getClientIp(req);
    const rl = await rateLimitAsync(`di-resend:ip:${ip}`, { maxRequests: 5, windowMs: 10 * 60 * 1000 });
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Pabandykite vėliau." },
        { status: 429 }
      );
    }

    const pending = await prisma.pendingDirectInquiry.findUnique({
      where: { id: pendingId },
    });

    if (!pending || pending.verifiedAt) {
      return NextResponse.json(
        { success: false, error: "Užklausa nerasta" },
        { status: 404 }
      );
    }

    if (pending.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "Kodas nebegalioja. Pabandykite iš naujo.", expired: true },
        { status: 410 }
      );
    }

    // Resend limit
    if (pending.resendCount >= MAX_RESENDS) {
      return NextResponse.json(
        { success: false, error: "Pasiektas pakartotinio siuntimo limitas." },
        { status: 429 }
      );
    }

    // Cooldown check
    const timeSinceLastSend = Date.now() - pending.lastSentAt.getTime();
    if (timeSinceLastSend < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - timeSinceLastSend) / 1000);
      return NextResponse.json(
        { success: false, error: `Palaukite ${waitSeconds}s prieš siunčiant dar kartą.`, cooldown: waitSeconds },
        { status: 429 }
      );
    }

    // Generate new code, reset attempts
    const newCode = crypto.randomInt(100000, 999999).toString();

    await prisma.pendingDirectInquiry.update({
      where: { id: pendingId },
      data: {
        code: newCode,
        attempts: 0,
        resendCount: { increment: 1 },
        lastSentAt: new Date(),
      },
    });

    // Send new code
    const emailData = directInquiryVerificationEmail(newCode);
    await sendEmail({ to: pending.senderEmail, ...emailData });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Direct inquiry resend error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko išsiųsti kodo" },
      { status: 500 }
    );
  }
}
