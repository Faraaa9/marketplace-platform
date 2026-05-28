import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { directInquirySchema } from "@/lib/validations";
import { sanitizeHtml } from "@/lib/sanitize";
import { sendEmail, directInquiryVerificationEmail } from "@/lib/email";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import { hashDirectInquiryCode } from "@/lib/email-verification";
import crypto from "crypto";


function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Guest direct inquiry — step 1: validate, check existing account, create pending + send code.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const parsed = directInquirySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Validacijos klaida" },
        { status: 400 }
      );
    }

    const { providerId, description, budget, senderEmail, senderPhone, senderName } = parsed.data;

    // Guest must provide email
    if (!senderEmail) {
      return NextResponse.json(
        { success: false, error: "El. pašto adresas privalomas" },
        { status: 400 }
      );
    }

    // Check if email belongs to existing account
    const existingUser = await prisma.user.findUnique({
      where: { email: senderEmail },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          needsLogin: true,
          error: "Šis el. paštas jau naudojamas. Prisijunkite, kad galėtumėte siųsti žinutę.",
        },
        { status: 409 }
      );
    }

    // Verify provider exists and is active
    const provider = await prisma.user.findUnique({
      where: { id: providerId },
      select: {
        id: true,
        emailVerified: true,
        providerProfile: { select: { isActive: true } },
      },
    });

    if (!provider?.providerProfile?.isActive || !provider.emailVerified) {
      return NextResponse.json(
        { success: false, error: "Tiekėjas nerastas arba neaktyvus" },
        { status: 404 }
      );
    }

    // Duplicate check — active DirectInquiry from same email to same provider in 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingInquiry = await prisma.directInquiry.findFirst({
      where: {
        providerId,
        senderEmail,
        status: { in: ["NEW", "READ"] },
        createdAt: { gte: oneDayAgo },
      },
      select: { id: true },
    });

    if (existingInquiry) {
      return NextResponse.json(
        { success: false, error: "Jau turite aktyvią užklausą šiam tiekėjui. Palaukite atsakymo." },
        { status: 409 }
      );
    }

    // Rate limit — per IP for code sending
    const ip = getClientIp(req);
    const rl = await rateLimitAsync(`di-initiate:ip:${ip}`, RATE_LIMITS.directInquiryGuest);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Per daug užklausų. Pabandykite vėliau." },
        { status: 429 }
      );
    }

    // Check if there's already an unexpired pending for same email+provider
    const existingPending = await prisma.pendingDirectInquiry.findFirst({
      where: {
        providerId,
        senderEmail,
        expiresAt: { gt: new Date() },
        verifiedAt: null,
      },
      select: { id: true, lastSentAt: true, resendCount: true },
    });

    if (existingPending) {
      // Return existing pending ID — user can use resend endpoint for new code
      return NextResponse.json({
        success: true,
        data: {
          pendingId: existingPending.id,
          maskedEmail: maskEmail(senderEmail),
          alreadyPending: true,
        },
      });
    }

    // Create pending inquiry with verification code
    const code = generateCode();
    const codeHash = hashDirectInquiryCode(providerId, code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const pending = await prisma.pendingDirectInquiry.create({
      data: {
        providerId,
        description: sanitizeHtml(description.trim()),
        budget: budget ? sanitizeHtml(budget.trim()) : null,
        senderEmail,
        senderPhone: senderPhone ? sanitizeHtml(senderPhone.trim()) : null,
        senderName: senderName ? sanitizeHtml(senderName.trim()) : null,
        code: codeHash,
        expiresAt,
      },
    });

    // Send verification email
    const emailData = directInquiryVerificationEmail(code);
    const emailResult = await sendEmail({ to: senderEmail, ...emailData });
    if (!emailResult.success) {
      console.error("Direct inquiry initiate: nepavyko išsiųsti kodo laiško", emailResult.error);
      return NextResponse.json(
        { success: false, error: "Nepavyko išsiųsti patvirtinimo kodo. Pabandykite vėliau." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        pendingId: pending.id,
        maskedEmail: maskEmail(senderEmail),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Direct inquiry initiate error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko pradėti užklausos" },
      { status: 500 }
    );
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2);
  return `${visible}***@${domain}`;
}
