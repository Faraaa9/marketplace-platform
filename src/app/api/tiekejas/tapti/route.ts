import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/tiekejas/tapti
 * Converts a CLIENT user into a PROVIDER by creating a providerProfile
 * and updating the user role. Idempotent — safe to call if already a provider.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Prisijunkite" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Vartotojas nerastas" },
        { status: 404 }
      );
    }

    if (user.role === "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Administratorius negali būti perjungtas į tiekėjo rolę" },
        { status: 403 }
      );
    }

    // Check if already has provider profile
    const existing = await prisma.providerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (existing) {
      // Already a provider — ensure role is set correctly
      await prisma.user.update({
        where: { id: userId },
        data: { role: "PROVIDER" },
      });
      return NextResponse.json({ success: true, data: { alreadyProvider: true } });
    }

    // Create provider profile and update role in a transaction
    await prisma.$transaction([
      prisma.providerProfile.create({
        data: {
          userId,
          specializations: [],
          images: [],
          isActive: !!user?.emailVerified,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { role: "PROVIDER" },
      }),
    ]);

    return NextResponse.json({ success: true, data: { alreadyProvider: false } });
  } catch (error) {
    console.error("Become provider error:", error);
    return NextResponse.json(
      { success: false, error: "Nepavyko tapti tiekėju" },
      { status: 500 }
    );
  }
}
