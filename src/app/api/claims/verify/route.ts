import { NextRequest, NextResponse } from "next/server";
import * as claimService from "@/lib/imported/claim-service";
import { ClaimErrors } from "@/lib/imported/claim-service";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// ── Lithuanian user-facing messages per error code ───────────────────
function errorMessage(code: string): string {
  switch (code) {
    case ClaimErrors.MISSING_TOKEN:
      return "Trūksta patvirtinimo žetono.";
    case ClaimErrors.INVALID_TOKEN:
      return "Neteisingas arba nerastas žetonas.";
    case ClaimErrors.EXPIRED_TOKEN:
      return "Šis patvirtinimo žetonas nebegalioja. Pateikite naują prašymą.";
    case ClaimErrors.ALREADY_VERIFIED:
      return "El. paštas jau patvirtintas. Prisijunkite arba susikurkite paskyrą tuo pačiu el. paštu.";
    case ClaimErrors.INVALID_STATUS:
      return "Šis prašymas nebegali būti patvirtintas.";
    default:
      return "Patvirtinimas nepavyko. Bandykite dar kartą.";
  }
}

function errorToStatus(code: string): number {
  switch (code) {
    case ClaimErrors.INVALID_TOKEN:
    case ClaimErrors.MISSING_TOKEN:
      return 400;
    case ClaimErrors.EXPIRED_TOKEN:
      return 410;
    case ClaimErrors.ALREADY_VERIFIED:
      return 409;
    case ClaimErrors.INVALID_STATUS:
      return 409;
    default:
      return 400;
  }
}

async function verifyClaimToken(token: string | null, req: NextRequest) {
  // Rate limit verify attempts by IP
  const ip = getClientIp(req);
  const limit = await rateLimitAsync(`claim-verify:ip:${ip}`, { maxRequests: 15, windowMs: 15 * 60 * 1000 });
  if (!limit.success) {
    return NextResponse.json(
      { success: false, error: "Per daug bandymų. Palaukite ir bandykite vėliau.", code: "RATE_LIMITED" },
      { status: 429 }
    );
  }

  if (!token) {
    return NextResponse.json(
      { success: false, error: errorMessage(ClaimErrors.MISSING_TOKEN), code: ClaimErrors.MISSING_TOKEN },
      { status: 400 }
    );
  }

  const result = await claimService.verifyToken(token);

  if ("error" in result) {
    return NextResponse.json(
      { success: false, error: errorMessage(result.error), code: result.error },
      { status: errorToStatus(result.error) }
    );
  }

  return NextResponse.json({
    success: true,
    data: { claim: result.claim },
    message: "El. paštas sėkmingai patvirtintas. Kitas žingsnis — prisijungti arba susikurti paskyrą tuo pačiu el. paštu.",
  });
}

/**
 * GET /api/claims/verify?token=xxx — verify via link click from email.
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    return await verifyClaimToken(token, req);
  } catch (error) {
    console.error("GET /api/claims/verify error:", error);
    return NextResponse.json(
      { success: false, error: "Vidinė serverio klaida", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/claims/verify — verify via JSON body { token }.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token : null;
    return await verifyClaimToken(token, req);
  } catch (error) {
    console.error("POST /api/claims/verify error:", error);
    return NextResponse.json(
      { success: false, error: "Vidinė serverio klaida", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
