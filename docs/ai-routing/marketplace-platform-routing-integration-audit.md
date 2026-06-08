# Marketplace-Platform — Routing Integration Audit (multi-routing v4)

**Status:** audit + plan only — no code changed, no migrations run, no production behavior touched.
**Date:** 2026-06-08
**Audited app:** `~/Documents/Projects/marketplace-platform` (Next.js 16 App Router · Prisma + PostgreSQL · NextAuth v4 · pnpm · OpenRouter · Resend · Telnyx · Upstash · Telegram · Stripe)
**New system to integrate:** multi-routing **v4**, offline category-research repo at `~/Documents/KATEGORIJOS + 200K-uzklausu` (`scripts/ai-routing/`), driven by the loop tooling in `~/orkestratorius-dashboard/scripts/orchestrator/`.
**Goal of integration (later):** replace the error-prone single-primary category auto-selection with multi-routing v4 as the main router — multiple `routing_categories`, no manual review, no category cap, provider dedupe, optional/disabled provider cap, same-city + active providers first, log every routing decision, never drop a request.

> This document is the brief for the **next** agent who will implement the integration. It maps the current flow, names every relevant file/function with line references, lists the DB models, the v4 contract, the gap, the integration seams, the required schema/env changes, the risks, the rollback, a step-by-step plan, and explicit change / do-not-touch file lists.

---

## 0. Executive summary

1. **Request creation has exactly one choke point.** All requests (web form **and** Telegram) funnel through `createServiceRequest()` — `src/lib/service-requests/create.ts:59`. There is only **one** `prisma.serviceRequest.create()` in the whole codebase (`create.ts:189`).
2. **Multi-category is already half-shipped.** The create call writes **both** the legacy scalar `category`/`categoryId` (mirrored from the primary) **and** a `ServiceRequestCategory` join table (1–3 rows, `sortOrder` 0 = primary). The join table is read for **display** and **notifications**, but the two **binding matching gates still key off the single primary `categoryId`**.
3. **Dispatch is hybrid push + pull; the economic unit is pull.** On publish, a fire-and-forget **PUSH** (`notifyRelevantProviders`, `src/lib/request-notifications.ts:12`) emails + in-app-notifies every matching provider — but it only *alerts*; it creates no lead and charges nobody. The real connection is **PULL**: providers browse the open-lead board (`GET /api/tiekejas/uzklausos`) and spend **1 credit** to unlock a lead (`unlockLead`, `src/lib/credits.ts`). There is **no cap** on how many providers can unlock one request.
4. **The "old routing" is two LLM classifiers over a deterministic fallback.** `request_improve` (`src/lib/ai-improve.ts`) is the primary router; `category_suggest` (`src/lib/category-suggestions.ts`) is the secondary suggester. Both run on OpenRouter (`google/gemini-2.5-flash`) with a Lithuanian token-scoring fallback, both already return **ranked multi-category lists with per-category confidence** — but confidence is **never persisted** and a brittle hand-written rule layer (`category-selection-rules.ts`, `category-overrides.ts`) is the main error source.
5. **multi-routing v4 is an offline, rule-based, dependency-free Python pipeline** (no LLM, no live endpoint). `classify()` (`multi_routing_classifier.py`) emits `routing_categories` + `project_type` + `routing_tags` + `routing_confidence`; `route_request()` (`multi_routing_router.py`) is a near-exact reference implementation of the desired v1 behavior (dedupe providers, no category cap, provider cap disabled by default, same-city/active first, fallback, per-request logging). **The crux of integration is mapping v4's canonical category NAME strings to the marketplace `Category` table** (two independent snapshots of the same paslaugos.lt taxonomy — no shared id).
6. **There is no routing-decision log, no async queue, and no test runner / CI.** Validation = `next build` (which enforces `tsc` + ESLint) + a couple of ad-hoc `ts-node` scripts.

**Recommended shape of the integration** (detail in §10): port v4's two pure functions to TypeScript in-app; feed them candidates from the existing classifiers (free-text → candidate categories); at creation, persist the resulting `routing_categories` to `ServiceRequestCategory` (with new `confidence`/`source` provenance + a `routingVersion` stamp on the request); unify the **push** and **pull** matchers into one engine built on the existing `expandToMatchSet`, switched from the single-FK filter to the relation filter, with same-city/active ordering + an optional (default-off) provider cap; log every decision (including zero-match and fallback) to a new `RoutingDecision` table; gate it behind a kill-switch.

---

## 1. Current flow map

```
                    ┌──────────────────────────── REQUEST CREATION ────────────────────────────┐
 Web form                                                                    Telegram bot
 src/app/uzklausos/nauja/page.tsx (NewRequestV2Form)                         src/lib/telegram/conversation.ts
   • AI "Sutvarkyti su AI" → POST /api/requests/improve                        • draft built in chat
     → request_improve (src/lib/ai-improve.ts) → categories[] (1–3 slugs)      • resolveCategories → categoryIds
   • fallback chip picker → POST /api/category-suggestions                     • publishDraft → createServiceRequest(
     → category_suggest (src/lib/category-suggestions.ts)                          source:"telegram", contactPreVerified:true)
   • email/phone verify widgets
   • handlePublish → POST /api/requests ──┐                                   ──┐
                                          │                                     │
                                          ▼                                     ▼
                         src/lib/service-requests/create.ts  →  createServiceRequest()   ◄── SINGLE CHOKE POINT
                           1. serviceRequestV2Schema (zod)        validations.ts
                           2. email/phone verification gating
                           3. validate every categoryId vs Category
                           4. moderateText + moderateImages       src/lib/moderation/*
                           5. prisma.serviceRequest.create()      create.ts:189   ◄── ONLY create() in repo
                                • category = primary.slug          (legacy mirror)
                                • categoryId = primary.id          (legacy mirror, AUTHORITATIVE for matching)
                                • categories.create[] = all 1–3    ServiceRequestCategory (sortOrder 0=primary)
                           6. if APPROVED → notifyRelevantProviders(...)  ◄── PUSH seam  (fire-and-forget .catch)
                           7. client confirmation email + in-app Notification

                    ┌────────────────────── DISPATCH / MATCHING ──────────────────────┐
   PUSH (alert only, no charge)                         PULL (the paid economic path)
   src/lib/request-notifications.ts                     GET /api/tiekejas/uzklausos/route.ts
     where: User role=PROVIDER, emailVerified,            where: status=OPEN, moderationStatus=APPROVED,
       providerProfile.isActive,                                 categoryId ∈ expandToMatchSet(provider active cats),
       categories.some({categoryId in expandToMatchSet,          + optional location filter (exact string)
                        activeCategoryFilter})              Node-side relevance scoring (semantic = shadow only)
     location: exact-string OR "Visa Lietuva"                       │
     → email (Resend) + Notification per provider                   ▼
                                                          POST /api/tiekejas/uzklausos/[id]/unlock
                                                            → unlockLead (src/lib/credits.ts, 1 credit)
                                                            → LeadUnlock (@@unique requestId+providerProfileId)
                                                            → checkEligibility(request.categoryRef)  ◄── single FK
                                                          then provider may create a Response + Message thread
```

**Key consequence of the map:** the PUSH already fans out on *all* categories; the PULL board filter and the unlock **eligibility gate** still use only the **single primary `categoryId`**. So a provider can be **emailed** about a request that matches their **secondary** category, click through, and find it **missing from their board** and/or be **blocked at unlock with `SPECIALIZATION_MISMATCH`**. Closing this gap is the core thing v4 inherits.

---

## 2. Request creation flow — files & functions

| File | Role | Key symbols / lines |
|---|---|---|
| `src/lib/service-requests/create.ts` | **The shared core. Only `serviceRequest.create()` in the repo.** Validates, gates verification, validates categories, moderates, creates (scalar mirror + join rows), then post-create side effects. | `createServiceRequest` (59), category validation (139–154), **the create + nested `ServiceRequestCategory`** (189–223, esp. 193–194 mirror, 195–200 join rows), provider notify (242–255), client notification/email (257–280) |
| `src/app/api/requests/route.ts` | Web publish endpoint. IP rate limit, honeypot, derives verified `clientId` from session, delegates to core, maps result codes → HTTP. | `POST` (28), `ERROR_STATUS` (10–20), clientId derivation (60–65) |
| `src/app/uzklausos/nauja/page.tsx` | Web request form (v2, AI-assisted). Builds `FormState`, runs AI improve, verify widgets, submits to `/api/requests`. `MAX_CATEGORIES=3` (client-only). | `NewRequestV2Form`, `handlePublish` (551–575), `MAX_CATEGORIES` (69) |
| `src/lib/telegram/conversation.ts` | Telegram source path. Resolves categories, calls core with `source:"telegram"`, `contactPreVerified:true`. | draft build (207–224), `createServiceRequest` call (402–416) |
| `src/lib/telegram/bot.ts` | Injects the real `createServiceRequest` into Telegram deps. | import (18), inject (188) |
| `src/app/api/telegram/webhook/route.ts` | Telegram webhook; verifies secret, kill-switch, processes in `after()`. | `POST` (22–32, 46–68) |
| `src/lib/validations.ts` | Zod schemas. `serviceRequestV2Schema` is what creation validates against; `categoryIds.min(1).max(3)`. Legacy v1 schema unused for create. | `serviceRequestV2Schema` (53–73) |
| `src/app/api/requests/send-code|verify-code|send-phone-code|verify-phone-code/route.ts` | Email/phone verification records read by the core's gating. | — |
| `src/app/api/requests/verify/route.ts` | **Second PUSH entry point.** Publishes a previously-pending verified request and re-fires `notifyRelevantProviders`. | notify (83), join-or-scalar fan-out ids (78–83) |

**What is stored on a `ServiceRequest` at create** (`create.ts:189–223`): `title`, `description` (both `sanitizeHtml`), `category` = primary slug, `categoryId` = primary id, `categories.create[]` = all selected (sortOrder), `location` (may be `""`), `budget`, `deadline`, `attachmentUrls`, `status:"OPEN"`, `moderationStatus` (`APPROVED`|`PENDING`), `moderationReason`, `moderatedAt`, `contactVerifiedAt`, `clientEmail` (lowercased), `clientName`, `clientPhone` (normalized), `clientId` (nullable), `source`, `trackingToken` (explicit `crypto.randomBytes(32)`, overrides schema `cuid()` default).

**Notes that matter for v4:**
- The create+join write is atomic, but post-create side effects (verification delete, user update, notification, email, notify) are **not** in a transaction.
- Routing currently runs **only when `moderationStatus==="APPROVED"`**. A `PENDING → APPROVED` admin transition has **no routing re-trigger** in this file (only the email-verify path re-fires push).
- The richer signals (`location`, `budget`, `deadline`, `attachmentUrls`) are all available at the create point if v4 wants to route on more than category.

---

## 3. Current category assignment (the "old routing" to be replaced)

There are **two request-side classifiers** plus one provider-side picker (out of scope):

| Touchpoint | File | What it returns | Notes |
|---|---|---|---|
| `request_improve` | `src/lib/ai-improve.ts` | `categories: string[]` (0–3 curated slugs, most-relevant-first) + legacy single `category = categories[0]` | **Primary router.** Validated against a server-built candidate list, post-filtered by hard-coded intent/domain rules. Entry `improveDescription` (256). Hard-fails (422/503/504) on AI error. |
| `category_suggest` | `src/lib/category-suggestions.ts` | `suggestions: CategorySuggestion[]`, each with **per-category `confidence` (0–1)**, breadcrumb, depth, reason | Web fallback + chip picker + Telegram fallback. Deterministic scoring then optional AI rerank of top 30. Entry `suggestCategories` (523). |
| `category_picker` | `src/lib/category-picker-ai.ts` | provider profile categories (roots→leaves) | **Provider profiles, not requests** — out of scope unless explicitly included. |

**Shared infrastructure:**
- LLM transport: `callOpenRouter` (`src/lib/ai/openrouter.ts:135`, timeout/retry/usage), model via `resolveModel(touchpointId, OPENROUTER_MODEL || default)`.
- Config/kill-switch: `AiTouchpointConfig` table + `isAiTouchpointEnabled` / `resolveModel` / `resolvePrompt` (`src/lib/ai/prompt-config.ts:511–568`), registry `TOUCHPOINT_META` (`src/lib/ai/registry.ts`), admin UI `/admin/ai`, write path `api/admin/ai-config/route.ts`, cache invalidation `invalidateAiConfigCache` (prompt-config.ts:505, 20s TTL).
- Audit: `recordAiRun` (`src/lib/ai/audit.ts:32`).
- **Legacy rule layer (the explicit removal target):** `filterRequestCategoryChoices` / `categoryMatchesRequestIntent` (`src/lib/category-selection-rules.ts`, ~11 LT domains + ~20 per-slug regex gates) and `pickCategoryOverrideSlug` (`src/lib/category-overrides.ts`, 6 hard-coded plumbing slugs). Both are called from `ai-improve` and `category-suggestions`.

**One vs many / confidence / fallback (verified):**
- The classifiers **already return ranked multi-category lists** (not a single pick) **with per-category confidence** in memory — **but confidence is never persisted** to `ServiceRequest`/`ServiceRequestCategory` (no such column). Only aggregate counts/tokens/cost land in `AiRun.metadataJson`, and **category runs don't set `entityId`**, so they can't be joined back to a request.
- Mapping to a `Category` is **by slug** (exact match against the candidate list); a near-miss yields **zero** categories rather than a best-effort match. Aliases (`CategoryAlias.aliasName`) only feed deterministic scoring as extra searchable text.
- Selection is **client-confirmed on web** (user taps a chip; nothing forced) but **server-forced in Telegram** (no human confirm). A request **cannot be saved with zero categories** (web schema requires ≥1).

---

## 4. Provider data model

| Model → table | Matching-relevant fields | Notes |
|---|---|---|
| `ProviderProfile` → `provider_profiles` | `isActive`, `isVerified`, `moderationStatus`, `status` (claimed/unclaimed), `sourceType` (self_created/imported), `location`, **`primaryCity`**, **`serviceArea[]`**, `specializations[]`, `rating`, `reviewCount`, `creditBalance`, `planType`/`planExpiresAt` | **The live, unified provider entity** (Phase 2 absorbed `SupplierRecord`). |
| `ProviderProfileCategory` → `provider_profile_categories` | `categoryId`, `sortOrder`, **`expiresAt`** | Multi-category per provider. `expiresAt` null = free/base; future = paid unlock; past = expired (no longer matches). `@@unique([providerProfileId, categoryId])`. |
| `Category` → `categories` | `id`, `name`, `slug`, `parentId`, `rootId`, `depth`, `path`, `pageType`, **`externalSource`**, **`externalSlug`** | Tree taxonomy imported from paslaugos-crawler. `externalSource`/`externalSlug` are the natural keys for v4 name mapping. |
| `CategoryAlias` → `category_aliases` | `aliasName`, `aliasSlug` | Already exists — the place to absorb v4 spelling variants. |
| `SupplierRecord` / `SupplierCategoryLink` | `isPrimary`, `confidenceScore` | **Dead-for-matching today** (catalog page disabled, imported rows have no `userId`/no `ProviderProfileCategory`). Do not assume imported suppliers participate in matching. |

**How matching works today** (both push and pull):
- Provider categories come from `ProviderProfileCategory` filtered by `activeCategoryFilter()` (`src/lib/category-matching.ts:13` → `expiresAt: null OR > now`).
- Category match is **tree-aware** via `expandToMatchSet()` (`src/lib/category-matching.ts:27–71`, arbitrary depth ancestors + descendants).
- **Caveat:** the unlock/respond eligibility gate `checkEligibility` / `categoriesMatch` (`src/lib/provider-eligibility.ts:24–31`) hard-codes a **2-level** tree assumption, which **disagrees** with the N-level `expandToMatchSet` used by the feed — a latent bug for taxonomies deeper than 2 levels.
- **Geo is weak:** only `ProviderProfile.location` exact-string + `"Visa Lietuva"` wildcard is used. `serviceArea[]` and `primaryCity` exist but are **never read** by any match path.
- Free category limit `FREE_CATEGORY_LIMIT=4` (`src/lib/category-pricing.ts:9`); extra categories are paid timed unlocks. Pay-per-lead (`LeadUnlock`, 1 credit) supersedes the largely vestigial `planType`/`Subscription`.

---

## 5. Lead / message dispatch

| Mechanism | File | Behavior |
|---|---|---|
| **PUSH (alert only)** | `src/lib/request-notifications.ts:12` `notifyRelevantProviders` | On publish, queries all `role=PROVIDER` + `emailVerified` users whose **active** category match-set (tree-aware, multi-category union) and location match; sends `newRequestAlert` email (fire-and-forget) + creates a `NEW_REQUEST` `Notification` per provider. **No lead, no charge, no reservation.** Called at `create.ts:249` and `verify/route.ts:83`. |
| **PULL board** | `src/app/api/tiekejas/uzklausos/route.ts` | `where: status=OPEN, moderationStatus=APPROVED, categoryId ∈ expandToMatchSet(provider active cats)` (65), optional location (69–71), Node-side relevance scoring (118–167). **Capped at `MAX_SCORED_LEADS=500` newest** (82). |
| **Unlock (the charge)** | `POST .../[id]/unlock/route.ts` → `unlockLead` (`src/lib/credits.ts:228`) | 1 credit (`CREDITS_PER_UNLOCK=1`); writes `LeadUnlock` (`@@unique([requestId, providerProfileId])`) + `CreditTransaction` (UNLOCK_SPEND). Gated by `checkEligibility(request.categoryRef)` — **single FK**. **No cap on unlocks per request.** |
| **Response + messaging** | `tiekejas/uzklausos/[id]/route.ts`, `Response`, `Message` | After unlock the provider may respond; **`Response` has no DB uniqueness on `(requestId, providerId)`** — duplicate prevention is a racy `findFirst`. |
| **Client side** | `create.ts:257–280` | Client always emailed a tracking-link confirmation (unless placeholder Telegram address) + in-app `Notification` if logged in. |
| **Shadow ranking** | `tiekejas/uzklausos/route.ts:172–191` (`semantic_match_shadow`) | A semantic match score is computed every board load and **logged to `AiRun` but never used for ordering** — a ready hook for v4 ranking. |

**Channels:** Email (Resend), in-app `Notification`, Telegram for **request intake only** (no provider-side Telegram push found). SMS via Telnyx is configured (verification codes), not used for lead dispatch.

**Duplicate-send prevention:** essentially none for push — `Notification` has no unique constraint; a re-published/re-verified request can emit duplicate `NEW_REQUEST` rows. The only hard dedup is `LeadUnlock @@unique` and `RequestView @@unique` (per-provider impression).

---

## 6. Existing logs / admin / debug

- **`AiRun` → `ai_runs`** — operational AI telemetry, written via `recordAiRun` in ~39 sites. **Routing/category decisions are logged only as counts** (`hasCategory:boolean`, `suggestion: N`, `pickedRoots: N`, tokens, cost) — **never the chosen category slugs/ids/confidences**, and category runs omit `entityId`. Read **only in aggregate** by `src/lib/admin/ai-usage.ts`; surfaced at `/admin/ai` ("AI žemėlapis"). **No per-run / per-request inspection UI.** `recordAiRun` is best-effort (swallows errors).
- **`ModerationLog` → `moderation_logs`** — moderation verdicts (`source`, `verdict`, risk `categories[]`, `model`, `latencyMs`). **Write-only**: nothing reads it; the moderation queue derives state from `entity.moderationStatus`. Good **precedent** for a richer decision-log table.
- **No request status-history / audit model.** Admin status changes (`PATCH /api/admin/uzklausos`) and moderation flips overwrite in place.
- **The create path emits no `AiRun` for routing** — it trusts caller-supplied `categoryIds`, only validates existence (`CATEGORY_INVALID`), no default/fallback category.
- **Error handling degrades gracefully:** classifiers fall back to deterministic scoring; moderation falls back to "review"; `request_improve` surfaces 422/504 telling the user to fill fields manually.

**There is no admin view of routing decisions today.** Replaying "why did request X get category Y / reach provider Z" from audit data is currently impossible.

---

## 7. Environment / config / flags / caps / queues

**Config lives in three places:** process env (secrets + a few toggles), the single-row `PlatformSettings` table (runtime flags), and `AiTouchpointConfig` (draft/activate per-touchpoint AI model + prompt overrides at `/admin/ai`).

**Relevant env vars** (`.env.example`): `DATABASE_URL`, `NEXTAUTH_*`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `RESEND_API_KEY`/`EMAIL_FROM`/`EMAIL_REPLY_TO`/`RESEND_WEBHOOK_SECRET`/`INBOUND_*`, `TELNYX_*` (SMS), `UPSTASH_REDIS_REST_URL`/`_TOKEN`/`RATE_LIMIT_WARN_ON_MEMORY`, `TELEGRAM_BOT_TOKEN`/`_WEBHOOK_SECRET`, `STRIPE_*`, `CLOUDINARY_*`, `NEXT_PUBLIC_SUPABASE_*`/`SUPABASE_JWT_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`.

**Feature flags:** `PlatformSettings` (storyEnabled, emailTestMode, emailAllowlist, freeStarterCredits, telegramBotEnabled) — **no routing/dispatch flag exists**. `AiTouchpointConfig.enabled` is the AI on/off surface. A v4 router needs a new flag (PlatformSettings field) **or** a new touchpoint.

**Caps (scattered constants):** request-create rate limit **5/hour/IP** (`src/lib/rate-limit.ts`, Upstash with **fail-open** in-memory fallback), `FREE_CATEGORY_LIMIT=4` + `MAX_CATEGORY_MONTHS=12` (`category-pricing.ts`), `MAX_CATEGORIES=3`/request (**client-only** in `nauja/page.tsx:69` — the server create path does **not** cap category count), `MAX_PROVIDERS=500` (listing), `MAX_SCORED_LEADS=500` (board). **There is no provider fan-out cap on the notifier** (no `take`/limit).

**Queues / jobs:** **none.** No QStash/Inngest/BullMQ. Background work = (a) two daily Vercel crons in `vercel.json` (`cleanup-pending-requests` 03:00, `cleanup-orphan-images` 04:00, region `fra1`, Bearer `CRON_SECRET`) and (b) `after()` used only in the Telegram webhook + message routes. **Routing is fully synchronous + fire-and-forget inside the request handler, not wrapped in `after()`/`waitUntil()`** — large fan-outs can be silently truncated on Vercel.

---

## 8. Test / build / typecheck conventions

- **Package manager:** `pnpm@9.15.0`.
- **Build:** `next build` (Vercel: `prisma generate && next build`). `next.config.mjs` sets neither `typescript.ignoreBuildErrors` nor `eslint.ignoreDuringBuilds`, so **`next build` enforces full TypeScript + ESLint** — this is the de-facto gate.
- **Typecheck (no npm script):** `npx tsc --noEmit --pretty false` (documented in `docs/known-warnings.md:128`). `tsconfig.json` has `strict: true`.
- **Lint:** `eslint .` (flat config, ESLint 9). `react-hooks/exhaustive-deps` etc. are downgraded to warnings; build does **not** fail on warnings (~31 known warnings).
- **Tests:** **no real runner** (no jest/vitest/playwright-test/node:test). Three ad-hoc `ts-node` + `node:assert/strict` scripts. Only `test:telegram` is wired to an npm script. The committed `src/lib/__tests__/category-selection-rules.test.ts` has **no script** and never runs automatically. **No CI** (`.github/workflows` absent).
- **Fragility:** `ts-node` is **not** a declared dependency and is absent from the lockfile/`node_modules`; every ts-node script relies on `npx` fetching it at runtime (not offline-safe).
- **Existing coverage near routing:** one unit test for `filterRequestCategoryChoices` (deterministic, DB-free) + an AI smoke script (`scripts/smoke-test-category-picker.ts`, calls the live model, costs money). **Provider matching has no test. `create.ts` is only exercised indirectly via the mocked Telegram path.**

**Validation contract for the next agent:** `pnpm build` (or `npx tsc --noEmit --pretty false` for a fast typecheck) + `eslint .`; add a `ts-node`-style script mirroring `test:telegram` for any new deterministic routing unit test.

---

## 9. The new multi-routing v4 system (contract characterization)

Location: `~/Documents/KATEGORIJOS + 200K-uzklausu/scripts/ai-routing/`. **Deterministic, rule-based Python (no LLM), offline batch only — no live HTTP endpoint in the production path.**

**`multi_routing_classifier.py` → `classify(rec) -> dict`** (the routing brain):
- **Input:** a request row — `title`, `description`, `city`, plus either `suggested_primary_category` + `suggested_secondary_categories` **or** a `raw_categories` string (segmented against `data/taxonomy/taxonomy_flat.jsonl`).
- **Output:**
  ```json
  {
    "routing_categories": ["Elektrikai, elektros darbai", "Vidaus apdailos darbai"],
    "project_type": "Buto remontas" | "Namo renovacija" | "Namo įrengimas" | "Project scope" | null,
    "routing_tags": ["reikia_kelių_specialistų", "subrangovų_paieška", "aktyvi_užklausa"],
    "routing_confidence": 0.63
  }
  ```
- `routing_categories` = **deduped union of upstream candidates** minus catch-all suppression (drops generic catch-alls like "Statybos darbai" when a specific trade survives and the catch-all lacks text evidence). **Canonical Lithuanian NAME strings**, not ids/slugs. **No per-category score**; `routing_confidence` is one row-level float (`0.40 + 0.50·grounded_share + 0.10·has_project_type`).
- **No category cap** (high-value-500 sample: avg **3.8**, min 2, max **10**, median 4).

**`multi_routing_router.py` → `route_request(rec, index, providers)`** (the reference v1 router — implements the desired behavior bullet-for-bullet):
- Provider directory schema: `{provider_id, name?, provider_categories:[canonical names], service_area:[cities], city, active}`.
- **Dedupe providers across categories** (`matched_by_id`), **never caps categories**, optional **provider** cap (`MAX_PROVIDERS_PER_REQUEST=0` = disabled), **selection order = same-city first, then active first, then stable by id**, **fallback to broad same-city routing when `routing_categories` empty** (never drops a request), per-request JSONL log stamped `routing_version="multi-routing-v4"` with `category_count`, `provider_match_count` (per category), `providers_matched_total`, `providers_sent`, `provider_cap_applied`, `fallback`/`fallback_reason`, `project_type`, `routing_tags`, `routing_confidence`. Geo rule: a provider with **no** declared geography serves everywhere (incl. unlocated requests); a geo-scoped provider does **not** match an unlocated request.
- Has a `--self-test` smoke (5 synthetic requests + fixture providers) demonstrating all paths.

**Supporting docs (read them before implementing):**
- `docs/ai-routing/multi-routing-production-plan.md` — the authoritative v1 behavior + rollback contract.
- `docs/ai-routing-contract-v1.md` — the intended request→routing and provider-onboarding JSON contract (enum discipline: every category must be a canonical taxonomy name; `confidence`, `needs_user_confirmation`, `extracted_fields`).
- `docs/ai-routing/multi-routing-v4-report.md` — distribution metrics; ~**0.83 avg_routing_f1**, recall ≥ 0.88, **only after a SAFE alias map** normalizes synonymous spellings.

**v4 weaknesses to carry into the integration:**
- Taxonomy identity is **by string, not stable id**. v4 names come from `taxonomy_flat.jsonl` (built from `kategorijos.md`, ~3255 lines); marketplace `Category` is imported from `paslaugos-crawler/catalog_tree_clean_v2.json` (~840 nodes). **Same paslaugos.lt lineage, independent snapshots** — names may drift or be absent. Coverage must be measured.
- **No per-category confidence**; `routing_confidence` cannot threshold individual categories.
- Quality is bounded by hand-written regexes + the catch-all blocklist; honest taxonomy variants score as over-route/miss without the SAFE alias map.
- **The upstream candidate source (`suggested_*`/`raw_categories`) came from scraped data**, not free text. **A live customer request has only title/description/city** — so production must supply candidates from somewhere (see §10 step 2).
- Append-only log with no idempotency; provider directory is a 12-row fixture (never run against real data).

---

## 10. Gap analysis — current vs desired v1

| Desired v1 behavior | Today | Gap / work |
|---|---|---|
| multi-routing v4 is the **main router** | single-primary `categoryId` is authoritative for matching | Port v4 logic; make the full category set drive matching |
| generate **multiple** `routing_categories` | classifiers already produce 0–3, but only primary is matched on | Persist + match on all; switch single-FK gates to relation gates |
| **no manual review** | already automated (web user confirms a chip; Telegram forced) | OK — keep automated |
| **do not cap** `routing_categories` | UI caps at 3 (client-only); server uncapped | Allow N categories server-side; remove/raise the 3-cap if v4 set is larger |
| **dedupe providers** across categories | push & pull each re-match independently; push already unions | Single matcher that dedupes (mirror `matched_by_id`) |
| optional provider cap, **default disabled/high** | **no cap** on notifier; no cap on unlocks | Add `MAX_PROVIDERS_PER_REQUEST` (default 0/disabled) on the deduped set |
| **same-city providers first** | same-city is +1 to a Node score, not an ordering primitive on push | Add ordering: same-city → active → stable |
| **active / recent / profile-complete first** | `isActive` is a filter; recency/profile-completeness unused | Add ranking signals (`lastSeenAt`, profile completeness, `isVerified`) |
| **log every routing decision** | only aggregate counts in `AiRun`; no chosen categories/providers | New `RoutingDecision` log (chosen categories, per-category match count, providers matched/sent, fallback, version) |
| **no providers → still create + log zero match** | request still created; **push silently returns on zero categories, no log** | Add explicit zero-match / fallback logging |

**Already in our favor:** the write path is centralized; the join table exists and is populated; the notifier already takes `string[]` and unions match sets; `expandToMatchSet`/`activeCategoryFilter` are reusable; the shadow semantic score is a ready ranking hook; `AiTouchpointConfig` gives a kill-switch/model surface for free.

---

## 11. Proposed integration points (seams)

1. **Routing brain (port to TS):** new `src/lib/routing/multi-routing-v4.ts` porting `classify()` + `route_request()` (pure, dependency-free). Unit-test like `category-selection-rules.test.ts`.
2. **Candidate source:** reuse the existing classifiers' output as v4's `suggested_*` candidates — `improveDescription` (`src/lib/ai-improve.ts:256`) and/or `suggestCategories` (`src/lib/category-suggestions.ts:523`). This is the live free-text → candidates step v4 lacks.
3. **Taxonomy mapping (the crux):** new `src/lib/routing/taxonomy-map.ts` mapping v4 canonical names → `Category.id`, backed by `Category.name`/`slug`/`externalSlug` + `CategoryAlias`, seeded from the v4 SAFE alias map (`evaluate_multi_routing.py:51–69`). Decide unknown-name behavior (drop + log vs `unknown` queue). **Measure coverage first.**
4. **Creation seam:** `createServiceRequest` (`create.ts:189`). v4's `routing_categories` plug into the existing `categoryIds` input / `orderedCategories`; persist all to `ServiceRequestCategory` with new `confidence`/`source`, stamp `routingVersion` on the request, and emit a `RoutingDecision` row.
5. **Unified matcher:** replace the **push** body (`request-notifications.ts:12`) and the **pull** WHERE (`tiekejas/uzklausos/route.ts:61–77`) with one engine on `expandToMatchSet`, switched to the relation filter `categories: { some: { categoryId: { in } } }`, with same-city/active ordering + optional provider cap + dedupe. Reconcile `checkEligibility`/`categoriesMatch` onto `expandToMatchSet` (kill the 2-level shortcut) and change its signature to accept `CategoryNode[]`.
6. **Durability:** wrap dispatch in `after()`/`waitUntil` (already imported in `telegram/webhook/route.ts:2`) or a `CRON_SECRET`-guarded sweeper cron; add idempotency so re-publish/verify doesn't double-send.
7. **Config / kill-switch:** register a `request_routing` (or `multi_routing_v4`) touchpoint in `prompt-config.ts` `PROMPT_DEFAULTS` + `registry.ts` `TOUCHPOINT_META` (free admin toggle + model override + usage stats), **or** add `PlatformSettings.multiRoutingEnabled`. Reuse `invalidateAiConfigCache()`.
8. **Observability:** `recordAiRun` with `entityType:"ServiceRequest"` + `entityId` + rich `metadataJson`; new `RoutingDecision` rows; optional `/admin/ai` routing view (table is indexed on `(feature,createdAt)` and `(entityType,entityId)`).

---

## 12. Required schema changes (Prisma)

> Apply via the repo's manual-migration convention (`prisma/manual-migrations/*` + `prisma db push`). All additive — no destructive changes. **Do not** rewrite existing models.

1. **New `RoutingDecision` (log table)** — modeled on `ModerationLog`/`writeModerationLog`. Suggested fields: `id`, `requestId` (FK, index), `routingVersion`, `categoryCount`, `routingCategoryIds String[]`, `providerMatchCountJson` (per-category), `providersMatchedTotal`, `providersSentCount`, `providersSent String[]` (or a child `RoutingDecisionProvider` table for proper relations), `providerCapApplied Boolean`, `maxProvidersPerRequest Int`, `fallback Boolean`, `fallbackReason String?`, `projectType String?`, `routingTags String[]`, `routingConfidence Float?`, `routerSource String` (ai/deterministic), `createdAt`. Index `(requestId)`, `(routingVersion, createdAt)`.
2. **`ServiceRequestCategory`** — add `confidence Float?` and `source String?` (provenance: `ai_v4` | `deterministic` | `user` | `admin`) to capture routing provenance per category.
3. **`ServiceRequest`** — add `routingVersion String?` (cohort analysis + instant rollback) — and optionally `routingConfidence Float?` if you want the row-level v4 confidence on the request.
4. **Kill-switch (pick one):** `PlatformSettings.multiRoutingEnabled Boolean @default(false)` **or** a new `AiTouchpointConfig` touchpoint row (no schema change, just registry/defaults).
5. **Data (not schema):** seed `CategoryAlias` rows from the v4 SAFE alias map so synonymous spellings resolve to one `Category`.

*Optional follow-ups (only if exclusivity/ordering features are wanted):* `LeadUnlock`/a new assignment table for a per-request provider cap; a `(requestId, providerId)` unique on `Response`.

---

## 13. Required env / config changes

- **Reuse:** `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` (only if the candidate-extraction step uses the LLM classifiers; v4's own logic is rule-based and needs no model). `CRON_SECRET` (if a sweeper/retry cron is added — confirm it's set in prod Vercel; it's blank in `.env.example`). `UPSTASH_*` (rate-limit fail-open today — make it real before relying on caps).
- **New:** `MAX_PROVIDERS_PER_REQUEST` (env or `PlatformSettings`/touchpoint config), **default 0 = disabled** per the production plan. A `ROUTING_VERSION` constant `"multi-routing-v4"`. The kill-switch flag/touchpoint from §12.4.
- **Register** the new routing touchpoint in `prompt-config.ts` `PROMPT_DEFAULTS` + `registry.ts` `TOUCHPOINT_META` so admin gets toggle + model override + usage stats.

---

## 14. Risk list

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | **Taxonomy name → `Category.id` mismatch** (two independent snapshots; v4 may emit names absent from `Category`) | **High** | Build the mapping layer first; measure coverage; back with `CategoryAlias` + SAFE alias map; define unknown-name behavior (drop + log / `unknown` queue) |
| R2 | **Provider fan-out blow-up** (avg 3.8 cats × unbounded providers; no cap by default; synchronous fire-and-forget not in `after()`/`waitUntil` → truncation on Vercel) | **High** | Provider cap (default disabled but available as the safety valve); durable dispatch via `after()`/queue; batch the per-provider `Notification.create` |
| R3 | **Feed/unlock secondary-category dead-end** persists or regresses | **High** | Unify push + pull + `checkEligibility` on the same multi-category `expandToMatchSet` matcher; add a test for the secondary-category case |
| R4 | **Duplicate sends** on re-publish/verify (no `Notification` unique, no delivery record) | Medium | Idempotency via `RoutingDecision`/delivery record keyed on `(requestId, providerId)`; guard re-fire |
| R5 | **PENDING → APPROVED has no routing trigger** | Medium | Add a routing hook at the admin/moderation approval path (not just create) |
| R6 | **No test runner / CI** — regressions only caught by `next build` | Medium | Add deterministic unit tests (ts-node convention) for the ported v4 + taxonomy map; declare `ts-node` as a dev dep |
| R7 | **v4 is ~0.83 F1, rule-based** — quality ceiling; depends on alias normalization | Medium | Ship behind a flag + `routingVersion` cohort; observe before widening; keep deterministic fallback semantics |
| R8 | **`checkEligibility` 2-level assumption** is a latent bug if the live tree is >2 levels | Medium | Consolidate on N-level `expandToMatchSet` |
| R9 | **Rate-limit fail-open / in-memory** when `UPSTASH_*` unset → caps ineffective | Low/Med | Make Upstash mandatory for prod routing caps |
| R10 | **Dropping the "primary" concept** breaks the email label + many single-FK display/AI/analytics readers | Medium | Keep `sortOrder 0` primary + continue mirroring `category`/`categoryId` during rollout |
| R11 | **Imported/unclaimed providers** match nothing today — if assumed in scope, routing under-delivers | Low | Treat imported suppliers as out of scope unless a separate task wires their `ProviderProfileCategory` |

---

## 15. Rollback strategy

1. **`routingVersion` stamp on every request** → the matcher reads the active version; flip it back to the prior single-primary routing to revert instantly **without a deploy**. The affected cohort is identifiable and re-routable.
2. **Kill-switch** (`PlatformSettings.multiRoutingEnabled` or the touchpoint `enabled` flag, 20–30s cache) — disable v4 and fall back to the existing `notifyRelevantProviders`/board behavior.
3. **`MAX_PROVIDERS_PER_REQUEST`** — the fast safety valve: lower/set it to throttle provider fan-out immediately; **categories stay intact**.
4. **Keep the dual-write** (primary mirror into `category`/`categoryId`) throughout rollout so every legacy single-FK reader keeps working; only retire it after all consumers are switched.
5. **Additive schema only** — new tables/columns; no destructive change, so a code rollback leaves the DB valid.

---

## 16. Step-by-step implementation plan (for the next agent)

**Phase 0 — Decide & measure (no code shipped).**
- Resolve the §17 open questions, especially: does v4 run **in-app** (recommended) vs as an external orchestrator step; does it replace `request_improve`, `category_suggest`, or both; run at **creation** vs **dispatch**.
- **Measure taxonomy coverage:** how many of v4's emittable canonical names have a matching `Category` row (name/slug/externalSlug/alias). This gates everything.

**Phase 1 — Port the brain + mapping (pure, testable, no wiring).**
- `src/lib/routing/multi-routing-v4.ts`: TS port of `classify()` + `route_request()` (dependency-free).
- `src/lib/routing/taxonomy-map.ts`: canonical-name → `Category.id`, alias-backed, unknown-handling.
- Unit tests (ts-node + `node:assert`, no DB) mirroring `category-selection-rules.test.ts`; add a `package.json` script like `test:telegram`.

**Phase 2 — Schema (additive, via manual-migrations + `db push`).**
- `RoutingDecision` log table; `ServiceRequestCategory.confidence`/`source`; `ServiceRequest.routingVersion`; kill-switch flag/touchpoint. Seed `CategoryAlias` from the SAFE alias map.

**Phase 3 — Wire candidate extraction → v4 at creation.**
- Feed `improveDescription`/`suggestCategories` output as v4 candidates; persist `routing_categories` to `ServiceRequestCategory` (provenance + sortOrder), keep the primary mirror, stamp `routingVersion`, write a `RoutingDecision` row. Behind the kill-switch (off in prod initially).

**Phase 4 — Unify the matcher (push + pull + eligibility).**
- One engine on `expandToMatchSet` + `activeCategoryFilter`; switch the 4 board WHERE filters to `categories: { some: { categoryId: { in } } }` (mind DISTINCT count/pagination); change `checkEligibility` to `CategoryNode[]` and route its 4 call sites; add same-city/active ordering + dedupe + optional provider cap. Log zero-match + fallback.

**Phase 5 — Durability + idempotency.**
- Wrap dispatch in `after()`/`waitUntil` (or a sweeper cron); batch `Notification.create`; dedup sends per `(requestId, providerId)`; add a routing trigger on PENDING→APPROVED.

**Phase 6 — Observability + admin.**
- `recordAiRun` with `entityId` + `RoutingDecision` rows; optional `/admin/ai` routing view; extend `src/lib/admin/ai-usage.ts` to surface routing fields.

**Phase 7 — Rollout.**
- Enable for a cohort via `routingVersion`/flag; watch the logs (category_count, providers_matched/sent, cap firings, fallback rate, complaints); only then decide a provider cap value and whether to retire the legacy rule layer (`category-selection-rules.ts`, `category-overrides.ts`) and the primary mirror.

**Validation each phase:** `pnpm build` (tsc + ESLint gate) + the new deterministic unit tests; do not rely on the AI smoke script for routine checks (it costs money and needs live keys).

---

## 17. Explicit file lists

### 17a. Files that SHOULD be changed later (integration targets)

**New files to create**
- `src/lib/routing/multi-routing-v4.ts` — TS port of `classify()` + `route_request()`.
- `src/lib/routing/taxonomy-map.ts` — canonical-name → `Category.id` (alias-backed).
- `src/lib/routing/dispatch.ts` (or similar) — the unified matcher used by both push and pull.
- `src/lib/__tests__/multi-routing-v4.test.ts` — deterministic unit test (+ `package.json` script).
- `prisma/manual-migrations/<timestamp>-routing-decision/…` — additive migration.
- (optional) `src/app/api/internal/routing-sweeper/route.ts` + a `vercel.json` cron — durable re-dispatch.
- (optional) `src/app/admin/ai/routing/…` — routing-decision admin view.

**Existing files to modify**
- `prisma/schema.prisma` — `RoutingDecision` model; `ServiceRequestCategory.confidence`/`source`; `ServiceRequest.routingVersion`; kill-switch flag.
- `src/lib/service-requests/create.ts` — run v4 at creation; persist routing set + provenance + version; emit `RoutingDecision`; call the unified matcher.
- `src/lib/request-notifications.ts` — replace push body with the unified matcher (dedupe, same-city/active order, optional cap, zero-match log).
- `src/app/api/tiekejas/uzklausos/route.ts` — switch board WHERE to the relation filter; graduate the shadow semantic score into ranking if desired.
- `src/lib/provider-eligibility.ts` — `checkEligibility` → `CategoryNode[]`; retire the 2-level `categoriesMatch` in favor of `expandToMatchSet`.
- `src/lib/category-matching.ts` — extend with location/serviceArea/ordering helpers (keep `expandToMatchSet`/`activeCategoryFilter`).
- **Eligibility call sites:** `api/tiekejas/uzklausos/[id]/route.ts:115,205`, `…/[id]/unlock/route.ts:49`, `src/components/.../ResponseSection.tsx:97`, `…/copilot/route.ts:92` — select `request.categories` and pass the array.
- **Board WHERE sites:** `tiekejas/uzklausos/route.ts:65`, `RequestsList.tsx:97`, `StatsGrid.tsx:114`, public `uzklausos/page.tsx:106`, legacy `api/uzklausos/route.ts:23`.
- `src/lib/ai-improve.ts` + `src/lib/category-suggestions.ts` — adapt to feed candidates into v4; eventually unhook the legacy rule layer.
- `src/lib/ai/prompt-config.ts` + `src/lib/ai/registry.ts` — register the `request_routing` touchpoint (kill-switch/model override).
- `src/lib/ai/audit.ts` usage — set `entityId` on routing runs.
- `src/lib/platform-settings.ts` + `api/admin/settings/route.ts` — if the flag lives in `PlatformSettings`.
- `src/app/api/requests/verify/route.ts` — route via the unified matcher; add idempotency.
- Admin/moderation approval path (e.g. `api/admin/uzklausos`, `src/lib/moderation/*`) — add the PENDING→APPROVED routing trigger.
- `package.json` — declare `ts-node` as a dev dependency; add the routing test script.
- *(Parity, non-blocking)* display/analytics readers: `api/requests/[id]/route.ts`, `MyRequestsList.tsx`, `api/paskyra/uzklausos/route.ts`, `juodrastis/route.ts`, `marketplace-intelligence.ts`.

### 17b. Files / areas that MUST NOT be touched

- **The v4 research repo** `~/Documents/KATEGORIJOS + 200K-uzklausu/**` — consume it (port logic, read the docs/SAFE-alias-map); do **not** modify it. Likewise its gold/data (`data/**`, `*.jsonl`, `*.parquet`, golden eval sets).
- **`~/orkestratorius-dashboard/scripts/orchestrator/**`** — the dev-loop tooling, not the router; not part of the app.
- **Already-applied migrations** in `prisma/manual-migrations/` (historical) — add new ones; never edit/delete existing.
- **`prisma/seed.ts`** and the supplier-import pipeline (`scripts/import-*.js`, `enrich-suppliers.js`, `SupplierRecord`/`SupplierCategoryLink` flow) — unrelated; imported suppliers are out of matching scope.
- **Credit/ledger atomicity** — `src/lib/credits.ts` (`unlockLead`, `CreditTransaction`, `LeadUnlock` write path). Extend carefully (e.g. a new field) but do **not** rewrite the charge/idempotency semantics.
- **Payments** — `src/app/api/stripe/**`, Stripe webhook.
- **Auth** — `src/app/api/auth/[...nextauth]/route.ts`, NextAuth config.
- **Moderation verdict engine** (`src/lib/moderation/ai.ts` core) — add a hook, don't change the verdict logic.
- **`.env` / `.env.local` / `.env.example` secrets** — don't commit or rewrite secrets; add new keys via the deployment env.
- **`src/lib/telegram/*` intake state machine** — funnels through `createServiceRequest`; no separate Telegram routing path should be invented.
- **Production data** — no migrations against, or backfills of, live data without explicit sign-off.

---

## 18. Open questions / decisions needed before coding

**Architecture**
1. Does v4 run **in-app** (TS port — recommended) or as the external orchestrator producing `categoryIds`? (Determines lib swap vs API contract.)
2. Run v4 at **creation** (produce/persist the routing set) or at **dispatch** (keep stored categories, expand the routing/matching set)? Recommended: at creation, persist all, unify the matcher.
3. Replace **both** `request_improve` and `category_suggest`, or only the primary? Is the provider-side `category_picker` in scope? (Recommended: request-side only.)
4. What feeds the candidate set in production — free text via the existing classifiers, the user's pre-selected categories, or both?

**Taxonomy & data**
5. Does `Category` contain a row for **every** canonical name v4 can emit? (Measure coverage; node counts differ 3255 vs 840.) Behavior for unmatched names?
6. Adopt the v4 SAFE alias map into `CategoryAlias`? How is `routing_confidence` used — gating or advisory only (it's per-request, not per-category)?

**Matching & dispatch**
7. Should `serviceArea[]`/`primaryCity` finally participate in geo matching, or stay SEO-only? Move location from exact-string to region/geo?
8. Enable `MAX_PROVIDERS_PER_REQUEST` in prod, and at what value? (Plan says set only after observing real fan-out.)
9. Keep the **"primary"** concept (`sortOrder 0` + the `category`/`categoryId` mirror)? Many display/AI/analytics sites and the email label depend on it.
10. For the WHERE switch to `categories: { some }`, confirm DISTINCT count/pagination vs `MAX_SCORED_LEADS`.
11. Unify `checkEligibility` on N-level `expandToMatchSet`, or is the live tree guaranteed 2-level?
12. Add a routing trigger on **PENDING→APPROVED** admin approval? (Today only the email-verify path re-fires push.)

**Ops**
13. Synchronous (current) or async (`after()`/queue/cron) dispatch? (Async needs a new dependency — none today.)
14. Kill-switch in `PlatformSettings` (broad, 30s cache) or `AiTouchpointConfig` (AI-specific, model/prompt override, 20s cache)?
15. Is Upstash mandatory before prod (rate-limit fails open today)? Is `CRON_SECRET` provisioned in prod Vercel?
16. Add a real test gate / CI, or keep `next build` as the only gate? Declare `ts-node` as a dev dep?

---

### Appendix — provenance of this audit

Produced read-only by inspecting both repos and a 13-agent verification workflow (request creation, classifier, provider model, dispatch, logs/admin, env/config, tests, consumer blast-radius, v4 contract) with four adversarial cross-checks (push-vs-pull, multi-category store, classifier output shape, matching query) — all four returned **"partial"**, correcting initial assumptions (the app **does** auto-push alerts on create; the legacy classifiers **already** emit ranked multi-category lists; the binding gates still use the **single** primary `categoryId`; location matching is exact-string with `serviceArea[]`/`primaryCity` unused). Every concrete claim above is backed by a `file:line` reference in the underlying findings.
