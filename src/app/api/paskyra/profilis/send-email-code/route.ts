import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail, changeEmailVerificationEmail } from "@/lib/email";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_RESENDS = 4;
const CODE_TTL_MS = 10 * 60 * 1000;

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Neteisingas el. pašto formatas"),
});

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2);
  return `${visible}***@${domain}`;
}

/**
 * Profile email change — send (or resend) a 6-digit code to the *new* email.
 * The new email is only persisted after POST /verify-email-code succeeds.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Prisijunkite" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const ipLimit = await rateLimitAsync(`profile-email-code:ip:${ip}`, RATE_LIMITS.requestCode);
    if (!ipLimit.success) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Pabandykite vėliau." },
        { status: 429 },
      );
    }
    const userLimit = await rateLimitAsync(
      `profile-email-code:user:${session.user.id}`,
      RATE_LIMITS.requestCode,
    );
    if (!userLimit.success) {
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
    const email = parsed.data.email;

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });
    if (!me) {
      return NextResponse.json({ success: false, error: "Profilis nerastas" }, { status: 404 });
    }
    if (me.email.toLowerCase() === email) {
      return NextResponse.json(
        { success: false, error: "Tai jau jūsų dabartinis el. paštas." },
        { status: 400 },
      );
    }

    const taken = await prisma.user.findFirst({
      where: { email, id: { not: session.user.id } },
      select: { id: true },
    });
    if (taken) {
      return NextResponse.json(
        { success: false, error: "Šis el. paštas jau naudojamas kitoje paskyroje." },
        { status: 409 },
      );
    }

    const existing = await prisma.requestEmailVerification.findUnique({ where: { email } });
    const previousActive = !!existing && existing.expiresAt > new Date();

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

    const result = await sendEmail({ to: email, ...changeEmailVerificationEmail(code) });
    if (!result.success) {
      console.error("Profile send-email-code: nepavyko išsiųsti kodo laiško", result.error);
      return NextResponse.json(
        { success: false, error: "Nepavyko išsiųsti kodo. Pabandykite vėliau." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { maskedEmail: maskEmail(email), emailMock: !!result.mock },
    });
  } catch (error) {
    console.error("Profile send-email-code error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko išsiųsti kodo" },
      { status: 500 },
    );
  }
}
