import crypto from "crypto";
import { after } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { serviceRequestV2Schema } from "@/lib/validations";
import { sendEmail, requestConfirmationEmail } from "@/lib/email";
import { notifyRelevantProviders } from "@/lib/request-notifications";
import { normalizePhoneNumber } from "@/lib/phone";
import { PHONE_VERIFICATION_VALID_MS } from "@/lib/phone-verification";
import { sanitizeHtml } from "@/lib/sanitize";
import { moderateText, moderateImages, mergeModeration } from "@/lib/moderation";
import { isPlaceholderTelegramEmail } from "./link-user";
import { runShadowRouting } from "@/lib/routing/shadow";
import { getCanonicalServiceCategoryRowsById } from "@/lib/service-categories";

const VERIFICATION_VALID_MS = 60 * 60 * 1000;

export interface CreateServiceRequestInput {
  title: string;
  description: string;
  categoryIds: string[];
  location?: string;
  budget?: string;
  deadline?: string;
  attachmentUrls?: string[];
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientId?: string | null;
  source?: "web" | "telegram";
  contactPreVerified?: boolean; // skip email/phone verification-record checks
}

export type CreateServiceRequestResult =
  | { ok: true; trackingToken: string; moderationStatus: "APPROVED" | "PENDING" }
  | {
      ok: false;
      code:
        | "VALIDATION"
        | "CONTACT_UNVERIFIED"
        | "CATEGORY_INVALID"
        | "MODERATION_REJECTED"
        | "RATE_LIMITED"
        | "ERROR";
      message: string;
    };

/**
 * Shared core for publishing a service request ("užklausa"). Used by the web
 * form route (source "web") and the Telegram bot (source "telegram").
 *
 * Caller responsibilities (NOT handled here):
 * - IP rate limiting and honeypot — web-form concerns owned by the route.
 * - Identity assertion: pass `clientId` only when the caller has verified the
 *   account owns `clientEmail`/`clientPhone`. A present `clientId` is treated
 *   as account-verified, mirroring the original route's `verifiedViaAccount`.
 *
 * When `contactPreVerified` is true (Telegram already verified the phone) the
 * email/phone verification-record lookups are skipped, but moderation and
 * category validation still run.
 */
export async function createServiceRequest(
  input: CreateServiceRequestInput,
): Promise<CreateServiceRequestResult> {
  try {
    const parsed = serviceRequestV2Schema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        code: "VALIDATION",
        message: parsed.error.issues?.[0]?.message || "Validacijos klaida",
      };
    }
    const data = parsed.data;

    const rawPhone = data.clientPhone?.trim() ?? "";
    const phone = rawPhone ? normalizePhoneNumber(rawPhone) : null;
    if (rawPhone && !phone) {
      return {
        ok: false,
        code: "VALIDATION",
        message: "Patikrinkite telefono numerį, pvz. +3706...",
      };
    }

    const email = data.clientEmail.trim().toLowerCase();
    const clientId = input.clientId ?? null;
    const contactPreVerified = input.contactPreVerified ?? false;

    // A present clientId means the caller asserted the account owns this
    // contact (web: session email matched). Such accounts skip the
    // verification-record lookup, exactly as the original route did.
    let consumeVerification = false;
    if (!contactPreVerified && !clientId) {
      const verification = await prisma.requestEmailVerification.findUnique({
        where: { email },
        select: { verifiedAt: true },
      });
      const verified =
        !!verification?.verifiedAt &&
        verification.verifiedAt.getTime() > Date.now() - VERIFICATION_VALID_MS;
      if (!verified) {
        return {
          ok: false,
          code: "CONTACT_UNVERIFIED",
          message: "Patvirtinkite el. paštą prieš skelbdami.",
        };
      }
      consumeVerification = true;
    }

    let consumePhoneVerification = false;
    if (phone && !contactPreVerified) {
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
          return {
            ok: false,
            code: "CONTACT_UNVERIFIED",
            message: "Patvirtinkite telefono numerį prieš skelbdami.",
          };
        }
        consumePhoneVerification = true;
      }
    }

    const uniqueCategoryIds = Array.from(new Set(data.categoryIds));
    const categoryRows = await getCanonicalServiceCategoryRowsById(uniqueCategoryIds);
    if (categoryRows.length !== uniqueCategoryIds.length) {
      return {
        ok: false,
        code: "CATEGORY_INVALID",
        message: "Viena ar daugiau kategorijų nerasta",
      };
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
      return {
        ok: false,
        code: "MODERATION_REJECTED",
        message:
          moderation.userMessage ??
          "Skelbime aptikta netinkamo turinio. Pataisykite ir bandykite dar kartą.",
      };
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
        source: input.source === "telegram" ? "telegram" : "web",
        trackingToken: crypto.randomBytes(32).toString("hex"),
      },
      select: {
        id: true,
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
      // Detached after the response: scheduling via `after()` lets Vercel keep the
      // function alive (waitUntil) until this settles, instead of freezing it the
      // moment the response is sent — which silently dropped notifications.
      after(() =>
        notifyRelevantProviders(
          request.title,
          orderedCategories.map((cat) => cat.id),
          notifyLocation,
          clientId,
        ).catch((error) => console.error("Provider notification error:", error)),
      );
    }

    // ── Phase 1 SHADOW ROUTING (multi-routing v4) ──────────────────────────
    // Compute v4 routing in parallel for OFF-LINE comparison only. This does
    // NOT notify providers, change lead visibility, or touch payments. It is
    // gated by ROUTING_SHADOW_ENABLED (default off) and fully error-isolated,
    // so production behavior is unchanged unless explicitly enabled. Runs for
    // every created request (incl. PENDING), unlike the APPROVED-only push.
    //
    // Scheduled via `after()` so it survives the serverless response: a detached
    // fire-and-forget promise was being killed by the Vercel function freeze once
    // the response was sent, so the RoutingDecisionLog row never got written.
    // `after()` extends the invocation (waitUntil) until this settles.
    after(() =>
      runShadowRouting({
        requestId: request.id,
        title: data.title,
        description: data.description,
        city: locationValue,
        status: "OPEN",
        oldPrimaryCategoryId: primaryCategory.id,
        oldCategoryIds: orderedCategories.map((cat) => cat.id),
      }).catch((error) => console.error("Shadow routing dispatch error:", error)),
    );

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

    // Telegram-only accounts carry a non-deliverable placeholder address; never
    // attempt confirmation mail to those (it would bounce). Real emails — every
    // web submission — are mailed exactly as before.
    if (!isPlaceholderTelegramEmail(email)) {
      await sendEmail({
        to: email,
        ...requestConfirmationEmail(data.clientName, request.trackingToken),
      });
    }

    return { ok: true, trackingToken: request.trackingToken, moderationStatus };
  } catch (error) {
    console.error("createServiceRequest error:", error);
    return { ok: false, code: "ERROR", message: "Nepavyko sukurti užklausos" };
  }
}
