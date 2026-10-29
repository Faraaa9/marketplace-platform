import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { emailVerificationCodeMatches } from "@/lib/email-verification";
import { sendEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Neteisingas el. pašto formatas"),
  code: z.string().trim().regex(/^\d{6}$/, "Įveskite 6 skaitmenų kodą"),
});

/**
 * Profile email change — verify the 6-digit code that was sent to the new
 * email and, if valid, swap the user's account email + mark it verified.
 */
export async function POST(req: NextRequest) {
  await connection();
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

    if (record.verifiedAt || record.expiresAt < new Date()) {
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

    if (!emailVerificationCodeMatches(email, code, record.code)) {
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

    // Burn the code first, conditionally, so it works exactly once even
    // under concurrent submits.
    const consumed = await prisma.requestEmailVerification.updateMany({
      where: { email, verifiedAt: null, code: record.code },
      data: { verifiedAt },
    });
    if (consumed.count !== 1) {
      return NextResponse.json(
        { success: false, error: "Kodas nebegalioja. Išsiųskite kodą iš naujo.", expired: true },
        { status: 410 },
      );
    }

    const previous = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });

    const updatedUser = await prisma.user.update({
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
    });

    // Tell the old address, so a hijacked session can't silently move the
    // account away from its owner.
    // Telegram/phone-only accounts carry a placeholder address nobody reads.
    if (
      previous?.email &&
      previous.email.toLowerCase() !== email &&
      !previous.email.endsWith("@telegram.paslaugurinka.lt")
    ) {
      const masked = email.replace(/^(.{2}).*@/, "$1***@");
      await sendEmail({
        to: previous.email,
        subject: "Jūsų paskyros el. paštas pakeistas",
        html: `<p>Sveiki,</p><p>Jūsų paslaugurinka.lt paskyros el. pašto adresas ką tik pakeistas į <b>${masked}</b>.</p><p>Jei to nedarėte jūs, nedelsdami atsakykite į šį laišką.</p>`,
      }).catch((err: unknown) => console.error("Email-change notice to old address failed:", err));
    }

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error("Profile verify-email-code error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko patvirtinti el. pašto" },
      { status: 500 },
    );
  }
}
