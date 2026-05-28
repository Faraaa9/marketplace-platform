import { NextRequest, NextResponse, connection } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { sendEmail, requestVerificationEmail } from "@/lib/email";


export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  await connection();
  try {
    const { token } = await params;
    const ip = getClientIp(req);
    const rl = await rateLimitAsync(`request-resend:${ip}:${token}`, { maxRequests: 3, windowMs: 15 * 60 * 1000 });
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Bandykite vėliau." },
        { status: 429 }
      );
    }

    const request = await prisma.serviceRequest.findUnique({
      where: { trackingToken: token },
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

    const emailData = requestVerificationEmail(request.clientName, verificationToken, token);
    const emailResult = await sendEmail({ to: request.clientEmail, ...emailData });

    if (!emailResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Užklausa sukurta, bet nepavyko išsiųsti patvirtinimo laiško. Bandykite dar kartą.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true, data: { mock: !!emailResult.mock } });
  } catch (error) {
    console.error("Resend request confirmation error:", error);
    return NextResponse.json({ success: false, error: "Klaida siunčiant patvirtinimo laišką" }, { status: 500 });
  }
}
