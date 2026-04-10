import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync, RATE_LIMITS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Guest direct inquiry — step 2: verify code and create real DirectInquiry.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pendingId, code } = body;

    if (!pendingId || !code || typeof code !== "string") {
      return NextResponse.json(
        { success: false, error: "Trūksta duomenų" },
        { status: 400 }
      );
    }

    const pending = await prisma.pendingDirectInquiry.findUnique({
      where: { id: pendingId },
    });

    if (!pending) {
      return NextResponse.json(
        { success: false, error: "Užklausa nerasta" },
        { status: 404 }
      );
    }

    // Already verified
    if (pending.verifiedAt) {
      return NextResponse.json(
        { success: false, error: "Kodas jau panaudotas" },
        { status: 400 }
      );
    }

    // Expired
    if (pending.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "Kodas nebegalioja. Pabandykite iš naujo.", expired: true },
        { status: 410 }
      );
    }

    // Max attempts exceeded
    if (pending.attempts >= pending.maxAttempts) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Pabandykite iš naujo.", expired: true },
        { status: 429 }
      );
    }

    // Increment attempts
    await prisma.pendingDirectInquiry.update({
      where: { id: pendingId },
      data: { attempts: { increment: 1 } },
    });

    // Check code
    if (pending.code !== code.trim()) {
      const remaining = pending.maxAttempts - pending.attempts - 1;
      return NextResponse.json(
        {
          success: false,
          error: remaining > 0
            ? `Neteisingas kodas. Liko bandymų: ${remaining}`
            : "Per daug bandymų. Pabandykite iš naujo.",
          expired: remaining <= 0,
        },
        { status: 400 }
      );
    }

    // Rate limit per provider before creating inquiry
    const providerRl = await rateLimitAsync(
      `direct-inquiry:provider:${pending.providerId}`,
      RATE_LIMITS.directInquiryPerProvider
    );
    if (!providerRl.success) {
      return NextResponse.json(
        { success: false, error: "Šis tiekėjas šiuo metu sulaukė daug užklausų. Pabandykite vėliau." },
        { status: 429 }
      );
    }

    // Mark as verified and create real DirectInquiry in a transaction
    const inquiry = await prisma.$transaction(async (tx) => {
      await tx.pendingDirectInquiry.update({
        where: { id: pendingId },
        data: { verifiedAt: new Date() },
      });

      return tx.directInquiry.create({
        data: {
          providerId: pending.providerId,
          description: pending.description,
          budget: pending.budget,
          senderEmail: pending.senderEmail,
          senderPhone: pending.senderPhone,
          senderName: pending.senderName,
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: { id: inquiry.id },
    });
  } catch (error) {
    console.error("Direct inquiry verify error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko patvirtinti kodo" },
      { status: 500 }
    );
  }
}
