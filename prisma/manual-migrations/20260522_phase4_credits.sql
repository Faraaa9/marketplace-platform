-- Migration: Phase 4 — pay-per-lead credit model
--
-- Replaces the BASIC/PRO subscription model with credits. A provider spends
-- 1 credit to unlock a client request (lead), which reveals the client's
-- contact details and unlocks responding.
--
-- Adds:
--   - credit_packs        — admin-configurable credit bundles for purchase
--   - credit_transactions — append-only credit ledger (purchases, spends, grants)
--   - lead_unlocks        — one row per (request, provider) unlock
--   - provider_profiles.creditBalance      — cached credit balance
--   - platform_settings.freeStarterCredits — credits granted to new providers
--
-- Purely additive. Existing tables, columns and data are untouched. The
-- subscriptions table is intentionally left in place (retired in code,
-- physically dropped in Phase 5 cleanup).
--
-- Safe to re-run: every statement uses IF NOT EXISTS. Index/constraint names
-- match Prisma's naming convention so a later `prisma db push` sees no drift.

BEGIN;

-- ── credit_packs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "credit_packs" (
  "id"         TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "credits"    INTEGER NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "currency"   TEXT NOT NULL DEFAULT 'eur',
  "isActive"   BOOLEAN NOT NULL DEFAULT true,
  "sortOrder"  INTEGER NOT NULL DEFAULT 0,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "credit_packs_pkey" PRIMARY KEY ("id")
);

-- ── credit_transactions (append-only ledger) ─────────────────────────────
CREATE TABLE IF NOT EXISTS "credit_transactions" (
  "id"                      TEXT NOT NULL,
  "providerProfileId"       TEXT NOT NULL,
  "amount"                  INTEGER NOT NULL,
  "balanceAfter"            INTEGER NOT NULL,
  "type"                    TEXT NOT NULL,
  "note"                    TEXT,
  "requestId"               TEXT,
  "creditPackId"            TEXT,
  "stripeCheckoutSessionId" TEXT,
  "adminUserId"             TEXT,
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "credit_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "credit_transactions_providerProfileId_fkey"
    FOREIGN KEY ("providerProfileId") REFERENCES "provider_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Unique purchase-idempotency key: a redelivered Stripe webhook cannot
-- credit the same checkout session twice.
CREATE UNIQUE INDEX IF NOT EXISTS "credit_transactions_stripeCheckoutSessionId_key"
  ON "credit_transactions" ("stripeCheckoutSessionId");

CREATE INDEX IF NOT EXISTS "credit_transactions_providerProfileId_createdAt_idx"
  ON "credit_transactions" ("providerProfileId", "createdAt");

-- ── lead_unlocks ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "lead_unlocks" (
  "id"                TEXT NOT NULL,
  "requestId"         TEXT NOT NULL,
  "providerProfileId" TEXT NOT NULL,
  "source"            TEXT NOT NULL DEFAULT 'unlock',
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lead_unlocks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lead_unlocks_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "service_requests"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "lead_unlocks_providerProfileId_fkey"
    FOREIGN KEY ("providerProfileId") REFERENCES "provider_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- One unlock per (request, provider). Also the concurrency guard against a
-- double-click charging two credits for the same lead.
CREATE UNIQUE INDEX IF NOT EXISTS "lead_unlocks_requestId_providerProfileId_key"
  ON "lead_unlocks" ("requestId", "providerProfileId");

CREATE INDEX IF NOT EXISTS "lead_unlocks_providerProfileId_idx"
  ON "lead_unlocks" ("providerProfileId");

CREATE INDEX IF NOT EXISTS "lead_unlocks_requestId_idx"
  ON "lead_unlocks" ("requestId");

-- ── provider_profiles.creditBalance ──────────────────────────────────────
ALTER TABLE "provider_profiles"
  ADD COLUMN IF NOT EXISTS "creditBalance" INTEGER NOT NULL DEFAULT 0;

-- ── platform_settings.freeStarterCredits ─────────────────────────────────
ALTER TABLE "platform_settings"
  ADD COLUMN IF NOT EXISTS "freeStarterCredits" INTEGER NOT NULL DEFAULT 3;

COMMIT;
