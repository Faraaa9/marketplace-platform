-- Migration: add per-profile SEO fields to ProviderProfile
--
-- Backs unique <title>/meta description on /meistrai/[slug] and richer
-- LocalBusiness structured data. All fields nullable / default empty so
-- legacy rows continue to work via runtime fallbacks until AI regenerates.

BEGIN;

ALTER TABLE "provider_profiles"
  ADD COLUMN IF NOT EXISTS "seoTitle"       TEXT,
  ADD COLUMN IF NOT EXISTS "seoDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "primaryService" TEXT,
  ADD COLUMN IF NOT EXISTS "primaryCity"    TEXT,
  ADD COLUMN IF NOT EXISTS "serviceArea"    TEXT[] NOT NULL DEFAULT '{}';

COMMIT;
