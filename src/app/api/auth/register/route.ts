import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchemaBase } from "@/lib/validations";
import { rateLimit, RATE_LIMITS, getClientIp } from "@/lib/rate-limit";
import { sendEmail, emailVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = rateLimit(`auth:register:${ip}`, RATE_LIMITS.auth);
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

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Šis el. paštas jau registruotas" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "CLIENT",
        emailVerified: null,
      },
    });

    // Send verification email
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.emailVerificationToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const emailData = emailVerificationEmail(name || "Vartotojas", token);
    await sendEmail({ to: email, ...emailData });

    return NextResponse.json({ success: true, data: { id: user.id, email: user.email } });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ success: false, error: "Registracija nepavyko" }, { status: 500 });
  }
}
