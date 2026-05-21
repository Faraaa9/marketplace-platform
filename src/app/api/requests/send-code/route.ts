import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail, requestCodeVerificationEmail } from "@/lib/email";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_RESENDS = 4;
const CODE_TTL_MS = 10 * 60 * 1000;

const schema = z.object({ email: z.string().email("Neteisingas el. pašto formatas") });

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2);
  return `${visible}***@${domain}`;
}

/**
 * Service request — send (or resend) a 6-digit email verification code.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimitAsync(`req-code:ip:${ip}`, RATE_LIMITS.requestCode);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Pabandykite vėliau." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Neteisingas el. paštas" },
        { status: 400 },
      );
    }
    const email = parsed.data.email.trim().toLowerCase();

    const existing = await prisma.requestEmailVerification.findUnique({ where: { email } });
    const previousActive = !!existing && existing.expiresAt > new Date();

    // Cooldown — block rapid re-sends to the same address.
    if (existing) {
      const sinceLast = Date.now() - existing.lastSentAt.getTime();
      if (sinceLast < RESEND_COOLDOWN_MS) {
        return NextResponse.json(
          {
            success: false,
            error: `Palaukite ${Math.ceil((RESEND_COOLDOWN_MS - sinceLast) / 1000)}s prieš siunčiant dar kartą.`,
          },
          { status: 429 },
        );
      }
    }

    if (previousActive && existing && existing.resendCount >= MAX_RESENDS) {
      return NextResponse.json(
        { success: false, error: "Pasiektas kodo siuntimo limitas. Pabandykite vėliau." },
        { status: 429 },
      );
    }

    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + CODE_TTL_MS);

    await prisma.requestEmailVerification.upsert({
      where: { email },
      create: { email, code, expiresAt },
      update: {
        code,
        expiresAt,
        attempts: 0,
        verifiedAt: null,
        lastSentAt: new Date(),
        resendCount: previousActive ? { increment: 1 } : 0,
      },
    });

    const result = await sendEmail({ to: email, ...requestCodeVerificationEmail(code) });

    return NextResponse.json({
      success: true,
      data: { maskedEmail: maskEmail(email), emailMock: !!result.mock },
    });
  } catch (error) {
    console.error("Request send-code error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko išsiųsti kodo" },
      { status: 500 },
    );
  }
}
