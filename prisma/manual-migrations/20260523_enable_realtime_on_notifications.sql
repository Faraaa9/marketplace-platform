-- Migration: enable Supabase Realtime on the `notifications` table.
--
-- Mirrors 20260519_enable_realtime_on_messages.sql. See that file for
-- the full rationale on publication setup and RLS trade-offs.
--
-- The NotificationBell component subscribes per-user with a
-- `userId=eq.<currentUserId>` filter. Because userId is a cuid (not
-- enumerable), an attacker would need to know a specific userId to
-- subscribe to that user's notifications. Writes still go through the
-- Next.js API which enforces NextAuth session checks.
--
-- Safe to re-run? Yes — DO block skips the ALTER if the table is
-- already a member of the publication.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END
$$;
