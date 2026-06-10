-- Production blocker fix: persistent webhook idempotency + refund support.
--
-- 1. `webhook_events` records every external webhook delivery we've processed.
--    The unique (source, externalId) constraint makes redelivered events a
--    no-op even when the in-memory CreditTransaction unique check would miss
--    (e.g., when one Stripe event triggers multiple side effects, or when a
--    server crashes between the side effect and the 200 response).
--
-- 2. `credit_transactions.stripeChargeId` lets us correlate refunds
--    (charge.refunded webhook → original PURCHASE → REFUND_REVERSAL row).
--    Without this column there is no path from a Stripe Dashboard refund
--    back to the granted credits.
--
-- Safe to run twice (IF NOT EXISTS / safe ALTERs).

CREATE TABLE IF NOT EXISTS "webhook_events" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "eventType" TEXT,
  "payload" JSONB,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_source_externalId_key"
  ON "webhook_events" ("source", "externalId");

CREATE INDEX IF NOT EXISTS "webhook_events_processedAt_idx"
  ON "webhook_events" ("processedAt");

-- Add charge correlation to the ledger. Nullable: legacy rows pre-launch
-- never had it, and admin/starter grants never will.
ALTER TABLE "credit_transactions"
  ADD COLUMN IF NOT EXISTS "stripeChargeId" TEXT;

CREATE INDEX IF NOT EXISTS "credit_transactions_stripeChargeId_idx"
  ON "credit_transactions" ("stripeChargeId");
