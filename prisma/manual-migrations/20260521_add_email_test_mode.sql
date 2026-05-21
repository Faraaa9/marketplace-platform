-- Migration: add PlatformSettings.emailTestMode + emailAllowlist
--
-- Adds an outbound-email "test mode" to the platform_settings singleton.
-- When emailTestMode is true, sendEmail() delivers only to addresses listed
-- in emailAllowlist; every other recipient is suppressed. This shields real
-- clients from email triggered while developing/testing the platform.
-- Purely additive — the existing row defaults to test mode off, empty list.
--
-- Safe to re-run: ADD COLUMN IF NOT EXISTS and SET NOT NULL are idempotent.

BEGIN;

ALTER TABLE "platform_settings"
  ADD COLUMN IF NOT EXISTS "emailTestMode" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "platform_settings"
  ADD COLUMN IF NOT EXISTS "emailAllowlist" TEXT[] NOT NULL DEFAULT '{}';

-- Reconcile: if emailAllowlist pre-existed as nullable, enforce NOT NULL to
-- match the Prisma scalar-list type (String[]). No-op when already NOT NULL.
ALTER TABLE "platform_settings"
  ALTER COLUMN "emailAllowlist" SET NOT NULL;

COMMIT;
