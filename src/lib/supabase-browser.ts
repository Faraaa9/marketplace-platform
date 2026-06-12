"use client";

type RealtimePayload = {
  new: unknown;
  old?: unknown;
  payload?: Record<string, unknown>;
};

export interface RealtimeChannelLike {
  on(
    type: "postgres_changes" | "broadcast" | "presence",
    filter: Record<string, unknown>,
    callback: (payload: RealtimePayload) => void,
  ): RealtimeChannelLike;
  subscribe(callback?: (status: string) => void): RealtimeChannelLike;
  unsubscribe(): Promise<unknown>;
  presenceState(): Record<string, unknown[]>;
  send(args: { type: "broadcast"; event: string; payload: Record<string, unknown> }): Promise<unknown>;
  track(payload: Record<string, unknown>): Promise<unknown>;
}

export interface SupabaseBrowserClient {
  realtime: { setAuth(token: string): void };
  channel(name: string, options?: Record<string, unknown>): RealtimeChannelLike;
  removeChannel(channel: RealtimeChannelLike): Promise<unknown>;
}

// Singleton browser-side Supabase client used ONLY for Realtime subscriptions
// on the `messages` and `notifications` tables.
//
// @supabase/supabase-js is ~60KB compressed and only needed by signed-in
// users with live threads/notifications, so it's loaded via dynamic import —
// keeping it out of the shared first-load bundle every visitor downloads.
//
// Authorization model: the server mints a short-lived JWT signed with
// SUPABASE_JWT_SECRET via /api/realtime/token; we apply it with
// supabase.realtime.setAuth() so Realtime evaluates RLS policies on
// messages/notifications against `app_user_id()` (the cuid from the `sub`
// claim) and only delivers payloads the viewer is allowed to see.
//
// Writes still go through Next.js API routes (session-gated) — the browser
// never inserts/updates DB rows directly.

let client: SupabaseBrowserClient | null = null;
let clientPromise: Promise<SupabaseBrowserClient | null> | null = null;

export async function getSupabaseBrowser(): Promise<SupabaseBrowserClient | null> {
  if (client) return client;
  if (clientPromise) return clientPromise;

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

  clientPromise = import("@supabase/supabase-js").then(({ createClient }) => {
    client = createClient(url, anonKey, {
      auth: { persistSession: false },
      realtime: { params: { eventsPerSecond: 5 } },
    }) as SupabaseBrowserClient;
    return client;
  });

  return clientPromise;
}

let realtimeAuthPromise: Promise<boolean> | null = null;
const AUTH_REFRESH_SKEW_MS = 5 * 60_000;
const FAILED_AUTH_RETRY_MS = 60_000;
const scopedRealtimeAuthPromises = new Map<string, Promise<boolean>>();
const scopedRealtimeAuthUntil = new Map<string, number>();
const scopedRealtimeAuthFailedUntil = new Map<string, number>();

export interface RealtimeAuthScope {
  threadKind?: "response" | "directInquiry";
  threadId?: string;
  trackingToken?: string | null;
}

function authScopeKey(scope?: RealtimeAuthScope): string {
  if (!scope) return "session";
  return JSON.stringify({
    threadKind: scope.threadKind ?? null,
    threadId: scope.threadId ?? null,
    trackingToken: scope.trackingToken ?? null,
  });
}

function authTokenUrl(scope?: RealtimeAuthScope): string {
  const params = new URLSearchParams();
  if (scope?.threadKind) params.set("threadKind", scope.threadKind);
  if (scope?.threadId) params.set("threadId", scope.threadId);
  if (scope?.trackingToken) params.set("trackingToken", scope.trackingToken);
  const query = params.toString();
  return query ? `/api/realtime/token?${query}` : "/api/realtime/token";
}

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
export function authenticateRealtime(scope?: RealtimeAuthScope): Promise<boolean> {
  const key = authScopeKey(scope);
  const authUntil = scopedRealtimeAuthUntil.get(key) ?? 0;
  const failedUntil = scopedRealtimeAuthFailedUntil.get(key) ?? 0;

  if (authUntil > Date.now() + AUTH_REFRESH_SKEW_MS) {
    return Promise.resolve(true);
  }

  if (failedUntil > Date.now()) {
    return Promise.resolve(false);
  }

  if (!scope) {
    if (realtimeAuthPromise) return realtimeAuthPromise;
  } else {
    const cached = scopedRealtimeAuthPromises.get(key);
    if (cached) return cached;
  }

  const promise = (async () => {
    try {
      const supabase = await getSupabaseBrowser();
      if (!supabase) return false;
      const res = await fetch(authTokenUrl(scope), { credentials: "include" });
      if (!res.ok) {
        scopedRealtimeAuthFailedUntil.set(key, Date.now() + FAILED_AUTH_RETRY_MS);
        return false;
      }
      const data = (await res.json()) as { token?: string; expiresAt?: number };
      if (!data.token) {
        scopedRealtimeAuthFailedUntil.set(key, Date.now() + FAILED_AUTH_RETRY_MS);
        return false;
      }
      supabase.realtime.setAuth(data.token);
      scopedRealtimeAuthUntil.set(key, data.expiresAt ?? Date.now() + 55 * 60_000);
      scopedRealtimeAuthFailedUntil.delete(key);
      return true;
    } catch {
      scopedRealtimeAuthFailedUntil.set(key, Date.now() + FAILED_AUTH_RETRY_MS);
      return false;
    } finally {
      if (!scope) {
        realtimeAuthPromise = null;
      } else {
        scopedRealtimeAuthPromises.delete(key);
      }
    }
  })();

  if (!scope) {
    realtimeAuthPromise = promise;
  } else {
    scopedRealtimeAuthPromises.set(authScopeKey(scope), promise);
  }

  return promise;
}
