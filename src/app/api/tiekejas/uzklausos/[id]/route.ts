import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { activeCategoryFilter } from "@/lib/category-matching";
import { responseSchema } from "@/lib/validations";
import { sendEmail, newResponseEmail } from "@/lib/email";
import { buildReplyAddress } from "@/lib/inbound-email";
import { isLeadUnlocked } from "@/lib/credits";
import { sanitizeHtml } from "@/lib/sanitize";
import { requireActiveProvider } from "@/lib/provider-guard";
import { rateLimitAsync, RATE_LIMITS } from "@/lib/rate-limit";
import { checkEligibility } from "@/lib/provider-eligibility";
import { activeCategoryFilter } from "@/lib/category-matching";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connection();
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
        categoryRef: { select: { id: true, rootId: true, parentId: true } },
        categories: { select: { category: { select: { id: true, rootId: true, parentId: true } } } },
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
        // Same shape as unlock: without parentId a provider who paid to unlock a
        // lead filed under their service's subcategory was refused here.
        categories: {
          where: activeCategoryFilter(),
          select: { category: { select: { id: true, rootId: true, parentId: true } } },
        },
      },
    });
    const providerCategories = (profile?.categories ?? []).map((c) => c.category);
    const eligibility = checkEligibility(
      guard.userId,
      { status: request.status, clientId: request.clientId, category: request.categoryRef, categories: request.categories },
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
