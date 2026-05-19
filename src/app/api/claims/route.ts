import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import * as claimService from "@/lib/imported/claim-service";
import { ClaimErrors } from "@/lib/imported/claim-service";
import { sendEmail, claimVerificationEmail } from "@/lib/email";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// ── V1 allowed methods ──────────────────────────────────────────────
const V1_METHODS = ["email", "manual"] as const;

const createClaimSchema = z.object({
  supplierSlug: z.string().min(1, "supplierSlug privalomas"),
  requestedByEmail: z.string().email("Neteisingas el. pašto adresas"),
  verificationMethod: z.enum(V1_METHODS, {
    error: `verificationMethod turi būti: ${V1_METHODS.join(", ")}`,
  }),
  submittedEvidenceJson: z.string().optional(),
});

// ── Error → HTTP status mapping ─────────────────────────────────────
function errorToStatus(code: string): number {
  switch (code) {
    case ClaimErrors.SUPPLIER_NOT_FOUND:
      return 404;
    case ClaimErrors.CLAIM_EXISTS:
    case ClaimErrors.NOT_CLAIMABLE:
      return 409;
    default:
      return 400;
  }
}

/**
 * POST /api/claims — create a new claim request.
 * If method is "email", sends a verification email with a one-time link.
 * Raw token is never returned in the response body.
 */
export async function POST(req: NextRequest) {
  try {
    // ── Rate limit by IP ──────────────────────────────────────────
    const ip = getClientIp(req);
    const ipLimit = await rateLimitAsync(`claim:ip:${ip}`, RATE_LIMITS.requests);
    if (!ipLimit.success) {
      return NextResponse.json(
        { success: false, error: "Per daug užklausų. Bandykite vėliau.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    // ── Parse & validate body ─────────────────────────────────────
    const raw = await req.json().catch(() => null);
    if (!raw) {
      return NextResponse.json(
        { success: false, error: "Neteisingas užklausos formatas", code: "INVALID_BODY" },
        { status: 400 }
      );
    }

    const parsed = createClaimSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return NextResponse.json(
        { success: false, error: firstError.message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { supplierSlug, verificationMethod, submittedEvidenceJson } = parsed.data;
    const requestedByEmail = parsed.data.requestedByEmail.trim().toLowerCase();

    // ── Rate limit by supplier + email combo ──────────────────────
    const comboLimit = await rateLimitAsync(
      `claim:combo:${supplierSlug}:${requestedByEmail}`,
      { maxRequests: 3, windowMs: 60 * 60 * 1000 } // 3 per hour per supplier+email
    );
    if (!comboLimit.success) {
      return NextResponse.json(
        { success: false, error: "Jau pateikėte prašymą šiam tiekėjui. Bandykite vėliau.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    // ── Attach userId if logged in ────────────────────────────────
    let requestedByUserId: string | undefined;
    const session = await getServerSession(authOptions);
    if (session?.user?.id && session.user.role !== "ADMIN") {
      requestedByUserId = session.user.id;
    }

    // ── Create claim ──────────────────────────────────────────────
    const result = await claimService.createClaim({
      supplierSlug,
      requestedByEmail,
      verificationMethod,
      submittedEvidenceJson,
      requestedByUserId,
    });

    if ("error" in result) {
      return NextResponse.json(
        { success: false, error: result.message, code: result.error },
        { status: errorToStatus(result.error) }
      );
    }

    // ── Send verification email (email method only) ───────────────
    if (verificationMethod === "email") {
      const supplierName = result.claim.supplier?.displayName ?? supplierSlug;
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const verifyUrl = `${baseUrl}/claim/verify?token=${encodeURIComponent(result.token)}`;
      const emailContent = claimVerificationEmail(supplierName, verifyUrl);

      const emailResult = await sendEmail({
        to: requestedByEmail,
        subject: emailContent.subject,
        html: emailContent.html,
      });

      if (!emailResult.success) {
        console.error("Failed to send claim verification email:", emailResult.error);
      }

      return NextResponse.json(
        {
          success: true,
          data: { claim: result.claim },
          message: "Prašymas sukurtas. Patikrinkite el. paštą, patvirtinkite nuorodą ir susikurkite prisijungimą su slaptažodžiu.",
        },
        { status: 201 }
      );
    }

    // ── Manual method — no email, admin reviews directly ──────────
    return NextResponse.json(
      {
        success: true,
        data: { claim: result.claim },
        message: "Prašymas sukurtas. Administratorius peržiūrės jūsų prašymą artimiausiu metu.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/claims error:", error);
    return NextResponse.json(
      { success: false, error: "Vidinė serverio klaida", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/claims?id=xyz — get claim by ID (admin only).
 * GET /api/claims?stats=1 — get claim stats (admin only).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;

    if (searchParams.get("stats") === "1") {
      const stats = await claimService.getStats();
      return NextResponse.json({ success: true, data: stats });
    }

    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "id parametras privalomas", code: "MISSING_PARAM" },
        { status: 400 }
      );
    }

    const claim = await claimService.getClaimById(id);
    if (!claim) {
      return NextResponse.json(
        { success: false, error: "Prašymas nerastas", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: claim });
  } catch (error) {
    console.error("GET /api/claims error:", error);
    return NextResponse.json(
      { success: false, error: "Vidinė serverio klaida", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
