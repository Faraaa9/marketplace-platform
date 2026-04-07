import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sendEmail, requestVerificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const ip = getClientIp(req);
    const rl = rateLimit(`request-resend:${ip}:${params.token}`, { maxRequests: 3, windowMs: 15 * 60 * 1000 });
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Bandykite vėliau." },
        { status: 429 }
      );
    }

    const request = await prisma.serviceRequest.findUnique({
      where: { trackingToken: params.token },
      select: {
        id: true,
        clientName: true,
        clientEmail: true,
        status: true,
      },
    });

    if (!request) {
      return NextResponse.json({ success: false, error: "Užklausa nerasta" }, { status: 404 });
    }

    if (request.status !== "PENDING_CONFIRMATION") {
      return NextResponse.json({ success: true });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");

    await prisma.serviceRequest.update({
      where: { id: request.id },
      data: {
        requestVerificationToken: verificationToken,
        requestVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const emailData = requestVerificationEmail(request.clientName, verificationToken, params.token);
    await sendEmail({ to: request.clientEmail, ...emailData });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resend request confirmation error:", error);
    return NextResponse.json({ success: false, error: "Klaida siunčiant patvirtinimo laišką" }, { status: 500 });
  }
}
