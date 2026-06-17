-- Admin-managed dismissible announcement cards (feature news, tips, promos).
-- Additive only: new table, no impact on existing data. Dismissal state lives
-- in a per-device cookie, not in this table.

CREATE TABLE IF NOT EXISTS "announcement_cards" (
  "id"        TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "ctaLabel"  TEXT,
  "ctaHref"   TEXT,
  "icon"      TEXT NOT NULL DEFAULT 'lightbulb',
  "audience"  TEXT NOT NULL DEFAULT 'PROVIDER', -- PROVIDER | CLIENT | ALL
  "isActive"  BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "startsAt"  TIMESTAMP,
  "endsAt"    TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL,
  CONSTRAINT "announcement_cards_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "announcement_cards_audience_isActive_idx"
  ON "announcement_cards" ("audience", "isActive");
