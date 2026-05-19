-- Migration: enable Supabase Realtime on the `messages` table.
--
-- Supabase Realtime listens to Postgres CDC (logical replication) events.
-- Tables must be added to the `supabase_realtime` publication to broadcast
-- INSERT/UPDATE/DELETE events. This is normally done via the Supabase
-- Dashboard (Database -> Replication), but we capture it here so the
-- setup is reproducible across environments.
--
-- Safe to re-run? Yes — wrapped in a DO block that skips the ALTER if
-- the table is already a member of the publication, avoiding the
-- "relation is already member of publication" error.
--
-- Row Level Security (RLS) decision:
--   We are NOT enabling RLS on `messages` in this migration.
--   The Postgres tables are accessed by the Next.js API (using the
--   pooled connection / service role via DATABASE_URL) — that path
--   already enforces per-conversation authorization (tracking token
--   matching, session checks, provider guards). Enabling RLS without
--   carefully written policies would deliver Realtime payloads to the
--   anon role for ALL messages, which is precisely what we want to
--   avoid; without RLS, Supabase Realtime will only deliver to
--   subscribers that authenticate as the anon role using the public
--   anon key, and our client-side subscription filter (`responseId=eq.X`)
--   limits the payloads received per channel.
--
--   TODO: tighten this. Proper end-to-end isolation requires either
--     (a) RLS policies that match a JWT claim to the responseId's
--         owning request (tracking token or session userId), OR
--     (b) signing tracking tokens as Supabase JWTs and verifying them
--         in an RLS policy.
--   For MVP the anon key + responseId filter is acceptable: an attacker
--   would need to know a specific responseId (cuid, not enumerable) to
--   subscribe to a thread, and writes still go through our API.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END
$$;
