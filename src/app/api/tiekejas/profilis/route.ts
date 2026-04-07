import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { providerProfileSchema } from "@/lib/validations";
import { sanitizeHtml } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROVIDER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
    });

    // Parse JSON strings for client
    const data = profile ? {
      ...profile,
      specializations: JSON.parse(profile.specializations || "[]"),
      images: JSON.parse(profile.images || "[]"),
    } : null;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "PROVIDER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = providerProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: (parsed.error.issues?.[0]?.message || "Validacijos klaida") }, { status: 400 });
    }

    const profile = await prisma.providerProfile.update({
      where: { userId: session.user.id },
      data: {
        description: sanitizeHtml(parsed.data.description),
        specializations: JSON.stringify(parsed.data.specializations),
        location: parsed.data.location,
        phone: parsed.data.phone || null,
        website: parsed.data.website || null,
      },
    });

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
