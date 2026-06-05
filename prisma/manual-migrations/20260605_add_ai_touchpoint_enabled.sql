ALTER TABLE "ai_touchpoint_configs"
ADD COLUMN IF NOT EXISTS "enabled" BOOLEAN NOT NULL DEFAULT true;
