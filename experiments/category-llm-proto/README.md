# Category LLM prototype (isolated experiment)

Standalone test of an **LLM-centric** category classifier that aims for high **AUTO**
accuracy (no user correction). NOT wired to prod — separate directory, prod DB is
**read-only**, no migrations, no flags, no API/form changes.

## Architecture
`segment + classify (1 LLM call)` → `dense top-K candidate trap (pgvector)` →
`LLM rerank with few-shot + confidence (1 call)`. Embeddings are the wide net,
the LLM is the decider. Every pick is constrained to live taxonomy candidates.

- Embeddings: `openai/text-embedding-3-large @ 1536` via OpenRouter — the **same**
  model the live `category_embedding` table was built with (must match or cosine is garbage).
- Decider: `PROTO_DECIDER_MODEL` (default `anthropic/claude-sonnet-4.5`).
- Reuses the live 1916-vector `category_embedding` table and the 36-req/83-job
  `multilabel_golden.jsonl`.

## Isolation guarantees
- DB: only `SELECT` / `$queryRaw`. Own PrismaClient, never imports prod app code.
- Only credential used: `OPENROUTER_API_KEY` (+ `DATABASE_URL`) from `.env.local`.
- Nothing here is imported by `src/`. Delete the folder = zero prod impact.

## Run
```bash
# full variant matrix + FULL pipeline + hard queries -> out/*.md, out/*.json
npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","esModuleInterop":true,"skipLibCheck":true,"target":"ES2020"}' experiments/category-llm-proto/src/eval.ts

# interactive CLI demo
npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","esModuleInterop":true,"skipLibCheck":true,"target":"ES2020"}' experiments/category-llm-proto/src/repl.ts

# HTML demo page: start the local server, then open http://localhost:5577
npx ts-node --transpile-only --compiler-options '{"module":"CommonJS","moduleResolution":"node","esModuleInterop":true,"skipLibCheck":true,"target":"ES2020"}' experiments/category-llm-proto/src/server.ts
# model defaults to gemini-2.5-flash (fast/cheap); PROTO_DEMO_MODEL=anthropic/claude-sonnet-4.5 to switch
```
The HTML page (`public/index.html`) needs the server running — it POSTs to `/classify`,
which runs the pipeline server-side so the OpenRouter key + DB stay off the browser.
Opening the raw .html in a preview panel will NOT work (no backend).
LLM responses + embeddings are cached under `cache/` so re-runs are cheap/free.

## Files
- `src/clients.ts` — OpenRouter embed/chat (cached), pgvector `denseTopK`, prisma, `fold()`.
- `src/pipeline.ts` — segment+classify, retrieve, rerank-with-confidence, `runFull`.
- `src/names-store.ts` — names-only embedding store (enriched-vs-names variant).
- `src/eval.ts` — variant matrix + metrics + miss attribution → `out/`.
- `src/repl.ts` — interactive demo.
- `data/multilabel_golden.jsonl` — 36 req / 83 jobs (copied).
- `data/hard_queries.jsonl` — 15 hand-labeled colloquial multi-job queries.

## Metric glossary
- **recall@k** — gold category among the k dense candidates (retrieval ceiling).
- **auto@1** — top pick is the gold category, no user input.
- **gold-in-1-2** — gold among the ≤2 picks (the prod gate's headline metric, 67.5%).
- **all-jobs✓** — every job in a request correct@1.
- **safe-auto yield** — share of all jobs that are both high-confidence AND correct
  (the real "how much can ship auto" number).
- Miss attribution: **retrieval** (gold not in candidates) / **segmentation**
  (retrievable from its own phrase but our split missed it) / **rerank** (in
  candidates, not picked).
