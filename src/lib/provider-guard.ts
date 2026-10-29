import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { passwordFingerprint } from "@/lib/auth-guards";

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

const ACTIVE_PROVIDER_CACHE_TTL_MS = 120_000;
const activeProviderCache = new Map<string, CachedProvider>();

/**
 * Checks that the caller has a providerProfile with verified email and active status.
 * Uses providerProfile existence as the source of truth (not just user.role).
 */
export async function requireActiveProvider(req?: NextRequest): Promise<ProviderGuardResult> {
  const token = req
    ? await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    : null;
  const session = token
    ? null
    : await getServerSession(authOptions);
  const userId = (token?.id as string | undefined) ?? session?.user?.id;
  const userName = (token?.name as string | null | undefined) ?? session?.user?.name ?? null;

  if (!userId) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  // A raw getToken() skips the jwt callback, so the revocation checks it does
  // (blocked user, password reset) are repeated against the DB below. The
  // cache key carries the token's password stamp so a reset can't ride a hit.
  const tokenPwf = typeof token?.pwf === "string" ? token.pwf : null;
  const cacheKey = `${userId}:${tokenPwf ?? ""}`;
  const cached = activeProviderCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return {
      authorized: true,
      userId,
      userName,
      providerProfileId: cached.providerProfileId,
      creditBalance: cached.creditBalance,
    };
  }

  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      isActive: true,
      creditBalance: true,
      user: { select: { emailVerified: true, role: true, blocked: true, password: true } },
    },
  });
  const user = profile?.user;

  if (user?.blocked || (tokenPwf && tokenPwf !== passwordFingerprint(user?.password))) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

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

  activeProviderCache.set(cacheKey, {
    providerProfileId: profile.id,
    creditBalance: profile.creditBalance,
    expiresAt: Date.now() + ACTIVE_PROVIDER_CACHE_TTL_MS,
  });

  return {
    authorized: true,
    userId,
    userName,
    providerProfileId: profile.id,
    creditBalance: profile.creditBalance,
  };
}
