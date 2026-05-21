-- Migration: add Response conversation tracking (lastMessageAt, providerLastReadAt)
--
-- Adds two denormalized timestamp columns to "responses" so the provider
-- conversation inbox can sort threads by recent activity and flag unread
-- threads without scanning every message:
--   lastMessageAt       — time of the latest message, or the response's own
--                         creation time when the thread has no messages yet.
--   providerLastReadAt  — last time the provider opened / answered the thread.
-- A thread is unread for the provider when lastMessageAt > providerLastReadAt.
--
-- Safe to re-run: ADD COLUMN IF NOT EXISTS is idempotent, and each backfill
-- only touches rows where the column is still NULL.

BEGIN;

ALTER TABLE "responses"
  ADD COLUMN IF NOT EXISTS "lastMessageAt" TIMESTAMP(3);
ALTER TABLE "responses"
  ADD COLUMN IF NOT EXISTS "providerLastReadAt" TIMESTAMP(3);

-- Backfill lastMessageAt from the latest message, falling back to the
-- response creation time for threads with no messages.
UPDATE "responses" r
SET "lastMessageAt" = COALESCE(
  (SELECT MAX(m."createdAt") FROM "messages" m WHERE m."responseId" = r."id"),
  r."createdAt"
)
WHERE r."lastMessageAt" IS NULL;

-- Backfill providerLastReadAt = lastMessageAt: clean slate, so nothing shows
-- as unread on launch — only messages sent after this migration count.
UPDATE "responses"
SET "providerLastReadAt" = "lastMessageAt"
WHERE "providerLastReadAt" IS NULL;

-- Enforce NOT NULL + default now that existing rows are backfilled.
ALTER TABLE "responses"
  ALTER COLUMN "lastMessageAt" SET NOT NULL,
  ALTER COLUMN "lastMessageAt" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "responses"
  ALTER COLUMN "providerLastReadAt" SET NOT NULL,
  ALTER COLUMN "providerLastReadAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Index for the provider conversation inbox (filter by provider, sort by
-- recent activity). Replaces the plain providerId index — the compound index
-- still serves providerId-only lookups via its leftmost prefix.
CREATE INDEX IF NOT EXISTS "responses_providerId_lastMessageAt_idx"
  ON "responses"("providerId", "lastMessageAt");
DROP INDEX IF EXISTS "responses_providerId_idx";

COMMIT;
