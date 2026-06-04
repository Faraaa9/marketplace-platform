import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ProviderGuardResult =
  | {
      authorized: true;
      userId: string;
      userName: string | null;
      providerProfileId: string;
      creditBalance: number;
    }
  | { authorized: false; response: NextResponse };

type CachedProvider = {
  providerProfileId: string;
  creditBalance: number;
  expiresAt: number;
};

const ACTIVE_PROVIDER_CACHE_TTL_MS = 30_000;
const activeProviderCache = new Map<string, CachedProvider>();

/**
 * Checks that the caller has a providerProfile with verified email and active status.
 * Uses providerProfile existence as the source of truth (not just user.role).
 */
export async function requireActiveProvider(): Promise<ProviderGuardResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const cached = activeProviderCache.get(session.user.id);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      authorized: true,
      userId: session.user.id,
      userName: session.user.name ?? null,
      providerProfileId: cached.providerProfileId,
      creditBalance: cached.creditBalance,
    };
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      isActive: true,
      creditBalance: true,
      user: { select: { emailVerified: true, role: true } },
    },
  });
  const user = profile?.user;

  if (user?.role !== "PROVIDER") {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Neturite tiekėjo rolės", code: "NOT_PROVIDER" },
        { status: 403 }
      ),
    };
  }

  if (!profile) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Neturite tiekėjo profilio", code: "NOT_PROVIDER" },
        { status: 403 }
      ),
    };
  }

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

  if (!profile.isActive) {
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

  activeProviderCache.set(session.user.id, {
    providerProfileId: profile.id,
    creditBalance: profile.creditBalance,
    expiresAt: Date.now() + ACTIVE_PROVIDER_CACHE_TTL_MS,
  });

  return {
    authorized: true,
    userId: session.user.id,
    userName: session.user.name ?? null,
    providerProfileId: profile.id,
    creditBalance: profile.creditBalance,
  };
}
