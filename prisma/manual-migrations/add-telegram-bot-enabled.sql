-- Adds the Telegram bot kill switch flag to platform_settings.
-- Additive + backward compatible: defaults to true, so existing rows and
-- pre-deploy code keep the bot enabled. The webhook checks this column and
-- silently drops updates when set to false.
--
-- Apply once against the production DB (matches the db:push workflow):
--   ALTER TABLE ...  (or `pnpm db:push` after deploying this schema change)

ALTER TABLE "platform_settings"
  ADD COLUMN IF NOT EXISTS "telegramBotEnabled" BOOLEAN NOT NULL DEFAULT true;
