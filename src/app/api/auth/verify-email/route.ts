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
    });

    if (!verificationToken || verificationToken.expiresAt < new Date()) {
      if (verificationToken) {
        await prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } });
      }
      return NextResponse.redirect(
        new URL("/patvirtinti?status=expired", req.url)
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: new Date() },
      }),
      prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } }),
    ]);

    return NextResponse.redirect(
      new URL("/patvirtinti?status=success", req.url)
    );
  } catch (error) {
    console.error("Verify email error:", error);
    return NextResponse.redirect(
      new URL("/patvirtinti?status=error", req.url)
    );
  }
}
