"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Singleton browser-side Supabase client used ONLY for Realtime subscriptions
// on the `messages` and `notifications` tables.
//
// Authorization model: the server mints a short-lived JWT signed with
// SUPABASE_JWT_SECRET via /api/realtime/token; we apply it with
// supabase.realtime.setAuth() so Realtime evaluates RLS policies on
// messages/notifications against `app_user_id()` (the cuid from the `sub`
// claim) and only delivers payloads the viewer is allowed to see.
//
// Writes still go through Next.js API routes (session-gated) — the browser
// never inserts/updates DB rows directly.

let client: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (typeof window !== "undefined") {
      console.warn(
        "[supabase-browser] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing — Realtime disabled.",
      );
    }
    return null;
  }

  client = createClient(url, anonKey, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 5 } },
  });

  return client;
}

let realtimeAuthPromise: Promise<boolean> | null = null;

/**
 * Fetch a signed JWT from the server and apply it to the Realtime client so
 * RLS policies on messages/notifications can identify the current user.
 *
 * Memoised: concurrent subscribers share one fetch. Returns true on success,
 * false if unauthenticated or the token endpoint failed — in that case
 * channels still subscribe but RLS will drop every payload (anon role has
 * no SELECT policy on the protected tables).
 *
 * For MVP we don't auto-refresh on expiry; the 1h TTL covers a single page
 * session and any reload mints a fresh token.
 */
export function authenticateRealtime(): Promise<boolean> {
  if (realtimeAuthPromise) return realtimeAuthPromise;

  const supabase = getSupabaseBrowser();
  if (!supabase) return Promise.resolve(false);

  realtimeAuthPromise = (async () => {
    try {
      const res = await fetch("/api/realtime/token", { credentials: "include" });
      if (!res.ok) return false;
      const data = (await res.json()) as { token?: string };
      if (!data.token) return false;
      supabase.realtime.setAuth(data.token);
      return true;
    } catch {
      return false;
    }
  })();

  return realtimeAuthPromise;
}
