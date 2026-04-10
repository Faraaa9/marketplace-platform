import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { directInquirySchema } from "@/lib/validations";
import { sanitizeHtml } from "@/lib/sanitize";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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

    // Determine sender identity
    const senderUserId = session?.user?.id || null;
    const email = senderUserId
      ? (session?.user?.email || "")
      : (senderEmail || "");

    // Guest must provide email
    if (!senderUserId && !email) {
      return NextResponse.json(
        { success: false, error: "El. pašto adresas privalomas" },
        { status: 400 }
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

    // Cannot message yourself
    if (senderUserId === providerId) {
      return NextResponse.json(
        { success: false, error: "Negalite rašyti sau" },
        { status: 400 }
      );
    }

    // Duplicate check first — before rate limit so duplicates don't burn quotas
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await prisma.directInquiry.findFirst({
      where: {
        providerId,
        status: { in: ["NEW", "READ"] },
        createdAt: { gte: oneDayAgo },
        ...(senderUserId
          ? { senderUserId }
          : { senderEmail: email }),
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Jau turite aktyvią užklausą šiam tiekėjui. Palaukite atsakymo." },
        { status: 409 }
      );
    }

    // Rate limit — per sender (only counted for genuinely new inquiries)
    const ip = getClientIp(req);
    const senderKey = senderUserId
      ? `direct-inquiry:user:${senderUserId}`
      : `direct-inquiry:ip:${ip}`;
    const senderLimit = senderUserId ? RATE_LIMITS.directInquiry : RATE_LIMITS.directInquiryGuest;
    const senderRl = await rateLimitAsync(senderKey, senderLimit);
    if (!senderRl.success) {
      return NextResponse.json(
        { success: false, error: "Per daug užklausų. Pabandykite vėliau." },
        { status: 429 }
      );
    }

    // Rate limit — per provider (protect from inbox flood)
    const providerRl = await rateLimitAsync(
      `direct-inquiry:provider:${providerId}`,
      RATE_LIMITS.directInquiryPerProvider
    );
    if (!providerRl.success) {
      return NextResponse.json(
        { success: false, error: "Šis tiekėjas šiuo metu sulaukė daug užklausų. Pabandykite vėliau." },
        { status: 429 }
      );
    }

    // Create inquiry
    const inquiry = await prisma.directInquiry.create({
      data: {
        providerId,
        description: sanitizeHtml(description.trim()),
        budget: budget ? sanitizeHtml(budget.trim()) : null,
        senderUserId,
        senderEmail: email,
        senderPhone: senderPhone ? sanitizeHtml(senderPhone.trim()) : null,
        senderName: senderUserId
          ? (session?.user?.name || null)
          : (senderName ? sanitizeHtml(senderName.trim()) : null),
      },
    });

    return NextResponse.json({ success: true, data: { id: inquiry.id } }, { status: 201 });
  } catch (error) {
    console.error("Direct inquiry error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko išsiųsti žinutės" },
      { status: 500 }
    );
  }
}
