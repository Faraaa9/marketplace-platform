-- Remap the 2 active providers whose only categories were retired legacy trees
-- (curated, deactivated 2026-05-24; paslaugos.lt, deactivated 2026-06-15) onto
-- their exact-name canonical paslaugurinka-taxonomy equivalents, so their public
-- profile pills render and they match leads again.
--
-- Background: the canonical refactor (strict SERVICE_CATEGORY_WHERE) + the legacy
-- deactivations left live FK rows pointing at categories no longer in the tree.
-- expandToMatchSet adds such ids bare → they match nothing. New traffic was never
-- affected (request creation assigns canonical ids); only old refs lingered.
--
-- Scope: ONLY denas-bardauskas (4 cats) and lukas (1 cat) — the sole ACTIVE
-- providers left pointing at legacy categories. Inactive test accounts and old
-- seed requests are intentionally left untouched.
--
-- All 5 legacy ids have a single unambiguous canonical twin, and neither provider
-- already holds the twin, so there is no (providerProfileId, categoryId) conflict.
--
-- Safe to re-run? Yes — matches 0 rows once applied (legacy ids no longer referenced).

UPDATE provider_profile_categories ppc
SET "categoryId" = m.canonical_id
FROM (VALUES
  ('0caacaf2c750','tax_9ecd1a28263cc2dcc0'),  -- Paslaugos verslui
  ('5ca1bb13b074','tax_8550aaef8c0536c502'),  -- Aplinka, sodas
  ('83ee8528ee0f','tax_25805794572e3d8bca'),  -- Buitinės paslaugos
  ('aee01c2083ba','tax_94b9f02499107422d1'),  -- Valymo paslaugos
  ('c000215c8f5e','tax_97d19f4a1fc360211c')   -- Statybos, apdaila
) AS m(legacy_id, canonical_id)
WHERE ppc."categoryId" = m.legacy_id
  AND ppc."providerProfileId" IN (
    SELECT id FROM provider_profiles WHERE slug IN ('denas-bardauskas','lukas')
  );
