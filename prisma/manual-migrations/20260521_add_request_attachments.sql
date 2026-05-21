-- Migration: add ServiceRequest.attachmentUrls
--
-- Adds a TEXT[] column holding Cloudinary photo URLs attached to a service
-- request (e.g. photos of a room to renovate, a broken item). Purely
-- additive — existing rows default to an empty array. No data is modified.
--
-- Safe to re-run: ADD COLUMN IF NOT EXISTS and SET NOT NULL are idempotent.

BEGIN;

ALTER TABLE "service_requests"
  ADD COLUMN IF NOT EXISTS "attachmentUrls" TEXT[] NOT NULL DEFAULT '{}';

-- Reconcile: if the column pre-existed as nullable, enforce NOT NULL to match
-- the Prisma scalar-list type (String[]). No-op when already NOT NULL.
ALTER TABLE "service_requests"
  ALTER COLUMN "attachmentUrls" SET NOT NULL;

COMMIT;
