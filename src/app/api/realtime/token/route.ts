import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { SignJWT } from "jose";
import { authOptions } from "@/lib/auth";

const TOKEN_TTL_SECONDS = 60 * 60;

// Mints a short-lived JWT for Supabase Realtime. The browser passes it to
// `supabase.realtime.setAuth()` so that the `messages` / `notifications`
// RLS policies can resolve `app_user_id()` to the NextAuth user id and only
// broadcast rows the viewer is allowed to see.
//
// Signed with HS256 using SUPABASE_JWT_SECRET (Supabase Dashboard → Project
// Settings → API → JWT Secret) — the same secret Supabase uses to verify
// every Realtime / PostgREST request, so claims are trusted server-side.
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    console.error("[realtime/token] SUPABASE_JWT_SECRET is not configured.");
    return NextResponse.json(
      { error: "SUPABASE_JWT_SECRET not configured" },
      { status: 500 },
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAtSeconds = now + TOKEN_TTL_SECONDS;

  const token = await new SignJWT({
    sub: userId,
    role: "authenticated",
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
