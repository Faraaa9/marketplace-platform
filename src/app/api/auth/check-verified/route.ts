import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Polled by the /patvirtinti page in the original signup tab. Returns whether
// the user behind the signin token has verified their email yet, without
// consuming the token — actual sign-in happens via NextAuth credentials.
export async function GET(req: NextRequest) {
  const signinToken = req.nextUrl.searchParams.get("signinToken");

  if (!signinToken) {
    return NextResponse.json({ verified: false, expired: false });
  }

  const tokenRow = await prisma.pendingSignInToken.findUnique({
    where: { token: signinToken },
    select: {
      expiresAt: true,
      usedAt: true,
      user: { select: { emailVerified: true } },
    },
  });

  if (!tokenRow) {
    return NextResponse.json({ verified: false, expired: true });
  }

  if (tokenRow.usedAt || tokenRow.expiresAt < new Date()) {
    return NextResponse.json({ verified: false, expired: true });
  }

  return NextResponse.json({
    verified: !!tokenRow.user.emailVerified,
    expired: false,
  });
}
