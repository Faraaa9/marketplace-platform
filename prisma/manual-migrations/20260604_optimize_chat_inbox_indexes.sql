-- Optimize chat inbox and notification hot paths.
--
-- These indexes support:
-- - latest message lookup per response/direct inquiry thread
-- - provider/client inbox ordering
-- - notification bell newest + unread counts

CREATE INDEX IF NOT EXISTS "messages_responseId_createdAt_idx"
  ON "messages"("responseId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "messages_directInquiryId_createdAt_idx"
  ON "messages"("directInquiryId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "notifications_userId_createdAt_idx"
  ON "notifications"("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_createdAt_idx"
  ON "notifications"("userId", "isRead", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "direct_inquiries_senderUserId_lastMessageAt_idx"
  ON "direct_inquiries"("senderUserId", "lastMessageAt" DESC);

CREATE INDEX IF NOT EXISTS "messages_directInquiryId_senderId_createdAt_idx"
  ON "messages"("directInquiryId", "senderId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "messages_responseId_senderId_createdAt_idx"
  ON "messages"("responseId", "senderId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "notifications_userId_type_link_isRead_idx"
  ON "notifications"("userId", "type", "link", "isRead");

CREATE INDEX IF NOT EXISTS "direct_inquiries_providerId_moderationStatus_status_lastMessageAt_idx"
  ON "direct_inquiries"("providerId", "moderationStatus", "status", "lastMessageAt" DESC);

CREATE INDEX IF NOT EXISTS "direct_inquiries_senderUserId_moderationStatus_status_lastMessageAt_idx"
  ON "direct_inquiries"("senderUserId", "moderationStatus", "status", "lastMessageAt" DESC);
