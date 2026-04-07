import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.omit({ confirmPassword: true }).safeParse(body);

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
        role: "PROVIDER",
        providerProfile: {
          create: {
            specializations: "[]",
            images: "[]",
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: { id: user.id, email: user.email } });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ success: false, error: "Registracija nepavyko" }, { status: 500 });
  }
}
