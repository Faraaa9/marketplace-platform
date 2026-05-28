import { NextRequest, NextResponse, connection } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { emailVerificationCodeMatches } from "@/lib/email-verification";


const schema = z.object({
  email: z.string().email(),
  code: z.string().min(1),
});

/**
 * Service request — verify a 6-digit email code. Marks the email confirmed;
 * the request itself is created later by POST /api/requests.
 */
export async function POST(req: NextRequest) {
  try {
    // IP rate limit to blunt brute-force code guessing.
    const ip = getClientIp(req);
    const rl = await rateLimitAsync(`req-verify:ip:${ip}`, { maxRequests: 20, windowMs: 10 * 60 * 1000 });
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Pabandykite vėliau.", expired: true },
        { status: 429 },
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Trūksta duomenų" }, { status: 400 });
    }
    const email = parsed.data.email.trim().toLowerCase();
    const code = parsed.data.code.trim();

    const record = await prisma.requestEmailVerification.findUnique({ where: { email } });
    if (!record) {
      return NextResponse.json(
        { success: false, error: "Kodas nerastas. Išsiųskite kodą iš naujo.", expired: true },
        { status: 404 },
      );
    }

    // Already confirmed — idempotent success.
    if (record.verifiedAt) {
      return NextResponse.json({ success: true });
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

    if (!emailVerificationCodeMatches(email, code, record.code)) {
      await prisma.requestEmailVerification.update({
        where: { email },
        data: { attempts: { increment: 1 } },
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

    await prisma.requestEmailVerification.update({
      where: { email },
      data: { attempts: { increment: 1 } },
    });

    await prisma.requestEmailVerification.update({
      where: { email },
      data: { verifiedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Request verify-code error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko patvirtinti kodo" },
      { status: 500 },
    );
  }
}
