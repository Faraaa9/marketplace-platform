-- Migration: lock down all public tables with Row Level Security.
--
-- Rationale: Supabase advisor flagged 30 public tables as RLS-disabled,
-- meaning the anon key (exposed in NEXT_PUBLIC_SUPABASE_ANON_KEY) could
-- read or modify every row via the auto-generated REST API.
--
-- All application reads/writes go through Prisma (DATABASE_URL uses the
-- `postgres` role, which has BYPASSRLS = true), so enabling RLS does NOT
-- affect server-side queries. Browser-side use of @supabase/supabase-js
-- is limited to Realtime subscriptions on `messages` and `notifications`,
-- which are excluded here (see below).
--
-- After this migration:
--   - 28 tables: RLS ON, no policies → anon/authenticated fully blocked.
--   - messages, notifications: RLS stays OFF (Realtime requires anon to
--     receive payloads; defense-in-depth = cuid filter on client). This is
--     tracked as MVP debt until JWT-signed Realtime subscriptions land.
--   - users: removed from supabase_realtime publication (was added by
--     accident — no client code subscribes to it) and then locked down.
--
-- Safe to re-run? Yes — ALTER TABLE ... ENABLE RLS is idempotent.
--                       DROP TABLE FROM PUBLICATION wrapped in IF EXISTS.

-- 1. Remove `users` from Realtime publication (accidental membership).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.users;
  END IF;
END
$$;

-- 2. Lock down all tables except messages/notifications (Realtime exceptions).
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_direct_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_profile_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_category_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_source_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
