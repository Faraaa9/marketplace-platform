-- Adds the email opt-out flag behind the unsubscribe link in new-lead alert emails.
-- Additive + backward compatible: defaults to false, so every existing user keeps
-- receiving alerts and pre-deploy code never reads the column.
--
-- Apply once against the production DB BEFORE deploying the schema change
-- (Prisma selects every scalar on unselected reads, so the column must exist first).

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "emailAlertsOptOut" BOOLEAN NOT NULL DEFAULT false;
