-- Speeds up the /meistrai listing fan-out by giving the planner direct
-- indexes for the two filter sets used in the hot path:
--
--   1) users WHERE role = 'PROVIDER' AND "emailVerified" IS NOT NULL
--   2) provider_profiles WHERE "isActive" = true AND "moderationStatus" = 'APPROVED'
--
-- Both currently fall back to seq scan / single-column index + filter step.
-- Expected impact: 200-500ms saved per cold visit to /meistrai once the
-- planner picks these indexes.
--
-- CONCURRENTLY = no exclusive table lock; safe to run on a live database.
-- Must be run OUTSIDE a transaction (each statement on its own).

CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_role_emailVerified_idx"
  ON "users" ("role", "emailVerified");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "provider_profiles_isActive_moderationStatus_idx"
  ON "provider_profiles" ("isActive", "moderationStatus");
