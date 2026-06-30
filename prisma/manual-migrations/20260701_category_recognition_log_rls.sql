-- Migration: enable Row Level Security on category_recognition_log.
--
-- Rationale: Supabase advisor (rls_disabled_in_public) flagged
-- public.category_recognition_log as RLS-disabled. The table isn't
-- tracked in prisma/schema.prisma or referenced anywhere in the app
-- codebase, so it was created directly in Supabase (outside Prisma) after
-- the bulk lockdown in 20260523_lockdown_rls.sql and never got the same
-- treatment — same situation as announcement_cards in
-- 20260623_announcement_cards_rls.sql.
--
-- All application access goes through Prisma (DATABASE_URL uses the
-- `postgres` role, which has BYPASSRLS = true). No browser-side
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

ALTER TABLE public.category_recognition_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all_category_recognition_log" ON public.category_recognition_log;
CREATE POLICY "deny_all_category_recognition_log"
  ON public.category_recognition_log
  FOR ALL
  TO public
  USING (false)
  WITH CHECK (false);
