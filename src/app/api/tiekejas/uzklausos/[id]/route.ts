import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { responseSchema } from "@/lib/validations";
import { sendEmail, newResponseEmail } from "@/lib/email";
import { buildReplyAddress } from "@/lib/inbound-email";
import { isLeadUnlocked } from "@/lib/credits";
import { sanitizeHtml } from "@/lib/sanitize";
import { requireActiveProvider } from "@/lib/provider-guard";
import { rateLimitAsync, RATE_LIMITS } from "@/lib/rate-limit";
import { checkEligibility } from "@/lib/provider-eligibility";
import { formatLastSeen, getPresenceLevel } from "@/lib/presence";

/**
 * Provider view of a request.
 * Returns the request, provider's own response + messages, and eligibility info.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const guard = await requireActiveProvider();
    if (!guard.authorized) return guard.response;

    const request = await prisma.serviceRequest.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        categoryId: true,
        categoryRef: { select: { id: true, rootId: true, name: true } },
        categories: {
          select: { category: { select: { name: true } } },
          orderBy: { sortOrder: "asc" },
        },
        location: true,
        budget: true,
        deadline: true,
        attachmentUrls: true,
        status: true,
        acceptedResponseId: true,
        clientId: true,
        clientName: true,
        client: { select: { image: true, name: true, lastSeenAt: true } },
        clientEmail: true,
        clientPhone: true,
        createdAt: true,
        responses: {
          where: { providerId: guard.userId },
          select: {
            id: true,
            message: true,
            price: true,
            createdAt: true,
            clientLastReadAt: true,
            provider: { select: { id: true, name: true } },
            messages: {
              select: {
                id: true,
                content: true,
                createdAt: true,
                senderId: true,
                senderName: true,
                sender: { select: { id: true, name: true, image: true } },
              },
              orderBy: { createdAt: "asc" as const },
            },
          },
          orderBy: { createdAt: "desc" as const },
        },
      },
    });

    if (!request) {
      return NextResponse.json({ success: false, error: "Nerasta" }, { status: 404 });
    }

    // Record this provider's view of the request (deduped per provider, best-effort).
    if (request.clientId !== guard.userId) {
      try {
        await prisma.requestView.upsert({
          where: { requestId_providerId: { requestId: id, providerId: guard.userId } },
          create: { requestId: id, providerId: guard.userId },
          update: {},
        });
      } catch {
        // view tracking must never break the page
      }
    }

    // Mark this provider's conversation thread as read — best-effort.
    try {
      await prisma.response.updateMany({
        where: { requestId: id, providerId: guard.userId },
        data: { providerLastReadAt: new Date() },
      });
    } catch {
      // read tracking must never break the page
    }

    const [totalResponses, profile, unlocked] = await Promise.all([
      prisma.response.count({ where: { requestId: id } }),
      prisma.providerProfile.findUnique({
        where: { id: guard.providerProfileId },
        select: {
          categories: { select: { category: { select: { id: true, rootId: true } } } },
        },
      }),
      isLeadUnlocked(guard.providerProfileId, id),
    ]);

    // Eligibility check
    const providerCategories = (profile?.categories ?? []).map((c) => c.category);
    const eligibility = checkEligibility(
      guard.userId,
      { status: request.status, clientId: request.clientId, category: request.categoryRef },
      providerCategories,
    );

    const joinedNames = request.categories
      .map((link) => link.category?.name?.trim() ?? "")
      .filter((name) => name.length > 0);
    const primaryCategoryName = request.categoryRef?.name ?? request.category;
    const categoryNames = joinedNames.length > 0
      ? joinedNames
      : primaryCategoryName
        ? [primaryCategoryName]
        : [];

    const data = {
      id: request.id,
      title: request.title,
      description: request.description,
      category: primaryCategoryName,
      categoryNames,
      location: request.location,
      budget: request.budget,
      deadline: request.deadline,
      attachmentUrls: request.attachmentUrls,
      status: request.status,
      acceptedResponseId: request.acceptedResponseId,
      clientName: request.clientName,
      clientImage: request.client?.image ?? null,
      clientPresenceLevel: getPresenceLevel(request.client?.lastSeenAt),
      clientPresenceLabel: formatLastSeen(request.client?.lastSeenAt),
      createdAt: request.createdAt,
      responses: request.responses,
      totalResponses,
      clientEmail: unlocked ? request.clientEmail : null,
      clientPhone: unlocked ? request.clientPhone : null,
      isUnlocked: unlocked,
      creditBalance: guard.creditBalance,
      canRespond: eligibility.allowed,
      eligibilityCode: eligibility.code,
      eligibilityMessage: eligibility.message,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Get request error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const guard = await requireActiveProvider();
    if (!guard.authorized) return guard.response;

    // Rate limit: 10 responses per 10 minutes
    const rl = await rateLimitAsync(`resp:${guard.userId}`, RATE_LIMITS.responses);
    if (!rl.success) {
      return NextResponse.json({ success: false, error: "Per daug pasiūlymų. Palaukite kelias minutes." }, { status: 429 });
    }

    const body = await req.json();
    const parsed = responseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: (parsed.error.issues?.[0]?.message || "Validacijos klaida") }, { status: 400 });
    }

    const request = await prisma.serviceRequest.findUnique({
      where: { id },
      select: {
        id: true, category: true, categoryId: true, status: true, clientId: true,
        categoryRef: { select: { id: true, rootId: true } },
        clientName: true, clientEmail: true, title: true, trackingToken: true,
      },
    });
    if (!request) {
      return NextResponse.json({ success: false, error: "Užklausa nerasta" }, { status: 404 });
    }

    // Load provider categories and check eligibility
    const profile = await prisma.providerProfile.findUnique({
      where: { id: guard.providerProfileId },
      select: {
        categories: { select: { category: { select: { id: true, rootId: true } } } },
      },
    });
    const providerCategories = (profile?.categories ?? []).map((c) => c.category);
    const eligibility = checkEligibility(
      guard.userId,
      { status: request.status, clientId: request.clientId, category: request.categoryRef },
      providerCategories,
    );

    if (!eligibility.allowed) {
      return NextResponse.json(
        { success: false, error: eligibility.message, code: eligibility.code },
        { status: 403 },
      );
    }

    // Pay-per-lead gate: responding requires an unlocked lead.
    const unlocked = await isLeadUnlocked(guard.providerProfileId, id);
    if (!unlocked) {
      return NextResponse.json(
        {
          success: false,
          error: "Atrakinkite užklausą, kad galėtumėte atsakyti.",
          code: "LEAD_LOCKED",
        },
        { status: 403 },
      );
    }

    // Check if already responded
    const existing = await prisma.response.findFirst({
      where: { requestId: id, providerId: guard.userId },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: "Jau atsakėte į šią užklausą" }, { status: 400 });
    }

    const response = await prisma.response.create({
      data: {
        requestId: id,
        providerId: guard.userId,
        message: sanitizeHtml(parsed.data.message),
        price: parsed.data.price || null,
      },
    });

    // Send email to client. Reply-To carries a signed token so the client can
    // answer the offer straight from their inbox and have it land in the thread.
    const emailData = newResponseEmail(request.clientName, request.title, request.trackingToken);
    await sendEmail({
      to: request.clientEmail,
      ...emailData,
      replyTo:
        buildReplyAddress({ kind: "response", threadId: response.id, role: "client" }) ??
        undefined,
    });

    // Create notification for client if they have account
    if (request.clientId) {
      await prisma.notification.create({
        data: {
          userId: request.clientId,
          type: "NEW_RESPONSE",
          title: "Naujas pasiūlymas",
          body: `Gavote pasiūlymą dėl „${request.title}"`,
          link: `/uzklausos/sekti/${request.trackingToken}`,
        },
      });
    }

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error("Create response error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
