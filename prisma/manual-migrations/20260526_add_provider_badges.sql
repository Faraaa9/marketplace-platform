-- Verification + Premium badges on provider profiles.
-- isVerified already exists (carried over from SupplierRecord absorption).
-- Add isPremium as a parallel admin-controlled flag for the "Pro" tier badge.
ALTER TABLE "provider_profiles"
  ADD COLUMN IF NOT EXISTS "isPremium" BOOLEAN NOT NULL DEFAULT false;
