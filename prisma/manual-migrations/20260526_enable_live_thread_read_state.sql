-- Migration: live chat read-state Realtime.
--
-- Adds short-lived, tracking-token scoped Realtime authorization for:
--   - messages INSERT payloads on token-based client chat pages
--   - responses/direct_inquiries UPDATE payloads for live "seen" movement
--
-- Safe to re-run? Yes — all publication membership checks and policy/function
-- updates are idempotent.

CREATE OR REPLACE FUNCTION public.app_user_id() RETURNS text
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    NULLIF((current_setting('request.jwt.claims', true)::json ->> 'sub'), '')
  )
$$;

CREATE OR REPLACE FUNCTION public.app_tracking_token() RETURNS text
LANGUAGE sql STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.tracking_token', true), ''),
    NULLIF((current_setting('request.jwt.claims', true)::json ->> 'tracking_token'), '')
  )
$$;

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.can_view_response_thread(
  row_response_id text,
  uid text,
  tracking_token text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    row_response_id IS NOT NULL
    AND (
      (
        uid IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.responses r
          INNER JOIN public.service_requests sr ON r."requestId" = sr.id
          WHERE r.id = row_response_id
            AND (r."providerId" = uid OR sr."clientId" = uid)
        )
      )
      OR (
        tracking_token IS NOT NULL
        AND tracking_token <> ''
        AND EXISTS (
          SELECT 1
          FROM public.responses r
          INNER JOIN public.service_requests sr ON r."requestId" = sr.id
          WHERE r.id = row_response_id
            AND sr."trackingToken" = tracking_token
        )
      )
    )
$$;

CREATE OR REPLACE FUNCTION private.can_view_direct_inquiry_thread(
  row_direct_inquiry_id text,
  uid text,
  tracking_token text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    row_direct_inquiry_id IS NOT NULL
    AND (
      (
        uid IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.direct_inquiries di
          WHERE di.id = row_direct_inquiry_id
            AND (di."providerId" = uid OR di."senderUserId" = uid)
        )
      )
      OR (
        tracking_token IS NOT NULL
        AND tracking_token <> ''
        AND EXISTS (
          SELECT 1
          FROM public.direct_inquiries di
          WHERE di.id = row_direct_inquiry_id
            AND di."trackingToken" = tracking_token
        )
      )
    )
$$;

REVOKE EXECUTE ON FUNCTION private.can_view_response_thread(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION private.can_view_direct_inquiry_thread(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_view_response_thread(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_view_direct_inquiry_thread(text, text, text) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'responses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.responses;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'direct_inquiries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_inquiries;
  END IF;
END
$$;

ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_select_response_thread_participants ON public.responses;
CREATE POLICY allow_select_response_thread_participants
  ON public.responses
  FOR SELECT
  TO authenticated
  USING (
    private.can_view_response_thread(id, public.app_user_id(), public.app_tracking_token())
  );

DROP POLICY IF EXISTS allow_select_direct_inquiry_thread_participants ON public.direct_inquiries;
CREATE POLICY allow_select_direct_inquiry_thread_participants
  ON public.direct_inquiries
  FOR SELECT
  TO authenticated
  USING (
    private.can_view_direct_inquiry_thread(id, public.app_user_id(), public.app_tracking_token())
  );

DROP POLICY IF EXISTS allow_select_thread_participants ON public.messages;
CREATE POLICY allow_select_thread_participants
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    private.can_view_response_thread("responseId", public.app_user_id(), public.app_tracking_token())
    OR private.can_view_direct_inquiry_thread("directInquiryId", public.app_user_id(), public.app_tracking_token())
  );
