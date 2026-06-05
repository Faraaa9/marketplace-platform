-- Telegram QR login challenges for web sign-in via bot confirmation.
-- Additive only; safe to run before deploying the matching code.

CREATE TABLE IF NOT EXISTS "telegram_login_tokens" (
  "id" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "telegramUserId" BIGINT,
  "userId" TEXT,
  "callbackUrl" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "confirmedAt" TIMESTAMP(3),
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "telegram_login_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "telegram_login_tokens_token_key"
  ON "telegram_login_tokens"("token");

CREATE INDEX IF NOT EXISTS "telegram_login_tokens_token_status_idx"
  ON "telegram_login_tokens"("token", "status");

CREATE INDEX IF NOT EXISTS "telegram_login_tokens_expiresAt_idx"
  ON "telegram_login_tokens"("expiresAt");

CREATE INDEX IF NOT EXISTS "telegram_login_tokens_userId_idx"
  ON "telegram_login_tokens"("userId");
