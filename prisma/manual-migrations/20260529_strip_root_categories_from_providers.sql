-- 2026-05-29 — Strip broad ROOT (depth-0) categories from provider profiles.
--
-- Why: lead matching (expandToMatchSet) expands DOWN from a provider's
-- categories, so a provider holding a root like "Statybos, apdaila" matches
-- EVERY leaf under it (an electrician would receive plumbing leads). Profiles
-- should carry only the specific sub-categories they actually serve. The AI
-- picker stopped saving roots as of 2026-05-29; this cleans existing rows.
--
-- Safety: only removes a root link when the provider still has at least one
-- non-root (depth >= 1) category — so no profile is left with zero categories.
-- The 10 providers that hold ONLY root categories (mostly TEST/DEMO accounts)
-- are intentionally left untouched and handled separately.
--
-- Idempotent: re-running deletes nothing more.

DELETE FROM provider_profile_categories ppc
USING categories c
WHERE ppc."categoryId" = c.id
  AND c.depth = 0
  AND EXISTS (
    SELECT 1
    FROM provider_profile_categories x
    JOIN categories cx ON cx.id = x."categoryId"
    WHERE x."providerProfileId" = ppc."providerProfileId"
      AND cx.depth >= 1
  );
