import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        new URL("/patvirtinti?status=error", req.url)
      );
    }

    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!verificationToken || verificationToken.expiresAt < new Date()) {
      if (verificationToken) {
        await prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } });
      }
      const redirectUrl = new URL("/patvirtinti?status=expired", req.url);
      if (verificationToken?.user.email) {
        redirectUrl.searchParams.set("email", verificationToken.user.email);
      }
      return NextResponse.redirect(redirectUrl);
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: new Date() },
      }),
      prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } }),
    ]);

    // Auto-activate provider profile if exists (removes onboarding friction)
    await prisma.providerProfile.updateMany({
      where: { userId: verificationToken.userId, isActive: false },
      data: { isActive: true },
    });

    const successUrl = new URL("/patvirtinti?status=success", req.url);
    if (verificationToken.user.email) {
      successUrl.searchParams.set("email", verificationToken.user.email);
    }
    return NextResponse.redirect(successUrl);
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.redirect(
      new URL("/patvirtinti?status=error", req.url)
    );
  }
}
