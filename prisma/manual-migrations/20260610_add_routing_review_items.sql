-- Routing Review Queue — human-in-the-loop corrections (MVP).
--
-- Adds the `routing_review_items` table: one row per (request, routingVersion)
-- holding the routed request snapshot, the AI routing decision, and the human
-- review outcome (PENDING | APPROVED | CORRECTED). Reviewed rows export as eval
-- data in the golden_eval JSONL shape (suggested_* = AI, gold_* = human label).
-- Purely additive — no existing table is modified, no FK to service_requests
-- by design (kept fully decoupled; `requestId` is the join key for tooling).
--
-- Idempotent: safe to re-run. Equivalent to `prisma db push` for this model.

CREATE TABLE IF NOT EXISTS "routing_review_items" (
  "id"                           TEXT NOT NULL,
  "requestId"                    TEXT NOT NULL,
  "decisionLogId"                TEXT,
  "routingVersion"               TEXT NOT NULL DEFAULT 'multi-routing-v4',

  -- Routed request snapshot (denormalized so eval export needs no joins)
  "title"                        TEXT NOT NULL,
  "description"                  TEXT NOT NULL,
  "city"                         TEXT NOT NULL DEFAULT '',
  "requestStatus"                TEXT,

  -- AI routing decision
  "aiPrimaryCategoryId"          TEXT,
  "aiPrimaryCategoryName"        TEXT,
  "aiCategoryIds"                TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "aiCategoryNames"              TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "aiConfidence"                 DOUBLE PRECISION,
  "aiModel"                      TEXT,

  -- Review state: PENDING | APPROVED | CORRECTED
  "status"                       TEXT NOT NULL DEFAULT 'PENDING',
  "reviewerId"                   TEXT,
  "reviewedAt"                   TIMESTAMP(3),

  -- Human correction (only when status = CORRECTED)
  "correctedPrimaryCategoryId"   TEXT,
  "correctedPrimaryCategoryName" TEXT,
  "correctedCategoryIds"         TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "correctedCategoryNames"       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "correctedIsAmbiguous"         BOOLEAN,
  "correctionNotes"              TEXT,

  "createdAt"                    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "routing_review_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "routing_review_items_requestId_routingVersion_key"
  ON "routing_review_items" ("requestId", "routingVersion");

CREATE INDEX IF NOT EXISTS "routing_review_items_status_createdAt_idx"
  ON "routing_review_items" ("status", "createdAt");

CREATE INDEX IF NOT EXISTS "routing_review_items_reviewedAt_idx"
  ON "routing_review_items" ("reviewedAt");
