import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { SignJWT } from "jose";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TOKEN_TTL_SECONDS = 60 * 60;
const THREAD_KINDS = new Set(["response", "directInquiry"]);

// Mints a short-lived JWT for Supabase Realtime. The browser passes it to
// `supabase.realtime.setAuth()` so that the `messages` / `notifications`
// RLS policies can resolve `app_user_id()` to the NextAuth user id and only
// broadcast rows the viewer is allowed to see.
//
// Signed with HS256 using SUPABASE_JWT_SECRET (Supabase Dashboard → Project
// Settings → API → JWT Secret) — the same secret Supabase uses to verify
// every Realtime / PostgREST request, so claims are trusted server-side.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
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

  if (!userId && !trackingToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (trackingToken) {
    if (!threadKind) {
      return NextResponse.json({ error: "Thread kind is required" }, { status: 400 });
    }

    if (threadKind === "directInquiry") {
      const inquiry = await prisma.directInquiry.findUnique({
        where: { trackingToken },
        select: { id: true },
      });
      if (!inquiry || (threadId && inquiry.id !== threadId)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } else {
      if (threadId) {
        const response = await prisma.response.findFirst({
          where: { id: threadId, request: { trackingToken } },
          select: { id: true },
        });
        if (!response) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
      } else {
        const request = await prisma.serviceRequest.findUnique({
          where: { trackingToken },
          select: { id: true },
        });
        if (!request) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
      }
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

  return NextResponse.json(
    { token, expiresAt: expiresAtSeconds * 1000 },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
