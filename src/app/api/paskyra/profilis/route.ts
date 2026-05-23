import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhoneNumber } from "@/lib/phone";
import { sanitizeHtml } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Vardas turi būti bent 2 simbolių").max(100),
  phone: z
    .string()
    .trim()
    .max(30, "Telefono numeris per ilgas")
    .optional()
    .default("")
    .refine(
      (value) => value.length === 0 || value.length >= 6,
      "Nurodykite telefono numerį",
    ),
});

const userSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  emailVerified: true,
  phoneVerifiedAt: true,
  createdAt: true,
  _count: { select: { serviceRequests: true } },
} as const;

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Prisijunkite" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: userSelect,
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Profilis nerastas" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Get client profile error:", error);
    return NextResponse.json({ success: false, error: "Nepavyko gauti profilio" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Prisijunkite" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Patikrinkite duomenis" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { phone: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Profilis nerastas" }, { status: 404 });
    }

    const rawPhone = parsed.data.phone ?? "";
    let phone: string | null = null;
    if (rawPhone.length > 0) {
      phone = normalizePhoneNumber(rawPhone);
      if (!phone) {
        return NextResponse.json(
          { success: false, error: "Įveskite numerį tarptautiniu formatu, pvz. +3706..." },
          { status: 400 },
        );
      }
    }

    const phoneChanged = (existing.phone ?? null) !== phone;

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: sanitizeHtml(parsed.data.name),
        phone: phone ? sanitizeHtml(phone) : null,
        phoneVerifiedAt: phoneChanged ? null : undefined,
      },
      select: userSelect,
    });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Update client profile error:", error);
    return NextResponse.json({ success: false, error: "Nepavyko išsaugoti profilio" }, { status: 500 });
  }
}
