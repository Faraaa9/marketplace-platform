-- Migration: add ProviderProfile.slug (human-readable URL identifier).
--
-- Strategy:
--   1. Add nullable `slug` TEXT column.
--   2. Backfill from `users.name` using TRANSLATE for LT diacritics
--      (lowercased, non-alphanumeric → '-', trimmed).
--   3. Resolve collisions by appending a short userId suffix to duplicates.
--   4. Make column NOT NULL.
--   5. Add a UNIQUE index (also created via Prisma `@unique`, but we
--      need it in place before NOT NULL flips so queries are fast).
--
-- Safe to re-run? No — this is a one-shot migration. Subsequent slug
-- changes happen at row level via the provider-onboarding code path.

BEGIN;

-- 1. Add nullable slug column ---------------------------------------
ALTER TABLE "provider_profiles" ADD COLUMN "slug" TEXT;

-- 2. Backfill: derive from user.name. TRANSLATE swaps the LT
--    diacritic block to ASCII equivalents in a single pass, then we
--    strip non-alphanumeric chars and collapse them to '-'.
UPDATE "provider_profiles" pp
SET "slug" = TRIM(
  BOTH '-' FROM
  REGEXP_REPLACE(
    LOWER(
      TRANSLATE(
        COALESCE(NULLIF(TRIM(u.name), ''), 'tiekejas'),
        'ąčęėįšųūžĄČĘĖĮŠŲŪŽ',
        'aceeisuuzaceeisuuz'
      )
    ),
    '[^a-z0-9]+',
    '-',
    'g'
  )
)
FROM "users" u
WHERE pp."userId" = u.id AND pp."slug" IS NULL;

-- 2b. Defensive: any rows that ended up with an empty slug (rare —
--     only if name was somehow all punctuation) get a userId-based one.
UPDATE "provider_profiles"
SET "slug" = 'tiekejas-' || SUBSTRING("userId" FROM 1 FOR 6)
WHERE "slug" IS NULL OR "slug" = '';

-- 3. Resolve collisions: when two providers share the same slug, the
--    older (lower createdAt) keeps it; everyone else gets a userId
--    suffix appended. ROW_NUMBER over the slug partition gives us
--    deterministic ordering.
WITH duplicates AS (
  SELECT id, slug,
         ROW_NUMBER() OVER (PARTITION BY slug ORDER BY "createdAt") AS rn
  FROM "provider_profiles"
  WHERE slug IS NOT NULL
)
UPDATE "provider_profiles" pp
SET slug = pp.slug || '-' || SUBSTRING(pp."userId" FROM 1 FOR 6)
FROM duplicates d
WHERE pp.id = d.id AND d.rn > 1;

-- 4. Flip to NOT NULL after backfill is complete --------------------
ALTER TABLE "provider_profiles" ALTER COLUMN "slug" SET NOT NULL;

-- 5. Unique index ---------------------------------------------------
CREATE UNIQUE INDEX "provider_profiles_slug_key" ON "provider_profiles"("slug");

COMMIT;
