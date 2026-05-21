-- Migration: unify direct inquiries into the two-way message thread system
--
-- Makes `messages` polymorphic — a message now belongs to either a Response
-- or a DirectInquiry. Gives DirectInquiry real conversation tracking
-- (lastMessageAt / providerLastReadAt) plus a trackingToken so the sender can
-- view and continue the thread.
--
-- Safe to re-run: column adds use IF NOT EXISTS, backfills only touch NULL
-- rows, and the foreign key / indexes are guarded.

BEGIN;

-- ── messages: become polymorphic (Response OR DirectInquiry) ───────────────
ALTER TABLE "messages" ALTER COLUMN "responseId" DROP NOT NULL;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "directInquiryId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_directInquiryId_fkey'
  ) THEN
    ALTER TABLE "messages"
      ADD CONSTRAINT "messages_directInquiryId_fkey"
      FOREIGN KEY ("directInquiryId") REFERENCES "direct_inquiries"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "messages_directInquiryId_idx"
  ON "messages"("directInquiryId");

-- ── direct_inquiries: conversation tracking + sender access token ──────────
ALTER TABLE "direct_inquiries" ADD COLUMN IF NOT EXISTS "trackingToken" TEXT;
ALTER TABLE "direct_inquiries" ADD COLUMN IF NOT EXISTS "lastMessageAt" TIMESTAMP(3);
ALTER TABLE "direct_inquiries" ADD COLUMN IF NOT EXISTS "providerLastReadAt" TIMESTAMP(3);

-- Backfill (only un-set rows → safe to re-run)
UPDATE "direct_inquiries"
SET "trackingToken" = gen_random_uuid()::text
WHERE "trackingToken" IS NULL;

UPDATE "direct_inquiries"
SET "lastMessageAt" = "createdAt"
WHERE "lastMessageAt" IS NULL;

-- Preserve old status semantics: a NEW inquiry stays unread for the provider.
UPDATE "direct_inquiries"
SET "providerLastReadAt" = CASE
  WHEN "status" = 'NEW' THEN TIMESTAMP '1970-01-01 00:00:00'
  ELSE "createdAt"
END
WHERE "providerLastReadAt" IS NULL;

-- Enforce NOT NULL + defaults now that existing rows are backfilled
ALTER TABLE "direct_inquiries"
  ALTER COLUMN "trackingToken" SET NOT NULL,
  ALTER COLUMN "lastMessageAt" SET NOT NULL,
  ALTER COLUMN "lastMessageAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "providerLastReadAt" SET NOT NULL,
  ALTER COLUMN "providerLastReadAt" SET DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "direct_inquiries_trackingToken_key"
  ON "direct_inquiries"("trackingToken");

CREATE INDEX IF NOT EXISTS "direct_inquiries_providerId_lastMessageAt_idx"
  ON "direct_inquiries"("providerId", "lastMessageAt");

COMMIT;
