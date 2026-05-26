import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { directInquirySchema } from "@/lib/validations";
import { sanitizeHtml } from "@/lib/sanitize";
import { moderateText } from "@/lib/moderation";
import { rateLimitAsync, RATE_LIMITS } from "@/lib/rate-limit";
import { getDirectInquiryNotificationData } from "@/lib/direct-inquiry-notifications";

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

    const { providerId, description, budget, senderPhone } = parsed.data;

    // This endpoint is for authenticated users only.
    // Guests must use /api/direct-inquiry/initiate + /verify flow.
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Prisijunkite, kad galėtumėte siųsti žinutę." },
        { status: 401 }
      );
    }

    const senderUserId = session.user.id;
    const email = session.user.email || "";

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
        senderUserId,
        status: { in: ["NEW", "READ"] },
        createdAt: { gte: oneDayAgo },
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
    const senderRl = await rateLimitAsync(
      `direct-inquiry:user:${senderUserId}`,
      RATE_LIMITS.directInquiry
    );
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

    const moderation = await moderateText({
      entityType: "DirectInquiry",
      fields: { description, budget },
      actorUserId: senderUserId,
    });
    if (moderation.verdict === "reject") {
      return NextResponse.json(
        {
          success: false,
          error:
            moderation.userMessage ??
            "Žinutėje aptikta netinkamo turinio. Pataisykite ir bandykite dar kartą.",
        },
        { status: 422 }
      );
    }
    const inquiryModerationStatus = moderation.verdict === "ok" ? "APPROVED" : "PENDING";

    // Create inquiry
    const inquiry = await prisma.$transaction(async (tx) => {
      const createdInquiry = await tx.directInquiry.create({
        data: {
          providerId,
          description: sanitizeHtml(description.trim()),
          budget: budget ? sanitizeHtml(budget.trim()) : null,
          senderUserId,
          senderEmail: email,
          senderPhone: senderPhone ? sanitizeHtml(senderPhone.trim()) : null,
          senderName: session.user.name || null,
          moderationStatus: inquiryModerationStatus,
          moderationReason: moderation.reason,
          moderatedAt: new Date(),
          // The sender wrote this — leave it unread for the provider.
          providerLastReadAt: new Date(0),
          clientLastReadAt: new Date(),
        },
      });

      if (inquiryModerationStatus === "APPROVED") {
        await tx.notification.create({
          data: getDirectInquiryNotificationData({
            providerId,
            inquiryId: createdInquiry.id,
            senderEmail: email,
            senderName: createdInquiry.senderName,
          }),
        });
      }

      return createdInquiry;
    });

    return NextResponse.json(
      { success: true, data: { id: inquiry.id, trackingToken: inquiry.trackingToken } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Direct inquiry error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko išsiųsti žinutės" },
      { status: 500 }
    );
  }
}
