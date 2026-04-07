import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ProviderGuardResult =
  | { authorized: true; userId: string }
  | { authorized: false; response: NextResponse };

/**
 * Checks that the caller is a PROVIDER with verified email and active profile.
 * Use for routes that expose client data (request browsing, detail, responding).
 * Profile/stats/plans routes should NOT use this — they use basic role checks only.
 */
export async function requireActiveProvider(): Promise<ProviderGuardResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "PROVIDER") {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const [user, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { emailVerified: true },
    }),
    prisma.providerProfile.findUnique({
      where: { userId: session.user.id },
      select: { isActive: true },
    }),
  ]);

  if (!user?.emailVerified) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Patvirtinkite savo el. pašto adresą, kad galėtumėte peržiūrėti užklausas.",
          code: "EMAIL_NOT_VERIFIED",
        },
        { status: 403 }
      ),
    };
  }

  if (!profile?.isActive) {
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Jūsų paskyra dar neaktyvuota. Administratorius peržiūrės ir aktyvuos jūsų profilį.",
          code: "ACCOUNT_NOT_ACTIVE",
        },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, userId: session.user.id };
}
