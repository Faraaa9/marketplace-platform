-- Claim V1 review metadata fields.
-- Applied manually to the current Postgres/Supabase database on 2026-04-13.
-- Kept outside prisma/migrations because this project does not yet have a Prisma
-- migration baseline for the existing schema.

ALTER TABLE "claim_requests"
ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);

ALTER TABLE "claim_requests"
ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);

ALTER TABLE "claim_requests"
ADD COLUMN IF NOT EXISTS "reviewedByUserId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'claim_requests_reviewedByUserId_fkey'
  ) THEN
    ALTER TABLE "claim_requests"
    ADD CONSTRAINT "claim_requests_reviewedByUserId_fkey"
    FOREIGN KEY ("reviewedByUserId")
    REFERENCES "users"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;
