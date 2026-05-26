-- Additional admin-controlled badge tiers on provider profiles.
-- Existing flags: isVerified (blue check), isPremium (gold "Aukso meistras").
-- Adds the "Jaunasis talentas" (rising star) and "GOAT" tiers.
ALTER TABLE "provider_profiles"
  ADD COLUMN IF NOT EXISTS "isYoungTalent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isGoat"        BOOLEAN NOT NULL DEFAULT false;
