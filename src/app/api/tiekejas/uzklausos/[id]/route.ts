import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { responseSchema } from "@/lib/validations";
import { sendEmail, newResponseEmail } from "@/lib/email";
import { PLAN_LIMITS, getEffectivePlanType } from "@/lib/constants";
import { sanitizeHtml } from "@/lib/sanitize";
import { requireActiveProvider } from "@/lib/provider-guard";
import { rateLimitAsync, RATE_LIMITS } from "@/lib/rate-limit";
import { checkEligibility, parseSpecializations } from "@/lib/provider-eligibility";

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
        location: true,
        budget: true,
        status: true,
        acceptedResponseId: true,
        clientId: true,
        clientName: true,
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
            provider: { select: { id: true, name: true } },
            messages: {
              select: {
                id: true,
                content: true,
                createdAt: true,
                senderName: true,
                sender: { select: { id: true, name: true } },
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

    const [totalResponses, profile, subscription] = await Promise.all([
      prisma.response.count({ where: { requestId: id } }),
      prisma.providerProfile.findUnique({
        where: { userId: guard.userId },
        select: { planType: true, specializations: true },
      }),
      prisma.subscription.findUnique({
        where: { userId: guard.userId },
        select: { status: true },
      }),
    ]);

    // Plan-based contact visibility
    const planType = getEffectivePlanType(profile?.planType || "FREE", subscription?.status);
    const plan = PLAN_LIMITS[planType];

    // Eligibility check
    const specs = parseSpecializations(profile?.specializations);
    const eligibility = checkEligibility(
      guard.userId,
      { category: request.category, status: request.status, clientId: request.clientId },
      specs,
    );

    const data = {
      id: request.id,
      title: request.title,
      description: request.description,
      category: request.category,
      location: request.location,
      budget: request.budget,
      status: request.status,
      acceptedResponseId: request.acceptedResponseId,
      clientName: request.clientName,
      createdAt: request.createdAt,
      responses: request.responses,
      totalResponses,
      clientEmail: plan.canSeeEmail ? request.clientEmail : null,
      clientPhone: plan.canSeePhone ? request.clientPhone : null,
      planType,
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
        id: true, category: true, status: true, clientId: true,
        clientName: true, clientEmail: true, title: true, trackingToken: true,
      },
    });
    if (!request) {
      return NextResponse.json({ success: false, error: "Užklausa nerasta" }, { status: 404 });
    }

    // Load provider specializations and check eligibility
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: guard.userId },
      select: { specializations: true, planType: true },
    });
    const specs = parseSpecializations(profile?.specializations);
    const eligibility = checkEligibility(
      guard.userId,
      { category: request.category, status: request.status, clientId: request.clientId },
      specs,
    );

    if (!eligibility.allowed) {
      return NextResponse.json(
        { success: false, error: eligibility.message, code: eligibility.code },
        { status: 403 },
      );
    }

    // Check plan limits (billing-aware)
    const subscription = await prisma.subscription.findUnique({
      where: { userId: guard.userId },
      select: { status: true },
    });
    const effectivePlan = getEffectivePlanType(profile?.planType || "FREE", subscription?.status);
    const planLimit = PLAN_LIMITS[effectivePlan]?.responsesPerMonth ?? 3;

    if (planLimit !== -1) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyCount = await prisma.response.count({
        where: {
          providerId: guard.userId,
          createdAt: { gte: startOfMonth },
        },
      });

      if (monthlyCount >= planLimit) {
        return NextResponse.json(
          { success: false, error: "Pasiekėte mėnesio atsakymų limitą. Atnaujinkite planą." },
          { status: 403 }
        );
      }
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

    // Send email to client
    const emailData = newResponseEmail(request.clientName, request.title, request.trackingToken);
    await sendEmail({ to: request.clientEmail, ...emailData });

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
