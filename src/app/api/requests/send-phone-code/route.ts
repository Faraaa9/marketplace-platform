import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhoneNumber, maskPhoneNumber } from "@/lib/phone";
import {
  createPhoneVerificationCode,
  hashPhoneVerificationCode,
  PHONE_CODE_TTL_MS,
} from "@/lib/phone-verification";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import { isTelnyxSmsConfigured, sendTelnyxSms } from "@/lib/telnyx";

const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_RESENDS = 4;

const schema = z.object({
  phone: z.string().trim().min(1, "Nurodykite telefono numerį").max(30, "Telefono numeris per ilgas"),
});

export async function POST(req: NextRequest) {
  await connection();
  try {
    if (!isTelnyxSmsConfigured()) {
      return NextResponse.json(
        { success: false, error: "SMS siuntimas dar nesukonfigūruotas." },
        { status: 503 },
      );
    }

    const ip = getClientIp(req);
    const ipLimit = await rateLimitAsync(`phone-code:ip:${ip}`, RATE_LIMITS.phoneCode, {
      failClosed: true,
    });
    if (!ipLimit.success) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Pabandykite vėliau." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Patikrinkite telefono numerį" },
        { status: 400 },
      );
    }

    const phone = normalizePhoneNumber(parsed.data.phone);
    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Įveskite numerį tarptautiniu formatu, pvz. +3706..." },
        { status: 400 },
      );
    }

    const phoneLimit = await rateLimitAsync(`phone-code:phone:${phone}`, RATE_LIMITS.phoneCode, {
      failClosed: true,
    });
    if (!phoneLimit.success) {
      return NextResponse.json(
        { success: false, error: "Šiam numeriui kodų išsiųsta per daug. Pabandykite vėliau." },
        { status: 429 },
      );
    }

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const owner = await prisma.user.findFirst({
        where: {
          phone,
          phoneVerifiedAt: { not: null },
          id: { not: session.user.id },
        },
        select: { id: true },
      });
      if (owner) {
        return NextResponse.json(
          { success: false, error: "Šis telefonas jau patvirtintas kitoje paskyroje." },
          { status: 409 },
        );
      }
    }

    const existing = await prisma.phoneVerification.findUnique({
      where: { phone },
      select: { expiresAt: true, lastSentAt: true, resendCount: true },
    });
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

    const code = createPhoneVerificationCode();
    const expiresAt = new Date(Date.now() + PHONE_CODE_TTL_MS);

    await prisma.phoneVerification.upsert({
      where: { phone },
      create: {
        phone,
        codeHash: hashPhoneVerificationCode(phone, code),
        userId: session?.user?.id ?? null,
        expiresAt,
      },
      update: {
        codeHash: hashPhoneVerificationCode(phone, code),
        userId: session?.user?.id ?? null,
        expiresAt,
        attempts: 0,
        verifiedAt: null,
        lastSentAt: new Date(),
        resendCount: previousActive ? { increment: 1 } : 0,
      },
      select: { id: true },
    });

    const result = await sendTelnyxSms({
      to: phone,
      text: `PaslaugųRinka kodas: ${code}. Galioja 10 min.`,
    });

    if (!result.success) {
      console.error("Phone send-code: Telnyx SMS failed", result.error);
      return NextResponse.json(
        { success: false, error: "Nepavyko išsiųsti SMS. Pabandykite vėliau." },
        { status: 502 },
      );
    }

    if (session?.user?.id) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { phone, phoneVerifiedAt: null },
        select: { id: true },
      });
    }

    return NextResponse.json({
      success: true,
      data: { maskedPhone: maskPhoneNumber(phone), phone },
    });
  } catch (error) {
    console.error("Phone send-code error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko išsiųsti SMS kodo" },
      { status: 500 },
    );
  }
}
