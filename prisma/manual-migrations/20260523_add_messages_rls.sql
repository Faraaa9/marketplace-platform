-- Migration: Add Row-Level Security (RLS) to the `messages` table.
--
-- Status: MVP enforcement layer. Postgres RLS policies are defined but the
-- Realtime subscription authorization still relies on the client providing a
-- valid JWT with a user ID claim. For now, client-side security is based on:
-- 1. Tracking tokens (responses) and session validation (direct inquiries).
-- 2. ResponseIDs are cuid, not enumerable, providing defense-in-depth.
-- 3. API route writes (POST /api/requests/[id]/messages) enforce ownership.
--
-- Future work (Phase 2+):
-- - Sign custom JWTs with user ID claims when creating Realtime subscriptions.
-- - Tighten policies to check jwt_claims->>'sub' against response/inquiry owners.
-- - Move from anonymous anon-key subscriptions to authenticated user tokens.
--
-- Safe to re-run? Yes — wrapped in DO blocks.

-- Enable RLS on the messages table (if not already enabled).
DO $$
BEGIN
  ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
EXCEPTION
  WHEN others THEN
    -- RLS may already be enabled; ignore.
    NULL;
END
$$;

-- Policy: Allow inserts only to app backend (service role via DATABASE_URL).
-- Individual users cannot directly insert via Realtime anon key; inserts always
-- go through /api/requests/[id]/messages (session-gated) or API routes.
DO $$
BEGIN
  DROP POLICY IF EXISTS "allow_insert_backend_only" ON public.messages;
  CREATE POLICY allow_insert_backend_only
    ON public.messages
    FOR INSERT
    TO authenticated
    WITH CHECK (false);
EXCEPTION
  WHEN others THEN
    NULL;
END
$$;

-- Policy: Allow selects if the user is one of the message thread participants.
-- For response-based threads: user must be response.providerId or request.clientId.
-- For direct-inquiry threads: user must be inquiry.senderId or inquiry.providerId.
--
-- TODO: When JWT claims are available (user ID in jwt_claims->>'sub'), replace
-- direct selects with claim-based matching.
DO $$
BEGIN
  DROP POLICY IF EXISTS "allow_select_thread_participants" ON public.messages;
  CREATE POLICY allow_select_thread_participants
    ON public.messages
    FOR SELECT
    TO authenticated, anon
    USING (
      -- For messages tied to a response: allow if subscribed user is provider or client.
      (
        responseId IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.responses r
          INNER JOIN public.service_requests sr ON r.requestId = sr.id
          WHERE r.id = messages.responseId
            AND (
              -- Provider of the response
              r.providerId = auth.uid()
              -- OR client who posted the request
              OR sr.clientId = auth.uid()
            )
        )
      )
      -- For messages tied to a direct inquiry: allow if user is sender or provider.
      OR (
        directInquiryId IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.direct_inquiries di
          WHERE di.id = messages.directInquiryId
            AND (
              -- Sender of the inquiry
              di.senderId = auth.uid()
              -- OR provider receiving the inquiry
              OR di.providerId = auth.uid()
            )
        )
      )
    );
EXCEPTION
  WHEN others THEN
    NULL;
END
$$;

-- Policy: Disallow updates to messages (immutable chat history).
DO $$
BEGIN
  DROP POLICY IF EXISTS "deny_update" ON public.messages;
  CREATE POLICY deny_update
    ON public.messages
    FOR UPDATE
    USING (false);
EXCEPTION
  WHEN others THEN
    NULL;
END
$$;

-- Policy: Disallow deletes (immutable chat history, admin can soft-delete via app).
DO $$
BEGIN
  DROP POLICY IF EXISTS "deny_delete" ON public.messages;
  CREATE POLICY deny_delete
    ON public.messages
    FOR DELETE
    USING (false);
EXCEPTION
  WHEN others THEN
    NULL;
END
$$;
