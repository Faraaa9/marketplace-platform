import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import { serviceRequestV2Schema } from "@/lib/validations";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import { createServiceRequest, type CreateServiceRequestResult } from "@/lib/service-requests/create";

// HTTP status for each failure code, matching the pre-refactor route responses.
const ERROR_STATUS: Record<
  Exclude<CreateServiceRequestResult, { ok: true }>["code"],
  number
> = {
  VALIDATION: 400,
  CONTACT_UNVERIFIED: 403,
  CATEGORY_INVALID: 400,
  MODERATION_REJECTED: 422,
  RATE_LIMITED: 429,
  ERROR: 500,
};

/**
 * Publish endpoint for /uzklausos/nauja. Request-creation logic lives in
 * `createServiceRequest` (shared with the Telegram bot); this handler owns the
 * web-only concerns: IP rate limiting, the honeypot, and turning the NextAuth
 * session into a verified `clientId`.
 */
export async function POST(req: NextRequest) {
  await connection();
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
    const parsed = serviceRequestV2Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues?.[0]?.message || "Validacijos klaida" },
        { status: 400 },
      );
    }
    const data = parsed.data;

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
    // Account-verified only when the logged-in session owns this email; passed
    // as clientId so the core treats it as verified-via-account.
    const clientId = !!userId && sessionEmail === email ? userId : null;

    const result = await createServiceRequest({
      title: data.title,
      description: data.description,
      categoryIds: data.categoryIds,
      location: data.location || undefined,
      budget: data.budget || undefined,
      deadline: data.deadline || undefined,
      attachmentUrls: data.attachmentUrls,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone || undefined,
      clientId,
      source: "web",
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: ERROR_STATUS[result.code] },
      );
    }

    return NextResponse.json({
      success: true,
      data: { trackingToken: result.trackingToken },
    });
  } catch (error) {
    console.error("Create request v2 error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko sukurti užklausos" },
      { status: 500 },
    );
  }
}
