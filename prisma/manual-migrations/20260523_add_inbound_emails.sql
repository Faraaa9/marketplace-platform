-- Inbound emails received via the Resend inbound webhook.
-- Additive only — safe to run against production.

CREATE TABLE IF NOT EXISTS "inbound_emails" (
    "id" TEXT NOT NULL,
    "resendEmailId" TEXT NOT NULL,
    "messageId" TEXT,
    "fromAddress" TEXT NOT NULL,
    "toAddress" TEXT NOT NULL,
    "subject" TEXT,
    "textBody" TEXT,
    "htmlBody" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INBOX',
    "routedMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "inbound_emails_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "inbound_emails_resendEmailId_key" ON "inbound_emails"("resendEmailId");
CREATE INDEX IF NOT EXISTS "inbound_emails_status_createdAt_idx" ON "inbound_emails"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "inbound_emails_createdAt_idx" ON "inbound_emails"("createdAt");
