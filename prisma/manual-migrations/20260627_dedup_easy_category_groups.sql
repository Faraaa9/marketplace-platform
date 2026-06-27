-- Taxonomy dedup — Phase 5, STAGE 1 (easy groups only)
--
-- Executed on production 2026-06-27 via Supabase MCP. This file is the portable,
-- re-runnable record (apply to staging/other envs as needed). Idempotent-ish:
-- once the easy duplicates are deactivated, re-running computes an empty map and
-- is a no-op.
--
-- WHAT: the service taxonomy (pageType='service', externalSource='paslaugurinka-taxonomy')
-- had ~40% duplicate rows — the same service name under different parents, each a
-- distinct id. That breaks request<->provider matching, because matching keys on
-- categoryId equality (request-notifications.ts:39 `categoryId IN matchSet`,
-- provider-eligibility.ts:38 `a.id === b.id`): two duplicate ids for the same
-- service never intersect, so the lead is silently dropped.
--
-- STAGE 1 = the 712 "easy" duplicate-name groups whose every copy is a leaf
-- (no children) → zero orphan risk. Picks one canonical per name by the rule
-- (most-used → has-children → shallower → smallest id), repoints the few real
-- references to the canonical, and deactivates the 1156 redundant copies.
--
-- Result on prod: active service categories 3255 -> 2098; redundant copies
-- 1313 -> 156; duplicate-name groups 820 -> 108; orphans 0; refs moved 7/9.
--
-- STAGE 2 (the 108 "hard" groups: 156 copies, 74 with children, 291 children to
-- reparent, only 2 remaining referenced) is DEFERRED — see NOTES.md. It needs
-- deepest-first child reparenting + human-confirmed canonical "homes".
--
-- REVERSIBILITY: deactivation is `isActive=false` (not a delete). Rollback =
-- `UPDATE categories SET "isActive"=true WHERE id IN (<deactivated ids>)` and
-- restore the moved references from the backup. On prod the backups are
-- `_backup_categories_20260627` and `_backup_dedup_refs_20260627`.

BEGIN;

CREATE TEMP TABLE _dmap ON COMMIT DROP AS
WITH canon AS (
  SELECT id, name, slug, "parentId", depth
  FROM categories
  WHERE "pageType" = 'service'
    AND "externalSource" = 'paslaugurinka-taxonomy'
    AND "isActive" = true
),
dup_names AS (
  SELECT name FROM canon GROUP BY name HAVING count(*) > 1
),
rows AS (
  SELECT c.*,
    (SELECT count(*) FROM provider_profile_categories p WHERE p."categoryId" = c.id)
  + (SELECT count(*) FROM service_request_categories s WHERE s."categoryId" = c.id)
  + (SELECT count(*) FROM service_requests r WHERE r."categoryId" = c.id) AS usage,
    EXISTS (SELECT 1 FROM categories ch WHERE ch."parentId" = c.id) AS has_children
  FROM canon c JOIN dup_names d ON c.name = d.name
),
ranked AS (
  SELECT *,
    row_number() OVER (PARTITION BY name ORDER BY usage DESC, has_children DESC, depth ASC, id ASC) AS rn,
    first_value(id) OVER (PARTITION BY name ORDER BY usage DESC, has_children DESC, depth ASC, id ASC) AS canon_id,
    count(*) FILTER (WHERE has_children) OVER (PARTITION BY name) AS parents_in_grp
  FROM rows
)
SELECT id AS salinamas_id, slug AS salinamas_slug, name, canon_id
FROM ranked
WHERE rn > 1 AND parents_in_grp = 0;

-- Move provider category selections to the canonical id (collision-safe:
-- drop the row if the provider already has the canonical, else repoint).
DELETE FROM provider_profile_categories t USING _dmap m
WHERE t."categoryId" = m.salinamas_id
  AND EXISTS (
    SELECT 1 FROM provider_profile_categories t2
    WHERE t2."providerProfileId" = t."providerProfileId" AND t2."categoryId" = m.canon_id
  );
UPDATE provider_profile_categories t SET "categoryId" = m.canon_id
FROM _dmap m WHERE t."categoryId" = m.salinamas_id;

-- Move request category selections (same collision handling on requestId).
DELETE FROM service_request_categories t USING _dmap m
WHERE t."categoryId" = m.salinamas_id
  AND EXISTS (
    SELECT 1 FROM service_request_categories t2
    WHERE t2."requestId" = t."requestId" AND t2."categoryId" = m.canon_id
  );
UPDATE service_request_categories t SET "categoryId" = m.canon_id
FROM _dmap m WHERE t."categoryId" = m.salinamas_id;

-- Move the single-FK request category.
UPDATE service_requests t SET "categoryId" = m.canon_id
FROM _dmap m WHERE t."categoryId" = m.salinamas_id;

-- Deactivate the redundant copies (reversible — not deleted).
UPDATE categories SET "isActive" = false
WHERE id IN (SELECT salinamas_id FROM _dmap) AND "isActive" = true;

COMMIT;
