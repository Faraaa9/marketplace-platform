import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";

/**
 * POST /api/requests/create-account
 * Creates an account straight from a verified guest request: the request's
 * email is already proven (contactVerifiedAt), so the account is created
 * pre-verified — no second email confirmation — and every guest request with
 * that email is attached to it.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimitAsync(`auth:create-account:${ip}`, RATE_LIMITS.auth);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Bandykite vėliau." },
        { status: 429 },
      );
    }

    const body = await req.json();
    const { trackingToken, password } = body;

    if (!trackingToken || typeof trackingToken !== "string") {
      return NextResponse.json(
        { success: false, error: "Trūksta sekimo kodo" },
        { status: 400 },
      );
    }
    if (typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Slaptažodis turi būti bent 8 simbolių" },
        { status: 400 },
      );
    }

    const request = await prisma.serviceRequest.findUnique({
      where: { trackingToken },
      select: { contactVerifiedAt: true, clientEmail: true, clientName: true },
    });
    if (!request) {
      return NextResponse.json(
        { success: false, error: "Užklausa nerasta" },
        { status: 404 },
      );
    }

    // The request's email must already be verified — that is the proof of ownership.
    if (!request.contactVerifiedAt) {
      return NextResponse.json(
        { success: false, error: "Pirmiausia patvirtinkite el. paštą" },
        { status: 403 },
      );
    }

    const email = request.clientEmail.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Su šiuo el. paštu paskyra jau yra — prisijunkite.",
          code: "ACCOUNT_EXISTS",
        },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        name: request.clientName,
        password: hashedPassword,
        role: "CLIENT",
        // Email already proven via the verified request — skip re-verification.
        emailVerified: new Date(),
      },
      select: { id: true },
    });

    // Attach every guest request made with this email to the new account.
    await prisma.serviceRequest.updateMany({
      where: {
        clientEmail: { equals: email, mode: "insensitive" },
        clientId: null,
      },
      data: { clientId: user.id },
    });

    return NextResponse.json({ success: true, data: { email } });
  } catch (error) {
    console.error("Create account from request error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko sukurti paskyros" },
      { status: 500 },
    );
  }
}
