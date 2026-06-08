-- Multi-routing v4 — SHADOW mode (Phase 1).
--
-- Adds the `routing_decision_logs` table: one row per created request capturing
-- the OLD (current production) categories vs the v4 shadow routing, for off-line
-- comparison. Purely additive + observational — no existing table is modified,
-- and writing rows never affects provider notifications, lead visibility, or
-- payments. No FK to service_requests by design (kept fully decoupled).
--
-- Idempotent: safe to re-run. Equivalent to `prisma db push` for this model.

CREATE TABLE IF NOT EXISTS "routing_decision_logs" (
  "id"                       TEXT NOT NULL,
  "requestId"                TEXT NOT NULL,
  "routingVersion"           TEXT NOT NULL DEFAULT 'multi-routing-v4',
  "oldPrimaryCategoryId"     TEXT,
  "oldPrimaryCategoryName"   TEXT,
  "oldCategoryIds"           TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "v4CategoryNames"          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "v4CategoryIds"            TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "unmatchedCategoryNames"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "categoryCount"            INTEGER NOT NULL DEFAULT 0,
  "projectType"              TEXT,
  "routingTags"              TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "routingConfidence"        DOUBLE PRECISION,
  "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "routing_decision_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "routing_decision_logs_requestId_idx"
  ON "routing_decision_logs" ("requestId");

CREATE INDEX IF NOT EXISTS "routing_decision_logs_routingVersion_createdAt_idx"
  ON "routing_decision_logs" ("routingVersion", "createdAt");
