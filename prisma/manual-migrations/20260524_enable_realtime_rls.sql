-- Migration: enable RLS + policies on messages and notifications so Realtime
-- payloads are filtered by user identity instead of relying on cuid-as-secret.
--
-- Prerequisite: SUPABASE_JWT_SECRET env var must be set on the deployed app
-- (Supabase Dashboard -> Project Settings -> API -> "JWT Secret"). The browser
-- fetches a signed JWT from /api/realtime/token and calls
-- supabase.realtime.setAuth() before subscribing. Without that env var or
-- without the deployed code, Realtime stops delivering payloads.
--
-- Roll-back: drop the policies and DISABLE ROW LEVEL SECURITY on both tables
-- to fall back to cuid-filter MVP mode.
--
-- Safe to re-run? Yes — every step uses IF EXISTS / IF NOT EXISTS / OR REPLACE.

-- 1. Helper: read the cuid user id from the signed Realtime JWT.
--    Supabase's built-in auth.uid() casts to UUID and would throw on cuids.
CREATE OR REPLACE FUNCTION public.app_user_id() RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT current_setting('request.jwt.claim.sub', true)
$$;

-- 2. Helper: SECURITY DEFINER so the membership check can read responses /
--    service_requests / direct_inquiries even though they have RLS enabled
--    with no policies. The function body itself enforces the access rule.
CREATE OR REPLACE FUNCTION public.can_view_message(
  msg_response_id text,
  msg_direct_inquiry_id text,
  uid text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    uid IS NOT NULL
    AND (
      (
        msg_response_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.responses r
          INNER JOIN public.service_requests sr ON r."requestId" = sr.id
          WHERE r.id = msg_response_id
            AND (r."providerId" = uid OR sr."clientId" = uid)
        )
      )
      OR (
        msg_direct_inquiry_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.direct_inquiries di
          WHERE di.id = msg_direct_inquiry_id
            AND (di."senderUserId" = uid OR di."providerId" = uid)
        )
      )
    )
$$;

-- 3. Enable RLS and add policies on notifications.
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_select_own_notifications ON public.notifications;
CREATE POLICY allow_select_own_notifications
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING ("userId" = public.app_user_id());

-- 4. Enable RLS and add policies on messages.
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_select_thread_participants ON public.messages;
CREATE POLICY allow_select_thread_participants
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    public.can_view_message("responseId", "directInquiryId", public.app_user_id())
  );
