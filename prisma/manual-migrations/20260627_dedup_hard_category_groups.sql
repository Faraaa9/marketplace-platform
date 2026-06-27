-- Taxonomy dedup — Phase 5, STAGE 2 (the 108 "hard" duplicate-name groups)
--
-- Companion to STAGE 1 (20260627_dedup_easy_category_groups.sql). Stage 1 merged
-- the 712 leaf-only groups (3255 -> 2098 active). Stage 2 merges the remaining
-- 108 groups whose copies HAVE CHILDREN, so the children must be reparented onto
-- the surviving canonical before the duplicate is retired.
--
-- WHY THIS IS SAFE AS ONE SET-BASED PASS (no iterative deepest-first needed):
-- the canonical for every duplicate NAME is computed up front (rule + 7 founder
-- overrides), so the map copy_id -> canon_id always lands on a FINAL survivor,
-- never on another copy. One UPDATE then repoints every active node whose parent
-- is a removed copy onto that copy's canonical — at any nesting depth — and after
-- the copies are deactivated there can be no active duplicate siblings left
-- (only one copy per name stays active, by construction).
--
-- CANONICAL RULE: per name, first by (usage DESC, has_children DESC, depth ASC,
--   id ASC). 7 names override the rule to a human-chosen home branch:
--     Kompiuterių remontas / Interneto svetainių kūrimas / IT specialistai -> Internetas, IT
--     Grafikos dizaineriai -> Reklama, dizainas, spauda
--     Pagalbiniai darbininkai -> Statybos, apdaila   (demotes the Transportas copy
--        that holds the one usage=1 reference -> that ref is repointed below)
--     Dietologai -> Sveikata, gydymas
--     Stiklo konstrukcijos, montavimas -> Statybos, apdaila
--
-- PRE-FLIGHT (verified on prod via SELECT, 2026-06-27):
--   copies_to_deactivate = 156, groups = 108, canon_not_active = 0,
--   canon_is_a_copy = 0, children_to_reparent = 292, refs_to_move = 3,
--   override_target_missing = 0, final_active_count = 1942 (= unique names).
--
-- THE 3 REFERENCES (all provider_profile_categories):
--   Kalviai, kalvystės darbai  — provider already has canonical -> delete copy link
--   Reklamos paslaugos         — provider already has canonical -> delete copy link
--   Pagalbiniai darbininkai    — no collision -> repoint copy -> Statybos canonical
--   (service_request_categories / service_requests: 0 rows on copies.)
--
-- REVERSIBILITY: deactivation is isActive=false (not delete); reparenting and the
-- ref change are captured in the backups below. Rollback block at the bottom.

BEGIN;

-- 0. The dedup map: every removable copy -> its final canonical.
CREATE TEMP TABLE _dmap2 ON COMMIT DROP AS
WITH canon AS (
  SELECT id, name, "parentId", depth
  FROM categories
  WHERE "pageType" = 'service' AND "externalSource" = 'paslaugurinka-taxonomy' AND "isActive" = true
),
dup_names AS (SELECT name FROM canon GROUP BY name HAVING count(*) > 1),
ov(name, canon_id) AS (VALUES
  ('Kompiuterių remontas','tax_281f03e83661b442d1'),
  ('Interneto svetainių kūrimas','tax_edd9ee64d574a8ab2c'),
  ('IT specialistai','tax_f0b11077ea2f4e6fb2'),
  ('Grafikos dizaineriai','tax_8079d04b3b60de5bbc'),
  ('Pagalbiniai darbininkai','tax_b0f50752a43790a950'),
  ('Dietologai','tax_e81ae0162fe434a811'),
  ('Stiklo konstrukcijos, montavimas','tax_efa48690c74af0d01d')
),
rows AS (
  SELECT c.*,
    (SELECT count(*) FROM provider_profile_categories p WHERE p."categoryId" = c.id)
   +(SELECT count(*) FROM service_request_categories s WHERE s."categoryId" = c.id)
   +(SELECT count(*) FROM service_requests r WHERE r."categoryId" = c.id) AS usage,
    EXISTS(SELECT 1 FROM categories ch WHERE ch."parentId" = c.id AND ch."isActive") AS hc
  FROM canon c JOIN dup_names d ON c.name = d.name
),
ranked AS (
  SELECT *, first_value(id) OVER (
    PARTITION BY name ORDER BY usage DESC, hc DESC, depth ASC, id ASC) AS rule_canon
  FROM rows
),
cp AS (
  SELECT DISTINCT r.name, COALESCE(ov.canon_id, r.rule_canon) AS canon_id
  FROM ranked r LEFT JOIN ov USING (name)
)
SELECT r.id AS copy_id, cp.canon_id
FROM ranked r JOIN cp USING (name)
WHERE r.id <> cp.canon_id;

-- Guard: stop the whole transaction unless the map is exactly the verified shape.
DO $$
DECLARE n_copies int; n_bad int;
BEGIN
  SELECT count(*) INTO n_copies FROM _dmap2;
  IF n_copies <> 156 THEN RAISE EXCEPTION 'expected 156 copies, got %', n_copies; END IF;
  SELECT count(*) INTO n_bad FROM _dmap2 m
    WHERE m.canon_id IN (SELECT copy_id FROM _dmap2)
       OR NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = m.canon_id AND c."isActive");
  IF n_bad <> 0 THEN RAISE EXCEPTION 'canonical map invalid: % bad rows', n_bad; END IF;
END $$;

-- 1. Backups.
CREATE TABLE _backup_categories_dedup2_20260627 AS SELECT * FROM categories;
CREATE TABLE _backup_dedup2_ppc_20260627 AS
  SELECT * FROM provider_profile_categories WHERE "categoryId" IN (SELECT copy_id FROM _dmap2);

-- 2. Repoint references (collision-safe: update where the owner doesn't already
--    hold the canonical, then delete any copy-pointing rows that remain).
UPDATE provider_profile_categories ppc SET "categoryId" = m.canon_id
FROM _dmap2 m
WHERE ppc."categoryId" = m.copy_id
  AND NOT EXISTS (SELECT 1 FROM provider_profile_categories x
                  WHERE x."providerProfileId" = ppc."providerProfileId" AND x."categoryId" = m.canon_id);
DELETE FROM provider_profile_categories ppc USING _dmap2 m WHERE ppc."categoryId" = m.copy_id;

UPDATE service_request_categories s SET "categoryId" = m.canon_id
FROM _dmap2 m
WHERE s."categoryId" = m.copy_id
  AND NOT EXISTS (SELECT 1 FROM service_request_categories x
                  WHERE x."requestId" = s."requestId" AND x."categoryId" = m.canon_id);
DELETE FROM service_request_categories s USING _dmap2 m WHERE s."categoryId" = m.copy_id;

UPDATE service_requests r SET "categoryId" = m.canon_id
FROM _dmap2 m WHERE r."categoryId" = m.copy_id;

-- 3. Reparent: move every active child off a removed copy to that copy's
--    canonical. One statement handles arbitrary nesting (deepest-first is moot —
--    the map points straight at survivors).
UPDATE categories c SET "parentId" = m.canon_id
FROM _dmap2 m
WHERE c."parentId" = m.copy_id AND c."isActive" = true;

-- 4. Retire the 156 copies (reversible; same convention as Stage 1).
UPDATE categories SET "isActive" = false, "pageType" = NULL
WHERE id IN (SELECT copy_id FROM _dmap2);

COMMIT;

-- ── POST-MIGRATION VALIDATION (run as SELECTs; all must hold) ──────────────────
-- A. zero remaining duplicate-name groups among active service categories:
--    WITH a AS (SELECT name FROM categories WHERE "pageType"='service'
--      AND "externalSource"='paslaugurinka-taxonomy' AND "isActive")
--    SELECT count(*) FROM (SELECT name FROM a GROUP BY name HAVING count(*)>1) d;  -- expect 0
-- B. zero orphans (active node whose parent is inactive):
--    SELECT count(*) FROM categories c WHERE c."isActive" AND c."parentId" IS NOT NULL
--      AND NOT EXISTS (SELECT 1 FROM categories p WHERE p.id=c."parentId" AND p."isActive"); -- expect 0
-- C. final active service count = 1942:
--    SELECT count(*) FROM categories WHERE "pageType"='service'
--      AND "externalSource"='paslaugurinka-taxonomy' AND "isActive";              -- expect 1942
-- D. then: pnpm test:routing-all  (golden eval invariants, harmful drops <=5)

-- ── ROLLBACK (if validation fails) ────────────────────────────────────────────
-- BEGIN;
--   UPDATE categories c SET "isActive"=b."isActive", "pageType"=b."pageType", "parentId"=b."parentId"
--     FROM _backup_categories_dedup2_20260627 b WHERE c.id=b.id;
--   DELETE FROM provider_profile_categories WHERE id IN (SELECT id FROM _backup_dedup2_ppc_20260627);
--   INSERT INTO provider_profile_categories SELECT * FROM _backup_dedup2_ppc_20260627;
-- COMMIT;
