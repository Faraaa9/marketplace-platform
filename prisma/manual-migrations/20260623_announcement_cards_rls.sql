-- Migration: enable Row Level Security on announcement_cards.
--
-- Rationale: Supabase advisor (rls_disabled_in_public) flagged
-- public.announcement_cards as RLS-disabled. The table was added in
-- 20260617_add_announcement_cards.sql, after the bulk lockdown in
-- 20260523_lockdown_rls.sql, so it never got the same treatment and the
-- anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY) could read/modify every row via
-- the auto-generated REST API.
--
-- All application access goes through Prisma (DATABASE_URL uses the
-- `postgres` role, which has BYPASSRLS = true): server-side reads in
-- src/lib/announcements.ts and admin CRUD in
-- src/app/api/admin/announcements/route.ts. No browser-side
-- @supabase/supabase-js access and no Realtime subscription touch this
-- table, so blocking anon/authenticated entirely is correct — same posture
-- as the lockdown migration.
--
-- An explicit deny-all policy (USING (false)) makes that intent first-class
-- and also clears the follow-up advisor notice (rls_enabled_no_policy). It
-- has no effect on Prisma, which runs as a BYPASSRLS role.
--
-- Safe to re-run? Yes — ENABLE RLS is idempotent and the policy is dropped
-- before being recreated.

ALTER TABLE public.announcement_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all_announcement_cards" ON public.announcement_cards;
CREATE POLICY "deny_all_announcement_cards"
  ON public.announcement_cards
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);
