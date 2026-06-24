-- Canonical category tree cleanup.
--
-- Runtime request/provider/profile/search flows now use only:
--   externalSource = 'paslaugurinka-taxonomy'
--   pageType       = 'service'
--   isActive       = true
--
-- Keep legacy rows for historical/import references, but remove them from all
-- active category trees so they cannot be selected, matched, or routed to.

UPDATE "categories"
SET
  "isActive" = false,
  "pageType" = NULL,
  "updatedAt" = NOW()
WHERE "externalSource" IN ('paslaugos.lt', 'curated')
  AND (
    "isActive" = true
    OR "pageType" IS NOT NULL
  );
