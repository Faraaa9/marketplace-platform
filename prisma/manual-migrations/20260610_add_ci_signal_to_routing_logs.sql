-- Category Intelligence shadow signal columns on routing_decision_logs.
-- Additive + nullable: observational only, never affects routing selection,
-- provider notifications, lead visibility, or payments. Written by the shadow
-- path (src/lib/routing/shadow.ts) behind ROUTING_SHADOW_ENABLED.
--
-- Kept outside prisma/migrations because this project does not yet have a
-- Prisma migration baseline for the existing schema.
--
-- ciShouldReview : should this routing decision go to manual review
--                  (ambiguity / redirect signal from the phrase brain)
-- ciConfidence   : routing confidence after the intelligence nudge/cap
-- ciSignal       : compact JSON of the full signal (matched phrases, boosts,
--                  ambiguity signals, redirect hints, review reasons, version)

ALTER TABLE "routing_decision_logs"
ADD COLUMN IF NOT EXISTS "ciShouldReview" BOOLEAN;

ALTER TABLE "routing_decision_logs"
ADD COLUMN IF NOT EXISTS "ciConfidence" DOUBLE PRECISION;

ALTER TABLE "routing_decision_logs"
ADD COLUMN IF NOT EXISTS "ciSignal" JSONB;
