import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serviceRequestSchema } from "@/lib/validations";
import { sendEmail, requestVerificationEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import { sanitizeHtml } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimitAsync(`requests:create:${ip}`, RATE_LIMITS.requests);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Bandykite vėliau." },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    const isLoggedIn = !!session?.user?.id;

    const body = await req.json();
    const parsed = serviceRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: (parsed.error.issues?.[0]?.message || "Validacijos klaida") }, { status: 400 });
    }

    const data = parsed.data;
    const title = sanitizeHtml(data.title);
    const description = sanitizeHtml(data.description);
    const { category, location, budget, clientName, clientEmail, clientPhone, createAccount, password } = data;

    let clientId: string | undefined;

    if (isLoggedIn) {
      // Logged-in user — attach request to their account directly
      clientId = session.user.id;
    } else if (createAccount && password) {
      // Guest opting to create account
      const existing = await prisma.user.findUnique({ where: { email: clientEmail } });
      if (existing) {
        return NextResponse.json(
          { success: false, error: "Šis el. paštas jau užregistruotas. Prisijunkite prie paskyros arba pateikite užklausą be paskyros kūrimo." },
          { status: 409 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          email: clientEmail,
          name: clientName,
          password: hashedPassword,
          role: "CLIENT",
        },
      });
      clientId = user.id;
    }

    // Generate a secure tracking token (32 bytes hex = 64 chars, unguessable)
    const trackingToken = crypto.randomBytes(32).toString("hex");

    const verificationToken = crypto.randomBytes(32).toString("hex");

    const request = await prisma.serviceRequest.create({
      data: {
        title,
        description,
        category,
        location,
        budget: budget || null,
        status: "PENDING_CONFIRMATION",
        clientEmail,
        clientName,
        clientPhone: clientPhone || null,
        clientId: clientId || null,
        trackingToken,
        requestVerificationToken: verificationToken,
        requestVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Send verification email; providers are notified only after confirmation.
    const emailData = requestVerificationEmail(clientName, verificationToken, request.trackingToken);
    await sendEmail({ to: clientEmail, ...emailData });

    // Return tracking token to redirect the user
    return NextResponse.json({ success: true, data: { trackingToken: request.trackingToken } });
  } catch (error) {
    console.error("Create request error:", error);
    return NextResponse.json({ success: false, error: "Nepavyko sukurti užklausos" }, { status: 500 });
  }
}
