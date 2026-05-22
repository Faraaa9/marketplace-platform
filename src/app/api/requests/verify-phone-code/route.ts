import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhoneNumber } from "@/lib/phone";
import { phoneVerificationCodeMatches } from "@/lib/phone-verification";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  phone: z.string().trim().min(1),
  code: z.string().trim().regex(/^\d{6}$/, "Įveskite 6 skaitmenų kodą"),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimitAsync(`phone-verify:ip:${ip}`, RATE_LIMITS.phoneVerify);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Pabandykite vėliau.", expired: true },
        { status: 429 },
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Trūksta duomenų" },
        { status: 400 },
      );
    }

    const phone = normalizePhoneNumber(parsed.data.phone);
    if (!phone) {
      return NextResponse.json(
        { success: false, error: "Neteisingas telefono numeris" },
        { status: 400 },
      );
    }

    const code = parsed.data.code;
    const record = await prisma.phoneVerification.findUnique({
      where: { phone },
      select: {
        codeHash: true,
        attempts: true,
        maxAttempts: true,
        expiresAt: true,
        verifiedAt: true,
      },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: "Kodas nerastas. Išsiųskite kodą iš naujo.", expired: true },
        { status: 404 },
      );
    }

    if (record.verifiedAt) {
      return NextResponse.json({
        success: true,
        data: { phone, phoneVerifiedAt: record.verifiedAt.toISOString() },
      });
    }

    if (record.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "Kodas nebegalioja. Išsiųskite kodą iš naujo.", expired: true },
        { status: 410 },
      );
    }

    if (record.attempts >= record.maxAttempts) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Išsiųskite kodą iš naujo.", expired: true },
        { status: 429 },
      );
    }

    if (!phoneVerificationCodeMatches(phone, code, record.codeHash)) {
      await prisma.phoneVerification.update({
        where: { phone },
        data: { attempts: { increment: 1 } },
        select: { id: true },
      });

      const remaining = record.maxAttempts - record.attempts - 1;
      return NextResponse.json(
        {
          success: false,
          error:
            remaining > 0
              ? `Neteisingas kodas. Liko bandymų: ${remaining}`
              : "Per daug bandymų. Išsiųskite kodą iš naujo.",
          expired: remaining <= 0,
        },
        { status: 400 },
      );
    }

    const verifiedAt = new Date();
    await prisma.phoneVerification.update({
      where: { phone },
      data: { verifiedAt },
      select: { id: true },
    });

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { phone, phoneVerifiedAt: verifiedAt },
        select: { id: true },
      });
    }

    return NextResponse.json({
      success: true,
      data: { phone, phoneVerifiedAt: verifiedAt.toISOString() },
    });
  } catch (error) {
    console.error("Phone verify-code error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko patvirtinti telefono" },
      { status: 500 },
    );
  }
}
