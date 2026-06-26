-- Adds the provider profile preview (side drawer) kill switch to platform_settings.
-- Additive + backward compatible: defaults to true, so existing rows and
-- pre-deploy code keep the quick-preview drawer enabled. When set to false the
-- /meistrai cards skip the drawer and click straight through to the full profile.
--
-- Apply once against the production DB (matches the db:push workflow):
--   ALTER TABLE ...  (or `pnpm db:push` after deploying this schema change)

ALTER TABLE "platform_settings"
  ADD COLUMN IF NOT EXISTS "profilePreviewEnabled" BOOLEAN NOT NULL DEFAULT true;
