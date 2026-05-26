-- Migration: add client-side read receipts for two-way chat threads
--
-- providerLastReadAt already powers provider unread state. This adds the
-- symmetric clientLastReadAt so providers can see when clients have opened a
-- response/direct-inquiry conversation.
--
-- Nullable by design: NULL means "not seen yet".

BEGIN;

ALTER TABLE "responses"
  ADD COLUMN IF NOT EXISTS "clientLastReadAt" TIMESTAMP(3);

ALTER TABLE "direct_inquiries"
  ADD COLUMN IF NOT EXISTS "clientLastReadAt" TIMESTAMP(3);

-- Direct inquiries are created by the sender, so the opening message starts as
-- seen by that sender. Provider replies still require a later client open.
UPDATE "direct_inquiries"
SET "clientLastReadAt" = "createdAt"
WHERE "clientLastReadAt" IS NULL;

COMMIT;
