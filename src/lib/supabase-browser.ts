"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Singleton browser-side Supabase client used ONLY for Realtime subscriptions
// on the `messages` table. Writes still go through Next.js API routes which
// enforce tracking-token / session authorization.
//
// The anon key is safe to expose because:
//   - the messages table is not enabled for direct REST reads here (we use
//     the subscription channel only, with a responseId filter), and
//   - responseIds are cuids (not enumerable).
// See prisma/manual-migrations/20260519_enable_realtime_on_messages.sql for
// the RLS / publication notes.

let client: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // TODO: ENV — add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
  // to .env.local (and Vercel project envs) to enable Realtime message updates.
  // When missing, the component gracefully falls back to no live updates;
  // initial render still works because messages are hydrated from RSC props.
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
