import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Neteisingas el. pašto formatas"),
  code: z.string().trim().regex(/^\d{6}$/, "Įveskite 6 skaitmenų kodą"),
});

/**
 * Profile email change — verify the 6-digit code that was sent to the new
 * email and, if valid, swap the user's account email + mark it verified.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Prisijunkite" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rl = await rateLimitAsync(`profile-email-verify:ip:${ip}`, {
      maxRequests: 20,
      windowMs: 10 * 60 * 1000,
    });
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
    const email = parsed.data.email;
    const code = parsed.data.code;

    const record = await prisma.requestEmailVerification.findUnique({ where: { email } });
    if (!record) {
      return NextResponse.json(
        { success: false, error: "Kodas nerastas. Išsiųskite kodą iš naujo.", expired: true },
        { status: 404 },
      );
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

    await prisma.requestEmailVerification.update({
      where: { email },
      data: { attempts: { increment: 1 } },
    });

    if (record.code !== code) {
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

    // Re-check email isn't claimed by another user between send and verify.
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

    const verifiedAt = new Date();

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { email, emailVerified: verifiedAt },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          emailVerified: true,
          phoneVerifiedAt: true,
          createdAt: true,
          _count: { select: { serviceRequests: true } },
        },
      }),
      prisma.requestEmailVerification.update({
        where: { email },
        data: { verifiedAt },
      }),
    ]);

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error("Profile verify-email-code error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko patvirtinti el. pašto" },
      { status: 500 },
    );
  }
}
