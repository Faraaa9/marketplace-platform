# Phase 3 — Dense Retrieval Channel: Research Spike

Status: **research only — no code written.** Decision input for the routing
epic. Author: Track C. Date: 2026-06-27.

## TL;DR (read this, skip the rest if you trust me)

A dense embedding channel is **cheap and would make the request faster, not
slower** — but only because today's bottleneck is a 12 s Gemini rerank call,
which dense lets us delete. The lowest-infra version is:

> **Managed multilingual embedding API (Cohere Embed v4 or OpenAI
> text-embedding-3-large) → 2098 category vectors precomputed once and held
> in-memory as JSON → cosine top-40 → RRF-fused with the existing lexical
> ranker → return. No cross-encoder rerank. No Gemini. No GPU. No vector DB.**

Cost at this scale is **rounding error**: query embeddings are ~$0.018 / 1000
requests, so even at 50k req/month the dense channel costs **under $1/month**
(see §1). The one-time precompute of all 2098 categories costs **less than one
cent**.

**Go / no-go:** *Conditional go, but not yet.* Phase 3 is worth it **only if
Phases 0–2 (lexical recall fixes, alias/breadcrumb enrichment, stopword and
stem tuning) leave a measurable precision@1 / recall@3 gap on the "hard" error
classes** — the cases where the right category shares no surface tokens with
the query (synonyms, paraphrase, regional dialect, misspelling). If Phases 0–2
close that gap, **dense is not worth the extra moving part** and you should
stop. The single number that should trigger or veto Phase 3 is in §6:
**recall@3 on hard classes 1 & 2 after Phase 2 — if it's ≥ ~0.85, skip dense.**

The biggest risk is **not** cost or latency — it's that a managed embedding API
adds a second external network dependency on the request-creation path, and you
must engineer a clean lexical-only fallback so an embedding-API outage degrades
gracefully instead of breaking request creation.

---

## 0. What we're actually replacing

Current pipeline (`src/lib/category-suggestions.ts`):

1. **Lexical stage** — deterministic. Diacritic-strip, stopword filter, 5-char
   Lithuanian stem, token match over name + aliases + breadcrumb, depth bias.
   Fast, in-process, no network. This is good and stays.
2. **Gemini rerank stage** — optional. Top-30 lexical candidates → Gemini
   2.5-flash via OpenRouter, `maxTokens: 600`, **12 s timeout**. This is the
   slow and expensive part, and it's a generative LLM doing a ranking job it's
   overqualified and ill-suited for (latency variance, JSON-parse failures, the
   whole `errorKind` ladder in the code exists to survive it).

Phase 3's pitch is: a **dense semantic channel** recovers the cases lexical
misses (no shared tokens), and a **deterministic vector/rerank step replaces
the generative Gemini call** — so we gain recall *and* lose 12 seconds. That's
the whole story. Everything below is whether that pitch survives contact with a
solo-founder budget and a Vercel-serverless deployment.

---

## 1. Model choice for Lithuanian

Lithuanian is low-resource. The realistic candidates split into **self-host
open models** and **managed APIs**.

### Self-host open models

| Model | Dim | Params / size | LT quality expectation | Notes |
|---|---|---|---|---|
| **BGE-M3** | 1024 | ~560M (~2.2 GB fp32 / ~1.1 GB fp16) | Good. 100+ langs, strong on low-resource retrieval; LT covered. Slight edge over E5 on "reverse"/cross-lingual retrieval in 2026 benchmarks. | Also gives sparse + ColBERT multi-vector for free if you ever want hybrid in one model. |
| **multilingual-e5-large** | 1024 | ~560M (~2.2 GB fp32) | Good, robust multilingual baseline; needs the `query:` / `passage:` prefix convention or quality drops. | Slightly behind BGE-M3 on the low-resource numbers I found, but very close; either is fine for LT. |

Both are 1024-dim, both ~560M params, both LT-capable. For our use **BGE-M3 is
the marginally safer self-host pick** (no prefix footgun, strong low-resource
numbers), but the model choice barely matters next to the *deployment* choice
(§2). On the 12-Indian-language 2026 benchmark BGE-M3 led at 32.1% Recall@1
reverse-retrieval vs E5's lower numbers — directionally relevant for a
low-resource language like LT, not a guarantee.

### Managed embedding APIs

| API | Dim | LT quality | Price (per 1M input tokens) |
|---|---|---|---|
| **Cohere Embed v4** | 1536 (configurable) | Strong multilingual, 100+ langs incl. LT; near-English quality on the multilingual line | **$0.12** |
| **Cohere Embed v3 multilingual** | 1024 | Strong multilingual baseline | **$0.10** |
| **OpenAI text-embedding-3-large** | 3072 (truncatable via `dimensions`) | Good multilingual, LT decent; widely used baseline | **$0.13** |
| **Jina embeddings v3** | up to 1024 | Multilingual, explicit retrieval task LoRAs | comparable, ~$0.02–0.05 range |

### Concrete cost at our scale

Token assumptions: a category = name + breadcrumb ≈ **25 tokens**; a request
description ≈ **150 tokens** (generous for a short LT request).

**One-time precompute of all 2098 categories** (≈ 52,450 tokens):

| Model | One-time cost |
|---|---|
| Cohere Embed v3 | **$0.0052** |
| Cohere Embed v4 | **$0.0063** |
| OpenAI 3-large | **$0.0068** |

Half a cent to a full cent. You re-run it only when the taxonomy changes; store
the vectors in the repo or a JSON blob.

**Per-request query embedding** (150 tokens):

| Volume / month | Cohere v3 | Cohere v4 | OpenAI 3-large |
|---|---|---|---|
| 1,000 | $0.015 | $0.018 | $0.020 |
| 10,000 | $0.15 | $0.18 | $0.20 |
| 50,000 | $0.75 | $0.90 | $0.98 |

The query-embed cost is **not a budget line item** — it's under a dollar a month
at 50k requests on any provider. Pick on quality and operational simplicity,
not price. **Recommendation: managed API over self-host** (reasons in §2), and
between APIs, Cohere multilingual (v3 1024-dim or v4) for the multilingual
focus, with OpenAI 3-large as the no-new-vendor fallback if you already hold an
OpenAI key.

---

## 2. Infra burden for a solo founder

This is the section that actually decides self-host vs API.

### Self-host reality on Vercel: don't

You deploy on Vercel (serverless functions). A 560M-param embedding model is a
**persistent model server**, not a function:

- **It does not fit a Vercel function.** Cold start would have to load ~1 GB of
  weights per invocation; functions have memory/time/size limits a Torch model
  blows through. There is no Vercel primitive for "keep a GPU model warm."
- So self-host means **a second box somewhere** — a small GPU instance (or a
  CPU box eating ~200–600 ms/embed for a 560M model) running an inference
  server (TEI, Ollama, vLLM), that you patch, monitor, scale, and pay for
  **24/7 whether or not anyone files a request**. For a solo founder whose
  traffic is bursty and low, that is a fixed monthly cost and an ops surface
  (the 3am page) for a workload that managed APIs do for cents.
- A GPU instance is **$x00/month idle**; a CPU box is cheaper but slow and
  still always-on and still yours to babysit.

**Self-host is the wrong rung for a cost-averse solo founder at this scale.**
Reach for it only if request volume becomes huge (millions/month) *and* the
per-call API cost ever becomes material — which, per §1, it won't for a long
time.

### Pure-API reality: this is the answer

- **No infra.** A query embedding is one HTTPS POST from the existing serverless
  function. No box, no GPU, no warm pool, no patching.
- **The 2098 category vectors are tiny.** 2098 × 1024 floats × 4 bytes ≈
  **8.6 MB** (fp32), ~4.3 MB at fp16/int8. That fits **in-memory in the
  function** as a precomputed JSON/typed-array asset shipped with the deploy.
  **No vector database needed.** Cosine over 2098 vectors is a sub-millisecond
  loop (§3). A Pinecone/pgvector/Supabase-vector store is over-engineering at
  this scale — skip it; add one only if the catalog grows past tens of
  thousands of vectors.
- **Cost:** §1 — cents to under a dollar a month.
- **Downsides:** per-call latency (one network hop, ~50–200 ms, §3) and vendor
  lock. Lock is mild here: the vectors are disposable (re-embed the 2098
  categories with a different provider for one cent), and the query path is one
  function call you can swap.

### Where it runs

Embedding API call: inside the **existing** serverless request-creation
function — same place the Gemini call lives today. Category vectors: a build-time
JSON asset (`category-vectors.json`) loaded once into module scope and reused
across warm invocations. That's the entire infra delta: **one new env var (API
key) and one static asset.** No new service.

---

## 3. Latency budget — the actual selling point

Request creation is latency-sensitive, and **this is where dense wins, because
it lets us delete the 12 s Gemini call.**

| Step | Current | Dense (proposed) |
|---|---|---|
| Lexical scoring (in-proc) | ~few ms | ~few ms (unchanged) |
| Semantic stage | **Gemini rerank: up to 12,000 ms** (12 s timeout, high variance, JSON-parse failure path) | **Query embed API: ~50–200 ms** + **cosine over 2098 vecs: <1–2 ms** in-memory |
| Optional rerank | — | Cohere Rerank API ~50–150 ms *(optional, skip initially)* |
| Optional LLM cascade | — | Flash-Lite ~1–2 s, **only on the ~10–20% ambiguous queries** |

**Net:** the common path goes from *up to 12 s* to **~50–200 ms** — a
**~50–100× latency improvement** on the semantic step, while *adding* recall.
This is the rare case where the better-quality option is also the faster one,
because we're replacing a generative LLM (doing a ranking job) with a
deterministic vector op (doing the ranking job natively).

The only way dense is *slower* than today is if you stack a cross-encoder rerank
**and** an LLM cascade on every query — which §4 and §5 say not to do.

---

## 4. RRF fusion + rerank

### RRF (Reciprocal Rank Fusion) in one paragraph

You have two ranked lists of the same candidates: lexical (existing scorer) and
dense (cosine). RRF ignores the raw scores (which aren't comparable across the
two channels — lexical is integer token points, dense is cosine ∈ [-1,1]) and
fuses by **rank position**: each candidate's fused score is
`Σ 1 / (k + rank_in_list)` over the lists it appears in, with `k` a small
constant (~60 is the standard). A category that's #2 lexically and #1 densely
ranks above one that's #1 in only one list. It's a handful of lines, no
training, no tuning, and it's specifically designed to combine
incomparable-scale rankers. **This is the fusion step — keep it; it's nearly
free.**

### Cross-encoder rerank — worth the extra hop?

A cross-encoder (bge-reranker-v2-m3, Cohere Rerank 3.5, Jina rerank v2) re-scores
the top-K by reading query+candidate *together*, which is more accurate than
either bi-encoder channel alone. But:

- **It's a second external hop** (or, self-hosted, the same GPU-box problem as
  §2 — don't).
- **RRF of lexical+dense already recovers most of the gap.** The cross-encoder
  buys you the last few points of ordering precision, mostly on the genuinely
  ambiguous queries — exactly the slice a cheap **LLM cascade** (Flash-Lite) can
  also handle, and only on the ~10–20% that need it.

**Verdict: skip the cross-encoder in v1.** Ship lexical + dense + RRF. Measure.
If precision@1 on the hard classes is still short *after* dense, the cheapest
viable rerank is **Cohere Rerank 3.5 at $0.001/search** (1 query + up to 100
docs = our top-40 fits one search): **$1 / 1000 requests**, ~50–150 ms.
Jina rerank v2 is token-priced (~$0.023 / 1000 requests at our sizes) and even
cheaper, but Cohere's per-search model is simpler to reason about. Either is an
*optional later add*, not part of the v1 architecture.

---

## 5. Recommendation for a solo founder

### Lowest-infra viable architecture (if Phase 3 happens)

```
request text
  ├─ lexical scorer (existing, in-proc)         → ranked list A
  └─ query embed (Cohere/OpenAI API, ~100ms)
        → cosine vs 2098 in-memory category vecs → ranked list B
RRF-fuse(A, B, k=60) → top candidates
  → return  (NO cross-encoder, NO Gemini)
  → [later, optional] Flash-Lite cascade only when top-2 RRF scores are within ε
```

- **Embedding:** managed multilingual API (Cohere Embed v3 1024-dim or v4, or
  OpenAI 3-large). No self-host. No GPU.
- **Storage:** 2098 precomputed vectors as a static JSON/typed-array asset
  in-memory (~4–9 MB). **No vector DB.**
- **Fusion:** RRF of lexical + dense. ~10 lines.
- **Rerank:** none in v1.
- **Cascade:** none in v1; add Flash-Lite later, gated to ambiguous queries.
- **Drop:** the 12 s Gemini rerank.

### Rough monthly cost

| Volume / month | Query embed | + optional Cohere rerank | Today's Gemini |
|---|---|---|---|
| 1,000 | ~$0.02 | ~$1.02 | ~$1.20 |
| 10,000 | ~$0.18 | ~$10.18 | ~$12.00 |
| 50,000 | ~$0.90 | ~$50.90 | ~$60.00 |

**The v1 (no-rerank) architecture is under $1/month at 50k requests** and
*removes* the existing Gemini spend. Even with the optional cross-encoder it
roughly matches today's Gemini cost while being ~50× faster and higher recall.
(One-time category precompute: <$0.01.)

### Single biggest risk

**A second external dependency on the latency-sensitive request-creation path.**
Mitigation is mandatory and cheap: the lexical stage already runs in-process and
needs no network, so wire dense as an *enrichment* — if the embed API call fails
or is slow (short timeout, ~300–500 ms, not 12 s), **fall back to lexical-only
and still return suggestions.** The current code already has the
"AI attempted but failed → keep deterministic" pattern; reuse that shape. Never
let an embedding-API hiccup block request creation.

### When Phase 3 is NOT worth it

- If **Phases 0–2** (lexical recall fixes: alias/breadcrumb enrichment, stem and
  stopword tuning, prefix tolerance, evidence ordering — much of which is
  already in flight per the routing-v4.1 work) **close the recall@3 gap on the
  hard error classes**, dense adds a moving part and a vendor dependency for
  marginal gain. **Stop at Phase 2.**
- Phases 0–2 are **higher-ROI** (no new dependency, no network, fully
  deterministic and testable offline) and should be exhausted first. Dense is
  worth it specifically and only for the residual: queries where the right
  category shares *no surface tokens* with the text and no amount of
  alias/stem tuning will bridge (true synonyms, paraphrase, dialect,
  misspellings). Quantify that residual before building (§6).

---

## 6. What to measure before committing

Run the **golden-300** eval (the `pnpm test:routing-all` / golden-300 harness
referenced in the routing-v4.1 work) and bucket the failures into the two
**"hard" error classes**:

- **Class 1 — semantic miss:** correct category exists but shares no surface
  tokens with the query (synonym / paraphrase / dialect). Lexical *cannot* fix
  this; this is dense's home turf.
- **Class 2 — ranked-but-buried:** correct category is in the candidate set but
  ranked outside top-3 because a coarser/umbrella category outscored it
  lexically.

**The trigger metric: recall@3 on classes 1 & 2 *after* Phase 2 lands.**

- If **recall@3 on hard classes 1+2 is ≥ ~0.85 after Phase 2** → the cheap
  phases solved it. **Veto Phase 3.**
- If **recall@3 on hard classes stays < ~0.85** (especially if Class-1 semantic
  misses dominate and are flat across Phase 0–2 tuning) → that residual is
  exactly what a dense channel recovers. **Trigger Phase 3.**

Secondary gate, precision: only add the optional cross-encoder rerank (§4) if,
*after* dense+RRF, **precision@1 on the hard classes is still short of target**
— the cross-encoder only buys ordering precision, so don't pay for it unless the
ordering is the proven problem.

Also worth one cheap offline check before committing: take ~100 hard-class
queries, embed them and the 2098 categories *offline* (one-time, ~$0.01), and
measure dense recall@3 in isolation. If dense alone doesn't lift hard-class
recall@3 meaningfully over lexical on that sample, it won't in production either
— and you've spent a cent to find out instead of building it.

---

## Sources

- BGE-M3 vs multilingual-e5-large — dimensions, low-resource benchmarks:
  [pristren.com BGE-M3 2026](https://pristren.com/blog/bge-m3-embeddings-multilingual/),
  [dasroot.net BGE vs E5 vs Instructor](https://dasroot.net/posts/2026/01/embedding-models-comparison-bge-e5-instructor/),
  [arxiv 2601.10205 (low-resource Indian langs, Recall@1)](https://arxiv.org/pdf/2601.10205)
- Embedding API pricing:
  [Cohere pricing](https://cohere.com/pricing),
  [aipricing.guru Cohere](https://www.aipricing.guru/cohere-pricing/),
  [pecollective embedding specs 2026](https://pecollective.com/tools/text-embedding-models-compared/)
- Rerank pricing:
  [Jina reranker](https://jina.ai/reranker/),
  [Cohere Rerank 3.5 / OpenRouter](https://openrouter.ai/cohere/rerank-v3.5)
- Gemini Flash / Flash-Lite pricing:
  [ai.google.dev pricing](https://ai.google.dev/gemini-api/docs/pricing),
  [devtk.ai Flash-Lite](https://devtk.ai/en/models/gemini-2-5-flash-lite/)

(Token-count and cost figures in §1, §4, §5 are my estimates from the per-1M
prices above and stated token assumptions, not vendor quotes. Re-check the live
price pages before committing spend — API pricing moves.)
