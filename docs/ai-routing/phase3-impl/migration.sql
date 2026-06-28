-- Phase 3 / Phase A — dense category retrieval schema.
-- NOT YET EXECUTED. Run manually (prod additive OR Supabase branch) once the
-- DB approach is decided. Additive only: new extension + two new tables, no
-- existing data touched. 1536-dim chosen (test-confirmed recall@5 73.5% vs
-- 3072 74.7%) -> fits the standard pgvector HNSW index limit (<=2000d), so no
-- halfvec needed.

create extension if not exists vector;

-- Precomputed category embeddings (text-embedding-3-large @ dimensions:1536).
-- `model` + `text_version` guard against runtime/precompute drift (a mismatch
-- must fall back to the lexical engine, never silently mis-match).
-- FK -> categories(id): the Category Prisma model @@map's to table `categories`.
create table if not exists category_embedding (
  category_id  text primary key references categories(id) on delete cascade,
  embedding    vector(1536) not null,
  model        text not null,
  text_version text not null default 'name-typ-v1',
  updated_at   timestamptz not null default now()
);
create index if not exists category_embedding_hnsw
  on category_embedding using hnsw (embedding vector_cosine_ops);
-- Server-only table (Prisma/service-role bypasses RLS). Enable RLS with NO
-- policies so the anon/authenticated client keys get zero access (no exposure).
alter table category_embedding enable row level security;

-- MANDATORY day-1 logging: every suggested -> accepted/rejected/changed event.
-- Training data for a future auto-assign (UX variant A). See phase3-production-design.md §4.
create table if not exists category_suggestion_event (
  id                    bigserial primary key,
  request_id            text,                 -- request id or draft id
  job_phrase            text not null,        -- segmented job
  suggested_category_id text,
  suggested_rank        int,                  -- position in the shown suggestions
  action                text not null check (action in ('accepted','rejected','added_manual')),
  chosen_category_id    text,                 -- what the user finally picked
  seg_model             text,
  emb_model             text,
  rerank_model          text,
  created_at            timestamptz not null default now()
);
create index if not exists category_suggestion_event_cat
  on category_suggestion_event (suggested_category_id);
alter table category_suggestion_event enable row level security;
