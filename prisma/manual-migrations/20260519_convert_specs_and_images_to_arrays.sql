-- Migration: convert ProviderProfile.specializations and .images from JSON-encoded strings to native TEXT[] arrays
--
-- Strategy:
--   1. Add new TEXT[] temp columns.
--   2. Backfill from the existing JSON strings (handle both ["url",..] and [{url:".."},..] shapes for images).
--   3. Drop the old columns.
--   4. Rename the temp columns back to the original names.
--   5. Add a GIN index on the new `specializations` array for fast `hasSome` / `has` filtering.
--
-- Safe with empty / null / "[]" / malformed JSON values: COALESCE to '{}' on failure.

BEGIN;

-- 1. Add temp columns ------------------------------------------------
ALTER TABLE "provider_profiles" ADD COLUMN "specializations_arr" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "provider_profiles" ADD COLUMN "images_arr" TEXT[] NOT NULL DEFAULT '{}';

-- 2a. Backfill specializations ---------------------------------------
-- Each row's specializations is a JSON string array like ["santechnika","statyba"].
-- Guard against rows that are NULL, empty, "[]" or non-JSON.
UPDATE "provider_profiles"
SET "specializations_arr" = COALESCE(
  (
    SELECT ARRAY_AGG(elem #>> '{}')
    FROM jsonb_array_elements(
      CASE
        WHEN "specializations" IS NULL OR "specializations" = '' THEN '[]'::jsonb
        ELSE "specializations"::jsonb
      END
    ) AS elem
    WHERE jsonb_typeof(elem) = 'string'
  ),
  '{}'
)
WHERE "specializations" IS NOT NULL
  AND "specializations" <> ''
  AND "specializations" <> '[]';

-- 2b. Backfill images ------------------------------------------------
-- Existing rows may contain either:
--   ["https://..."]                                  -> use the string directly
--   [{"url":"https://...","publicId":"..."}]         -> use elem ->> 'url'
-- Anything else is filtered out.
UPDATE "provider_profiles"
SET "images_arr" = COALESCE(
  (
    SELECT ARRAY_AGG(extracted)
    FROM (
      SELECT
        CASE
          WHEN jsonb_typeof(elem) = 'string' THEN elem #>> '{}'
          WHEN jsonb_typeof(elem) = 'object' THEN elem ->> 'url'
          ELSE NULL
        END AS extracted
      FROM jsonb_array_elements(
        CASE
          WHEN "images" IS NULL OR "images" = '' THEN '[]'::jsonb
          ELSE "images"::jsonb
        END
      ) AS elem
    ) AS extracted_rows
    WHERE extracted IS NOT NULL AND extracted <> ''
  ),
  '{}'
)
WHERE "images" IS NOT NULL
  AND "images" <> ''
  AND "images" <> '[]';

-- 3. Drop the old columns --------------------------------------------
ALTER TABLE "provider_profiles" DROP COLUMN "specializations";
ALTER TABLE "provider_profiles" DROP COLUMN "images";

-- 4. Rename temp -> final --------------------------------------------
ALTER TABLE "provider_profiles" RENAME COLUMN "specializations_arr" TO "specializations";
ALTER TABLE "provider_profiles" RENAME COLUMN "images_arr" TO "images";

-- 5. GIN index on specializations for fast array contains filtering --
CREATE INDEX IF NOT EXISTS "provider_profiles_specializations_idx"
  ON "provider_profiles" USING GIN ("specializations");

COMMIT;
