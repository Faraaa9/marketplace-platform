import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidateTag } from "next/cache";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serviceRequestSchema } from "@/lib/validations";
import { sendEmail, requestConfirmationEmail } from "@/lib/email";
import { notifyRelevantProviders } from "@/lib/request-notifications";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import { sanitizeHtml } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

// A confirmed email code stays valid for publishing for this long.
const VERIFICATION_VALID_MS = 60 * 60 * 1000;

/**
 * Publish a service request. The email must already be verified — either the
 * caller is logged in (account owns its email) or a 6-digit code was confirmed
 * via /api/requests/verify-code. The request goes live (OPEN) immediately.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimitAsync(`requests:create:${ip}`, RATE_LIMITS.requests);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Bandykite vėliau." },
        { status: 429 },
      );
    }

    const session = await getServerSession(authOptions);

    const body = await req.json();
    const parsed = serviceRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues?.[0]?.message || "Validacijos klaida" },
        { status: 400 },
      );
    }
    const data = parsed.data;

    // Honeypot — bots fill this hidden field; humans never see it. Return a
    // plausible fake payload so the bot does not learn the submission failed.
    if (data.honeypot && data.honeypot.trim().length > 0) {
      console.warn("Honeypot triggered from IP:", ip);
      return NextResponse.json({
        success: true,
        data: { trackingToken: "fake-" + crypto.randomBytes(16).toString("hex") },
      });
    }

    const email = data.clientEmail.trim().toLowerCase();
    const userId = session?.user?.id;
    const sessionEmail = session?.user?.email?.toLowerCase();

    // Email gate — a logged-in account owns its address; everyone else must
    // have a confirmed 6-digit code for this exact email.
    const verifiedViaAccount = !!userId && sessionEmail === email;
    let consumeVerification = false;
    if (!verifiedViaAccount) {
      const verification = await prisma.requestEmailVerification.findUnique({ where: { email } });
      const verified =
        !!verification?.verifiedAt &&
        verification.verifiedAt.getTime() > Date.now() - VERIFICATION_VALID_MS;
      if (!verified) {
        return NextResponse.json(
          { success: false, error: "Patvirtinkite el. paštą prieš skelbdami." },
          { status: 403 },
        );
      }
      consumeVerification = true;
    }

    const clientId = verifiedViaAccount && userId ? userId : null;

    const request = await prisma.serviceRequest.create({
      data: {
        title: sanitizeHtml(data.title),
        description: sanitizeHtml(data.description),
        category: data.category,
        location: data.location,
        budget: sanitizeHtml(data.budget),
        deadline: sanitizeHtml(data.deadline),
        attachmentUrls: data.attachmentUrls ?? [],
        status: "OPEN",
        contactVerifiedAt: new Date(),
        clientEmail: email,
        clientName: data.clientName,
        clientPhone: data.clientPhone ? sanitizeHtml(data.clientPhone) : null,
        clientId,
        trackingToken: crypto.randomBytes(32).toString("hex"),
      },
    });

    // One-time use — drop the verification record once consumed.
    if (consumeVerification) {
      await prisma.requestEmailVerification.delete({ where: { email } }).catch(() => {});
    }

    // The request is live immediately — refresh the public request caches now.
    revalidateTag("requests", { expire: 0 });

    if (clientId) {
      await prisma.notification.create({
        data: {
          userId: clientId,
          type: "REQUEST_ACTIVATED",
          title: "Užklausa paskelbta",
          body: `Jūsų užklausa „${request.title}" paskelbta ir perduota tiekėjams.`,
          link: "/paskyra/uzklausos",
        },
      });
    }

    notifyRelevantProviders(request.title, request.category, request.location, clientId).catch(
      (error) => console.error("Provider notification error:", error),
    );

    await sendEmail({
      to: email,
      ...requestConfirmationEmail(data.clientName, request.trackingToken),
    });

    return NextResponse.json({
      success: true,
      data: { trackingToken: request.trackingToken },
    });
  } catch (error) {
    console.error("Create request error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko sukurti užklausos" },
      { status: 500 },
    );
  }
}
