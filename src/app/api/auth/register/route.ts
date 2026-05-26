import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchemaBase } from "@/lib/validations";
import { rateLimitAsync, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import { sendEmail, emailVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimitAsync(`auth:register:${ip}`, RATE_LIMITS.auth);
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Per daug bandymų. Bandykite vėliau." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = registerSchemaBase.omit({ confirmPassword: true }).safeParse(body);

    if (!parsed.success) {
      const issues = parsed.error.issues || [];
      return NextResponse.json({ success: false, error: issues[0]?.message || "Validacijos klaida" }, { status: 400 });
    }

    const { name, password } = parsed.data;
    const email = parsed.data.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: "Šis el. paštas jau registruotas" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const token = crypto.randomBytes(32).toString("hex");
    const signinToken = crypto.randomBytes(32).toString("hex");

    // Atomic: user + both tokens succeed together, or nothing persists.
    // Without this, a mid-flow failure (e.g. missing table) left orphan users
    // that blocked re-registration with "el. paštas jau registruotas".
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: "CLIENT",
          emailVerified: null,
        },
        select: { id: true, email: true },
      });

      await tx.emailVerificationToken.create({
        data: {
          token,
          userId: created.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // One-time signin token — lives only in this browser tab, lets it
      // auto-login once email is verified without re-asking for the password.
      await tx.pendingSignInToken.create({
        data: {
          token: signinToken,
          userId: created.id,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      });

      return created;
    });

    const emailData = emailVerificationEmail(name || "Vartotojas", token);
    const emailResult = await sendEmail({ to: email, ...emailData });

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        emailSent: emailResult.success,
        emailMock: !!emailResult.mock,
        signinToken,
      },
      warning: emailResult.success
        ? null
        : "Paskyra sukurta, bet nepavyko išsiųsti patvirtinimo laiško. Galite pabandyti dar kartą patvirtinimo puslapyje.",
    });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ success: false, error: "Registracija nepavyko" }, { status: 500 });
  }
}
