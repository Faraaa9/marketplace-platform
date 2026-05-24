-- Migration: address advisor WARNs on the helper functions added by
-- 20260524_enable_realtime_rls.sql.
--
-- 1. app_user_id() had a mutable search_path. Pin it to empty.
-- 2. can_view_message() was SECURITY DEFINER in public, callable via
--    /rest/v1/rpc by both anon and authenticated. Move it to a private
--    schema that PostgREST does not expose; RLS policies can still call
--    it because authenticated has USAGE + EXECUTE.
--
-- Safe to re-run? Yes — drops happen with IF EXISTS, schema creation is
-- guarded.

CREATE OR REPLACE FUNCTION public.app_user_id() RETURNS text
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT current_setting('request.jwt.claim.sub', true)
$$;

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

DROP POLICY IF EXISTS allow_select_thread_participants ON public.messages;
DROP FUNCTION IF EXISTS public.can_view_message(text, text, text);

CREATE FUNCTION private.can_view_message(
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

REVOKE EXECUTE ON FUNCTION private.can_view_message(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_view_message(text, text, text) TO authenticated;

CREATE POLICY allow_select_thread_participants
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    private.can_view_message("responseId", "directInquiryId", public.app_user_id())
  );
