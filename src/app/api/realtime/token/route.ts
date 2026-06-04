import { NextResponse, connection } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { SignJWT } from "jose";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createServerTimer } from "@/lib/server-timing";

const TOKEN_TTL_SECONDS = 60 * 60;
const THREAD_KINDS = new Set(["response", "directInquiry"]);
const TOKEN_CACHE_SKEW_MS = 60_000;
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

// Mints a short-lived JWT for Supabase Realtime. The browser passes it to
// `supabase.realtime.setAuth()` so that the `messages` / `notifications`
// RLS policies can resolve `app_user_id()` to the NextAuth user id and only
// broadcast rows the viewer is allowed to see.
//
// Signed with HS256 using SUPABASE_JWT_SECRET (Supabase Dashboard → Project
// Settings → API → JWT Secret) — the same secret Supabase uses to verify
// every Realtime / PostgREST request, so claims are trusted server-side.
export async function GET(req: NextRequest) {
  await connection();
  const timer = createServerTimer("realtime-token");
  const threadKind = req.nextUrl.searchParams.get("threadKind");
  const threadId = req.nextUrl.searchParams.get("threadId");
  const trackingToken = req.nextUrl.searchParams.get("trackingToken");

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    console.error("[realtime/token] SUPABASE_JWT_SECRET is not configured.");
    return NextResponse.json(
      { error: "SUPABASE_JWT_SECRET not configured" },
      { status: 500 },
    );
  }

  if (threadKind && !THREAD_KINDS.has(threadKind)) {
    return NextResponse.json({ error: "Invalid thread kind" }, { status: 400 });
  }

  let userId: string | undefined;
  if (trackingToken) {
    if (!threadKind) {
      return NextResponse.json({ error: "Thread kind is required" }, { status: 400 });
    }

    const cacheKey = `tracking:${threadKind}:${threadId ?? ""}:${trackingToken}`;
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt - TOKEN_CACHE_SKEW_MS > Date.now()) {
      timer.end({ mode: "tracking-cache", kind: threadKind });
      return NextResponse.json(
        { token: cached.token, expiresAt: cached.expiresAt },
        { headers: { "Cache-Control": "private, max-age=300" } },
      );
    }

    if (threadKind === "directInquiry") {
      const inquiry = await prisma.directInquiry.findUnique({
        where: { trackingToken },
        select: { id: true },
      });
      timer.mark("trackingLookup");
      if (!inquiry || (threadId && inquiry.id !== threadId)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      if (threadId) {
        const response = await prisma.response.findFirst({
          where: { id: threadId, request: { trackingToken } },
          select: { id: true },
        });
        timer.mark("trackingLookup");
        if (!response) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
      } else {
        const request = await prisma.serviceRequest.findUnique({
          where: { trackingToken },
          select: { id: true },
        });
        timer.mark("trackingLookup");
        if (!request) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
      }
    }
  } else {
    const session = await getServerSession(authOptions);
    timer.mark("session");
    userId = (session?.user as { id?: string } | undefined)?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cacheKey = `user:${userId}:${threadKind ?? ""}:${threadId ?? ""}`;
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt - TOKEN_CACHE_SKEW_MS > Date.now()) {
      timer.end({ mode: "user-cache", kind: threadKind });
      return NextResponse.json(
        { token: cached.token, expiresAt: cached.expiresAt },
        { headers: { "Cache-Control": "private, max-age=300" } },
      );
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAtSeconds = now + TOKEN_TTL_SECONDS;

  const token = await new SignJWT({
    sub: userId ?? `tracking:${trackingToken}`,
    role: "authenticated",
    ...(threadKind ? { thread_kind: threadKind } : {}),
    ...(threadId ? { thread_id: threadId } : {}),
    ...(trackingToken ? { tracking_token: trackingToken } : {}),
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(expiresAtSeconds)
    .setIssuer("paslaugurinka.lt")
    .setAudience("authenticated")
    .sign(new TextEncoder().encode(secret));

  const cacheKey = trackingToken
    ? `tracking:${threadKind}:${threadId ?? ""}:${trackingToken}`
    : `user:${userId}:${threadKind ?? ""}:${threadId ?? ""}`;
  tokenCache.set(cacheKey, { token, expiresAt: expiresAtSeconds * 1000 });
  timer.end({ mode: trackingToken ? "tracking" : "user", kind: threadKind });

  return NextResponse.json(
    { token, expiresAt: expiresAtSeconds * 1000 },
    {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    },
  );
}
