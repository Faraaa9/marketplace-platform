import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { responseSchema } from "@/lib/validations";
import { sendEmail, newResponseEmail } from "@/lib/email";
import { PLAN_LIMITS, getEffectivePlanType } from "@/lib/constants";
import { sanitizeHtml } from "@/lib/sanitize";
import { requireActiveProvider } from "@/lib/provider-guard";

/**
 * Provider view of a request.
 * Only returns the current provider's own response + messages.
 * Requires verified email + active profile.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guard = await requireActiveProvider();
    if (!guard.authorized) return guard.response;

    const request = await prisma.serviceRequest.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        location: true,
        budget: true,
        status: true,
        acceptedResponseId: true,
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

    const totalResponses = await prisma.response.count({
      where: { requestId: params.id },
    });

    // Enforce contact visibility by effective plan (checks billing status)
    const [profile, subscription] = await Promise.all([
      prisma.providerProfile.findUnique({ where: { userId: guard.userId }, select: { planType: true } }),
      prisma.subscription.findUnique({ where: { userId: guard.userId }, select: { status: true } }),
    ]);
    const planType = getEffectivePlanType(profile?.planType || "FREE", subscription?.status);
    const plan = PLAN_LIMITS[planType];

    const data = {
      ...request,
      totalResponses,
      clientEmail: plan.canSeeEmail ? request.clientEmail : null,
      clientPhone: plan.canSeePhone ? request.clientPhone : null,
      planType,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Get request error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const guard = await requireActiveProvider();
    if (!guard.authorized) return guard.response;

    const body = await req.json();
    const parsed = responseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: (parsed.error.issues?.[0]?.message || "Validacijos klaida") }, { status: 400 });
    }

    // Check plan limits (billing-aware)
    const [profile, subscription] = await Promise.all([
      prisma.providerProfile.findUnique({ where: { userId: guard.userId } }),
      prisma.subscription.findUnique({ where: { userId: guard.userId }, select: { status: true } }),
    ]);
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
      where: { requestId: params.id, providerId: guard.userId },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: "Jau atsakėte į šią užklausą" }, { status: 400 });
    }

    const request = await prisma.serviceRequest.findUnique({ where: { id: params.id } });
    if (!request) {
      return NextResponse.json({ success: false, error: "Užklausa nerasta" }, { status: 404 });
    }

    if (request.status !== "OPEN") {
      return NextResponse.json({ success: false, error: "Ši užklausa nebepriima naujų pasiūlymų" }, { status: 400 });
    }

    const response = await prisma.response.create({
      data: {
        requestId: params.id,
        providerId: guard.userId,
        message: sanitizeHtml(parsed.data.message),
        price: parsed.data.price || null,
      },
    });

    // Send email to client (use tracking token, not internal ID)
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
