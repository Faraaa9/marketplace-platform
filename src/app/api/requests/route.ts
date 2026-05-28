import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { revalidateTag } from "next/cache";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serviceRequestV2Schema } from "@/lib/validations";
import { sendEmail, requestConfirmationEmail } from "@/lib/email";
import { notifyRelevantProviders } from "@/lib/request-notifications";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import { normalizePhoneNumber } from "@/lib/phone";
import { PHONE_VERIFICATION_VALID_MS } from "@/lib/phone-verification";
import { sanitizeHtml } from "@/lib/sanitize";
import { moderateText, moderateImages, mergeModeration } from "@/lib/moderation";

const VERIFICATION_VALID_MS = 60 * 60 * 1000;

/**
 * Publish endpoint for /uzklausos/nauja. Notes:
 * - location / budget / deadline are optional in the input schema
 * - empty location is stored as "" (DB column is NOT NULL) but mapped to
 *   "Visa Lietuva" for the provider notifier so unfiltered requests still
 *   reach providers in the matched category.
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
    const rawPhone = data.clientPhone?.trim() ?? "";
    const phone = rawPhone ? normalizePhoneNumber(rawPhone) : null;
    if (rawPhone && !phone) {
      return NextResponse.json(
        { success: false, error: "Patikrinkite telefono numerį, pvz. +3706..." },
        { status: 400 },
      );
    }

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

    const verifiedViaAccount = !!userId && sessionEmail === email;
    let consumeVerification = false;
    if (!verifiedViaAccount) {
      const verification = await prisma.requestEmailVerification.findUnique({
        where: { email },
        select: { verifiedAt: true },
      });
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
    let consumePhoneVerification = false;

    if (phone) {
      let verifiedViaAccountPhone = false;
      if (clientId) {
        const user = await prisma.user.findUnique({
          where: { id: clientId },
          select: { phone: true, phoneVerifiedAt: true },
        });
        verifiedViaAccountPhone = user?.phone === phone && !!user.phoneVerifiedAt;
      }

      if (!verifiedViaAccountPhone) {
        const phoneVerification = await prisma.phoneVerification.findUnique({
          where: { phone },
          select: { verifiedAt: true },
        });
        const phoneVerified =
          !!phoneVerification?.verifiedAt &&
          phoneVerification.verifiedAt.getTime() > Date.now() - PHONE_VERIFICATION_VALID_MS;
        if (!phoneVerified) {
          return NextResponse.json(
            { success: false, error: "Patvirtinkite telefono numerį prieš skelbdami." },
            { status: 403 },
          );
        }
        consumePhoneVerification = true;
      }
    }

    const uniqueCategoryIds = Array.from(new Set(data.categoryIds));
    const categoryRows = await prisma.category.findMany({
      where: { id: { in: uniqueCategoryIds } },
      select: { id: true, slug: true },
    });
    if (categoryRows.length !== uniqueCategoryIds.length) {
      return NextResponse.json(
        { success: false, error: "Viena ar daugiau kategorijų nerasta" },
        { status: 400 },
      );
    }
    const orderedCategories = uniqueCategoryIds.map(
      (id) => categoryRows.find((row) => row.id === id)!,
    );
    const primaryCategory = orderedCategories[0];

    const locationValue = (data.location ?? "").trim();
    const budgetValue = (data.budget ?? "").trim();
    const deadlineValue = (data.deadline ?? "").trim();

    const [textModeration, imageModeration] = await Promise.all([
      moderateText({
        entityType: "ServiceRequest",
        fields: {
          title: data.title,
          description: data.description,
          budget: budgetValue,
          deadline: deadlineValue,
        },
        actorUserId: clientId,
      }),
      moderateImages({
        entityType: "ServiceRequest",
        imageUrls: data.attachmentUrls ?? [],
        actorUserId: clientId,
      }),
    ]);
    const moderation = mergeModeration(textModeration, imageModeration);
    if (moderation.verdict === "reject") {
      return NextResponse.json(
        {
          success: false,
          error:
            moderation.userMessage ??
            "Skelbime aptikta netinkamo turinio. Pataisykite ir bandykite dar kartą.",
        },
        { status: 422 },
      );
    }
    const moderationStatus = moderation.verdict === "ok" ? "APPROVED" : "PENDING";

    const request = await prisma.serviceRequest.create({
      data: {
        title: sanitizeHtml(data.title),
        description: sanitizeHtml(data.description),
        category: primaryCategory.slug,
        categoryId: primaryCategory.id,
        categories: {
          create: orderedCategories.map((cat, index) => ({
            categoryId: cat.id,
            sortOrder: index,
          })),
        },
        location: locationValue,
        budget: budgetValue ? sanitizeHtml(budgetValue) : null,
        deadline: deadlineValue ? sanitizeHtml(deadlineValue) : null,
        attachmentUrls: data.attachmentUrls ?? [],
        status: "OPEN",
        moderationStatus,
        moderationReason: moderation.reason,
        moderatedAt: new Date(),
        contactVerifiedAt: new Date(),
        clientEmail: email,
        clientName: data.clientName,
        clientPhone: phone ? sanitizeHtml(phone) : null,
        clientId,
        trackingToken: crypto.randomBytes(32).toString("hex"),
      },
      select: {
        title: true,
        categoryId: true,
        location: true,
        trackingToken: true,
      },
    });

    if (clientId && phone) {
      await prisma.user.update({
        where: { id: clientId },
        data: { phone: sanitizeHtml(phone), phoneVerifiedAt: new Date() },
        select: { id: true },
      });
    }

    if (consumeVerification) {
      await prisma.requestEmailVerification.delete({ where: { email } }).catch(() => {});
    }
    if (consumePhoneVerification && phone) {
      await prisma.phoneVerification.delete({ where: { phone } }).catch(() => {});
    }

    const isPublished = moderationStatus === "APPROVED";

    if (isPublished) {
      revalidateTag("requests", { expire: 0 });
      // Empty location → treat as "Visa Lietuva" for matching so providers
      // still get notified (the notifier's exact-string match would otherwise
      // skip everyone). The DB row keeps the empty value to reflect what the
      // client actually entered.
      const notifyLocation = request.location.trim() || "Visa Lietuva";
      notifyRelevantProviders(
        request.title,
        orderedCategories.map((cat) => cat.id),
        notifyLocation,
        clientId,
      ).catch((error) => console.error("Provider notification error:", error));
    }

    if (clientId) {
      await prisma.notification.create({
        data: {
          userId: clientId,
          type: isPublished ? "REQUEST_ACTIVATED" : "REQUEST_PENDING_REVIEW",
          title: isPublished ? "Užklausa paskelbta" : "Užklausa peržiūrima",
          body: isPublished
            ? `Jūsų užklausa „${request.title}" paskelbta ir perduota tiekėjams.`
            : `Jūsų užklausa „${request.title}" gauta ir bus paskelbta po peržiūros.`,
          link: "/paskyra/uzklausos",
        },
        select: { id: true },
      });
    }

    await sendEmail({
      to: email,
      ...requestConfirmationEmail(data.clientName, request.trackingToken),
    });

    return NextResponse.json({
      success: true,
      data: { trackingToken: request.trackingToken },
    });
  } catch (error) {
    console.error("Create request v2 error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko sukurti užklausos" },
      { status: 500 },
    );
  }
}
