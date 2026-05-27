-- AI feature audit trail. Stores operational metadata only, not raw prompts
-- or user/provider content.

BEGIN;

CREATE TABLE IF NOT EXISTS "ai_runs" (
  "id" TEXT NOT NULL,
  "feature" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "provider" TEXT,
  "model" TEXT,
  "promptVersion" TEXT,
  "latencyMs" INTEGER,
  "actorUserId" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  "errorCode" TEXT,
  "metadataJson" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ai_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_runs_feature_createdAt_idx"
  ON "ai_runs"("feature", "createdAt");

CREATE INDEX IF NOT EXISTS "ai_runs_actorUserId_createdAt_idx"
  ON "ai_runs"("actorUserId", "createdAt");

CREATE INDEX IF NOT EXISTS "ai_runs_entityType_entityId_idx"
  ON "ai_runs"("entityType", "entityId");

COMMIT;
