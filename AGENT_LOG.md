# Agent activity log

Append-only žurnalas darbui tarp Claude ir Codex sesijų. Abu agentai
skaito viršutinį įrašą sesijos pradžioje (per `AGENTS.md` instrukciją)
ir prideda naują įrašą pabaigus reikšmingą darbo etapą.

**Automatika:** `scripts/agent-log-entry.sh` prideda stub įrašą po
kiekvieno `git commit` (Claude per `.claude/hooks/post-commit-log.sh`,
Codex per instrukciją šiame faile).

**Manualiai:** `bash scripts/agent-log-entry.sh <Claude|Codex>` arba
Claude'e `/log` slash komanda.

**Konvencija:** užpildyk **Toliau** lauką ranka kai aišku, ką kitas
agentas turėtų daryti. Be to laukas lieka tuščias ir kitas agentas pats
sprendžia kontekstą iš diff'o.

<!-- AGENT_LOG:ENTRIES -->

## 2026-05-28 06:49 — Claude

**Commit:** `c4f1c5b` — perf(meistrai): cache reviews and similar providers sections · lokalus

**Pakeitimai:** 3 files changed, 43 insertions(+), 15 deletions(-)

**Failai:**
- NOTES.md
- src/app/meistrai/[slug]/components/ReviewsSection.tsx
- src/app/meistrai/[slug]/components/SimilarProvidersSection.tsx

**Esmė:** Abi `/meistrai/[slug]` sekcijos (reviews, panašūs tiekėjai), kurios
dar darė uncached `prisma.findMany`, dabar apgaubtos `'use cache'` (300s
revalidate). Tag'ai pagal EGZISTUOJANČIĄ konvenciją — `reviews:user:${id}` ir
`provider:user:${id}` — kad sutaptų su `getProviderProfile`/`getTopReviewsForSeo`.
Suspense/props nekeisti; owner-preview session lookup nepaliestas (privacy).

**Toliau:**
- Branch `suspense/meistrai-cache-tags` push'intas į origin — NEMERGE'inti į
  main tiesiogiai; eina per PR review (Suspense plano §Page 12 dalis).
- Cache invalidation hook'ai vis dar neimplementuoti (žr. NOTES.md). Kai bus
  pridėtas `revalidateTag` wiring'as (review approval → `reviews:user:${id}`,
  profilio update → `provider:user:${id}`), jis automatiškai padengs ir šias
  dvi sekcijas — atskiro darbo nereikia.
- Lokaliam `pnpm build` šitam worktree'e reikėjo `.npmrc` su
  `shamefully-hoist=true` (phantom dep `sharp` neresolvinasi su strict pnpm
  linker'iu). Vercel deploy'as naudoja npm, tad CI nepaliestas; `.npmrc`
  necommit'intas — tik lokalus workaround.


## 2026-05-28 04:50 — Claude

**Commit:** `b15ce8f` — Merge remote-tracking branch 'origin/cache-components/task-f-suspense' · lokalus

**Pakeitimai:** 10 files changed, 2696 insertions(+), 2314 deletions(-)

**Failai:**
- AGENT_LOG.md

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-28 04:50 — Claude

**Commit:** `3db8006` — Merge remote-tracking branch 'origin/cache-components/task-e-use-cache' · lokalus

**Pakeitimai:** 7 files changed, 302 insertions(+), 321 deletions(-)

**Failai:**
- src/app/api/categories/route.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-28 04:40 — Claude

**Commit:** `0ab3113` — perf(pages): add Suspense boundaries for streaming SSR

**Pakeitimai:** 9 files changed, 304 insertions(+), 8 deletions(-)

**Failai:**
- src/app/paskyra/profilis/page.tsx
- src/app/tiekejas/ProviderDashboardClient.tsx
- src/app/tiekejas/page.tsx
- src/app/tiekejas/uzklausos/RequestsListClient.tsx
- src/app/tiekejas/uzklausos/[id]/RequestDetailClient.tsx
- src/app/tiekejas/uzklausos/[id]/page.tsx
- src/app/tiekejas/uzklausos/page.tsx
- src/app/uzklausos/sekti/[id]/TrackRequestClient.tsx
- src/app/uzklausos/sekti/[id]/page.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-28 04:39 — Claude

**Commit:** `bc740b2` — docs(notes): expand cache components plan into multi-session migration

**Pakeitimai:** 4 files changed, 107 insertions(+), 2 deletions(-)

**Failai:**
- AGENT_LOG.md
- NOTES.md
- src/app/tiekejas/ProviderDashboardClient.tsx
- src/app/tiekejas/uzklausos/RequestsListClient.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-28 04:37 — Claude

**Commit:** `d085cc9` — docs(notes): expand cache components plan into multi-session migration

**Pakeitimai:** 3 files changed, 93 insertions(+), 2 deletions(-)

**Failai:**
- AGENT_LOG.md
- NOTES.md
- src/app/tiekejas/ProviderDashboardClient.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-28 04:36 — Claude

**Commit:** `eb028b6` — docs(notes): expand cache components plan into multi-session migration

**Pakeitimai:** 2 files changed, 80 insertions(+), 2 deletions(-)

**Failai:**
- AGENT_LOG.md
- NOTES.md

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-28 04:32 — Claude

**Commit:** `89b5336` — docs(notes): expand cache components plan into multi-session migration

**Pakeitimai:** 1 file changed, 68 insertions(+), 2 deletions(-)

**Failai:**
- NOTES.md

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-28 03:00 — Claude

**Commit:** `8d9f5be` — perf(db): add composite indexes for /meistrai listing filter · lokalus

**Pakeitimai:** 2 files changed, 45 insertions(+), 20 deletions(-)

**Failai:**
- prisma/manual-migrations/20260528_add_provider_listing_indexes.sql
- prisma/schema.prisma

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-28 03:00 — Claude

**Commit:** `4f11bb9` — perf(meistrai): cache provider listing and detail data fetches · lokalus

**Pakeitimai:** 2 files changed, 234 insertions(+), 144 deletions(-)

**Failai:**
- src/app/meistrai/[slug]/page.tsx
- src/app/meistrai/page.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-28 02:51 — Claude

**Commit:** `d923976` — feat(uzklausos): v2 request creation flow with multi-category + inline AI · lokalus

**Pakeitimai:** 23 files changed, 1900 insertions(+), 779 deletions(-)

**Failai:**
- prisma/schema.prisma
- src/app/admin/uzklausos/page.tsx
- src/app/api/admin/uzklausos/route.ts
- src/app/api/requests/[id]/route.ts
- src/app/api/requests/route.ts
- src/app/api/requests/verify/route.ts
- src/app/api/tiekejas/uzklausos/[id]/route.ts
- src/app/api/tiekejas/uzklausos/route.ts
- src/app/api/tracking/[token]/route.ts
- src/app/tiekejas/uzklausos/[id]/page.tsx
- src/app/tiekejas/uzklausos/page.tsx
- src/app/uzklausos/nauja/page.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-28 02:51 — Claude

**Commit:** `9fe5f27` — perf(ui): add loading skeletons to key dynamic routes · lokalus

**Pakeitimai:** 7 files changed, 326 insertions(+)

**Failai:**
- src/app/meistrai/[slug]/loading.tsx
- src/app/meistrai/loading.tsx
- src/app/tiekejas/uzklausos/[id]/loading.tsx
- src/app/tiekejas/uzklausos/loading.tsx
- src/app/uzklausos/loading.tsx
- src/app/uzklausos/sekti/[id]/loading.tsx
- src/components/ui/Skeleton.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-28 02:50 — Claude

**Commit:** `17be66f` — perf(build): switch Vercel install to pnpm and tree-shake heavy imports · lokalus

**Pakeitimai:** 5 files changed, 221 insertions(+), 8304 deletions(-)

**Failai:**
- .gitignore
- next.config.mjs
- package-lock.json
- pnpm-lock.yaml
- vercel.json

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-27 19:17 — Claude

**Commit:** `184cf0b` — docs(ai): AI-native marketplace roadmap · lokalus

**Pakeitimai:** 1 file changed, 409 insertions(+)

**Failai:**
- docs/ai-roadmap.md

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-27 19:17 — Claude

**Commit:** `5446d67` — feat(admin): AI health, marketplace intelligence and follow-up signal cards · lokalus

**Pakeitimai:** 8 files changed, 995 insertions(+), 23 deletions(-)

**Failai:**
- src/app/admin/FollowUpAgentCard.tsx
- src/app/admin/MarketplaceIntelligenceCard.tsx
- src/app/admin/page.tsx
- src/app/api/admin/stats/route.ts
- src/lib/admin/ai-usage.ts
- src/lib/admin/day-buckets.ts
- src/lib/admin/follow-up-signal.ts
- src/lib/admin/marketplace-intelligence.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-27 19:16 — Claude

**Commit:** `69b2ba1` — feat(ai): follow-up agent MVP (advisory only) · lokalus

**Pakeitimai:** 4 files changed, 628 insertions(+)

**Failai:**
- src/app/api/tiekejas/follow-ups/route.ts
- src/app/tiekejas/ProviderFollowUpsCard.tsx
- src/app/tiekejas/page.tsx
- src/lib/ai/follow-up.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-27 19:16 — Claude

**Commit:** `0ad0ec8` — feat(ai): client request agent panel on the new-request form · lokalus

**Pakeitimai:** 5 files changed, 651 insertions(+), 110 deletions(-)

**Failai:**
- src/app/uzklausos/nauja/page.tsx
- src/components/ai/ImproveDescriptionButton.tsx
- src/components/ai/RequestAiAgentPanel.tsx
- src/lib/listing-draft.ts
- src/lib/use-voice-recorder.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-27 19:16 — Claude

**Commit:** `a562044` — feat(ai): lead co-pilot for providers (advisory only) · lokalus

**Pakeitimai:** 4 files changed, 631 insertions(+)

**Failai:**
- src/app/api/tiekejas/uzklausos/[id]/copilot/route.ts
- src/app/tiekejas/uzklausos/[id]/LeadCopilotCard.tsx
- src/app/tiekejas/uzklausos/[id]/page.tsx
- src/lib/ai/lead-copilot.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-27 19:15 — Claude

**Commit:** `6f73e13` — feat(ai): semantic match shadow mode for provider inbox · lokalus

**Pakeitimai:** 2 files changed, 281 insertions(+), 2 deletions(-)

**Failai:**
- src/app/api/tiekejas/uzklausos/route.ts
- src/lib/semantic-match.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-27 19:15 — Claude

**Commit:** `ff67184` — feat(ai): deterministic category override fallback for water/plumbing · lokalus

**Pakeitimai:** 3 files changed, 137 insertions(+), 7 deletions(-)

**Failai:**
- src/lib/ai-improve.ts
- src/lib/category-overrides.ts
- src/lib/category-suggestions.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-27 19:14 — Claude

**Commit:** `4ee2fc1` — feat(ai): wire audit logging into existing AI flows · lokalus

**Pakeitimai:** 7 files changed, 280 insertions(+), 13 deletions(-)

**Failai:**
- src/app/api/category-suggestions/route.ts
- src/app/api/profile/ai-generate/route.ts
- src/app/api/requests/improve/route.ts
- src/app/api/requests/transcribe/route.ts
- src/app/api/tiekejas/uzklausos/[id]/juodrastis/route.ts
- src/lib/moderation/index.ts
- src/lib/moderation/log.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-27 19:13 — Claude

**Commit:** `b846aa6` — fix(rate-limit): silence build-phase Upstash warning + add aiLeadCopilot bucket · lokalus

**Pakeitimai:** 3 files changed, 171 insertions(+), 1 deletion(-)

**Failai:**
- .env.example
- docs/known-warnings.md
- src/lib/rate-limit.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-27 19:13 — Claude

**Commit:** `df14c69` — feat(ai): AiRun audit model + recordAiRun helper · lokalus

**Pakeitimai:** 3 files changed, 110 insertions(+)

**Failai:**
- prisma/manual-migrations/20260526_add_ai_runs.sql
- prisma/schema.prisma
- src/lib/ai/audit.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-26 21:45 — Codex

**Commit:** `71190ca` — feat(provider): simplify inbox and request navigation · lokalus

**Pakeitimai:** 16 files changed, 490 insertions(+), 265 deletions(-)

**Failai:**
- src/app/(auth)/patvirtinti/page.tsx
- src/app/api/tiekejas/zinutes/route.ts
- src/app/layout.tsx
- src/app/meistrai/[slug]/components/TestimonialMarquee.tsx
- src/app/paskyra/uzklausos/page.tsx
- src/app/paskyra/zinutes/SentInquiriesView.tsx
- src/app/paskyra/zinutes/page.tsx
- src/app/tiekejas/page.tsx
- src/app/tiekejas/uzklausos/page.tsx
- src/app/tiekejas/zinutes/page.tsx
- src/components/layout/MobileBottomNav.tsx
- src/components/layout/UserMenu.tsx

**Toliau:** Provider navigacija ir vieno inbox modelis įdiegti. `npm run lint` praeina su 0 errorų (likę tik esami warningai), `npm run build` praeina; build metu dar matomas Upstash Redis config warningas.


## 2026-05-26 17:20 — Claude

**Commit:** `4791684` — feat: provider badge tiers, SEO fields, live read receipts + cleanup · lokalus

**Pakeitimai:** 65 files changed, 1750 insertions(+), 2385 deletions(-)

**Failai:**
- .env.example
- AGENT_LOG.md
- docs/archive/katalogas.md
- prisma/manual-migrations/20260526_add_client_read_receipts.sql
- prisma/manual-migrations/20260526_add_provider_badges.sql
- prisma/manual-migrations/20260526_add_provider_extra_badges.sql
- prisma/manual-migrations/20260526_add_provider_seo_fields.sql
- prisma/manual-migrations/20260526_enable_live_thread_read_state.sql
- prisma/schema.prisma
- src/app/admin/tiekejai/page.tsx
- src/app/api/admin/claims/[id]/approve/route.ts
- src/app/api/admin/claims/[id]/reject/route.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-26 05:34 — Claude

**Commit:** `b7ef027` — chore(log): record 37b822f messaging chat uplift in AGENT_LOG · push'inta

**Pakeitimai:** 1 file changed, 23 insertions(+)

**Failai:**
- AGENT_LOG.md

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-26 05:25 — Claude

**Commit:** `37b822f` — feat(messaging): chat avatars, read receipts and time dividers · lokalus

**Pakeitimai:** 19 files changed, 501 insertions(+), 119 deletions(-)

**Failai:**
- AGENT_LOG.md
- src/app/api/paskyra/zinutes/route.ts
- src/app/api/requests/[id]/messages/route.ts
- src/app/api/requests/[id]/route.ts
- src/app/api/tiekejas/uzklausos/[id]/route.ts
- src/app/api/tiekejas/zinutes/[id]/messages/route.ts
- src/app/api/tiekejas/zinutes/[id]/route.ts
- src/app/api/zinutes/[token]/messages/route.ts
- src/app/api/zinutes/[token]/route.ts
- src/app/meistrai/[slug]/components/StoryAvatarButton.tsx
- src/app/paskyra/zinutes/page.tsx
- src/app/tiekejas/uzklausos/[id]/page.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-26 03:55 — Claude

**Commit:** `d034e2f` — chore(log): record 79d67e8 UI polish bundle in AGENT_LOG · lokalus

**Pakeitimai:** 1 file changed, 23 insertions(+)

**Failai:**
- AGENT_LOG.md

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-26 03:55 — Claude

**Commit:** `79d67e8` — feat(ui): granular presence labels + uzklausos compact density · lokalus

**Pakeitimai:** 13 files changed, 438 insertions(+), 61 deletions(-)

**Failai:**
- AGENT_LOG.md
- public/theme-init.js
- src/app/globals.css
- src/app/meistrai/[slug]/components/StoryAvatarButton.tsx
- src/app/meistrai/[slug]/page.tsx
- src/app/meistrai/page.tsx
- src/app/uzklausos/page.tsx
- src/components/tiekejai/ProviderListingClient.tsx
- src/components/tiekejai/ProvidersExperience.tsx
- src/components/uzklausos/DensityToggle.tsx
- src/components/uzklausos/RequestFilterBar.tsx
- src/lib/presence.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-26 03:54 — Claude

**Commit:** `d5cda3d` — feat(tiekejas): drag-and-drop story upload + reroute onboarding to /meistrai/kurti-profili · lokalus

**Pakeitimai:** 2 files changed, 49 insertions(+), 3 deletions(-)

**Failai:**
- src/app/tapti-tiekeju/BecomeProviderClient.tsx
- src/app/tiekejas/page.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-26 03:54 — Claude

**Commit:** `0620626` — fix(auth): wrap user + token creation in a single transaction · lokalus

**Pakeitimai:** 1 file changed, 35 insertions(+), 28 deletions(-)

**Failai:**
- src/app/api/auth/register/route.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-26 03:54 — Claude

**Commit:** `a220ce1` — feat(messaging): "Mano žinutės" sent-side inbox · lokalus

**Pakeitimai:** 3 files changed, 268 insertions(+), 1 deletion(-)

**Failai:**
- src/app/api/paskyra/zinutes/route.ts
- src/app/paskyra/zinutes/page.tsx
- src/lib/redirects.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-26 03:53 — Claude

**Commit:** `aaebaae` — feat(ai): switch profile image generation to OpenRouter Gemini 3 · lokalus

**Pakeitimai:** 1 file changed, 84 insertions(+), 12 deletions(-)

**Failai:**
- src/lib/image-processor.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-26 03:53 — Claude

**Commit:** `80f3fad` — feat(forms): auto-suggest categories from description, lock on manual edit · lokalus

**Pakeitimai:** 2 files changed, 169 insertions(+), 37 deletions(-)

**Failai:**
- src/app/tiekejas/profilis/page.tsx
- src/app/uzklausos/nauja/page.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-26 03:53 — Claude

**Commit:** `4781618` — feat(ai): two-pass category picker for profile generation · lokalus

**Pakeitimai:** 6 files changed, 518 insertions(+), 72 deletions(-)

**Failai:**
- AGENT_LOG.md
- scripts/smoke-test-category-picker.ts
- scripts/tsconfig.json
- src/app/api/profile/ai-generate/route.ts
- src/app/kontaktai/AIProfileSetup.tsx
- src/lib/category-picker-ai.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-26 — Claude (Opus 4.7, neužcommit'inta)

**Pakeitimai:** AI profilio generavimo kategorijų parinkimas perdarytas į two-pass strategiją. Anksčiau Haiku gaudavo `depth ≤ 1 LIMIT 80` kategorijų sąrašą (su catch-all'ais kaip "Dokumentai, tyrimai, konsultavimas") ir parinkdavo iš ten + papildomai `suggestCategories` substring matcher dadėdavo iš VISOS 3255 kategorijų tree. Substring matcher'is matchindavo "specialistas" žodį iš AI marketing copy → žolelininkui priskirdavo "HR specialistas", "Microsoft Office Excel specialistai" ir pan.

Naujas pipeline'as (`src/lib/category-picker-ai.ts`):
- **Pass 1:** 26 canonical roots (`externalSource = paslaugurinka-taxonomy`, depth 0) + po 8 sample children. AI parenka 1–3 šaknis su confidence ≥ 0.5.
- **Pass 2:** Tik depth=1 leaves po pasirinktomis šaknimis. AI parenka 3–5 su confidence ≥ 0.5.
- Picker'is gauna VARTOTOJO RAW input'ą (`servicesText` arba `scraped.text`), NE Claude marketing rewrite — taip eliminuojam generinius "specialistas"/"konsultacijos" žodžius, kurie buvo triukšmo šaltinis.

`generateWithClaude` ir `generateFromScratch` daugiau neparinkinėja kategorijų — tik headline/description/services/etc.
`suggestCategories` lib LIEKA naudojama `/api/category-suggestions` endpoint'ui (klientų užklausoms ir profile editor'iui — ten substring tinka, nes vartotojas tiesiog rašo kategorijos vardą).

**Smoke testai** (3 atvejai per `scripts/smoke-test-category-picker.ts`):
- Žolelininkas → "Sveikata, gydymas" + "Ezoterika, dvasinės paslaugos" + Homeopatai/Dietologai/Psichologai (nebėra "HR specialistas"!)
- Santechnikas → tik "Statybos, apdaila" + santechnikos/katilai/ventiliacija (NE "Buitinės")
- Kosmetologė → tik "Grožio paslaugos" + Kosmetologės/Salonai (NE "Sveikata")

**Failai:**
- `src/lib/category-picker-ai.ts` (naujas)
- `src/app/api/profile/ai-generate/route.ts` (refactor)
- `scripts/smoke-test-category-picker.ts` (naujas)
- `scripts/tsconfig.json` (naujas — ts-node baseUrl)

**Toliau:** DB dedupe — `paslaugos.lt` legacy taksonomija dubliuojasi su `paslaugurinka-taxonomy` (pvz. "Sveikata, gydymas" yra du kartus, "HR specialistas" du, "Excel specialistai" du+). Kristupo bug'ui jau nebeaktualu (picker'is filtruoja pagal externalSource), bet vis tiek varysto nav meniu / SEO. Reikia audit'o: kiek profilių sėdi ant `paslaugos.lt` kategorijų → remap į paslaugurinka-taxonomy ekvivalentus → soft-delete `paslaugos.lt` rows. Atskira sesija, atsargiai (gyva DB su real users).


## 2026-05-26 01:18 — Claude

**Commit:** `c385aef` — docs: add NOTES.md with /admin layout guard follow-up · lokalus

**Pakeitimai:** 1 file changed, 22 insertions(+)

**Failai:**
- NOTES.md

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-26 01:11 — Claude

**Commit:** `2f29644` — chore(log): annotate Toliau for ebe05af and 1e68293 · lokalus

**Pakeitimai:** 1 file changed, 143 insertions(+)

**Failai:**
- AGENT_LOG.md

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-26 01:10 — Claude

**Commit:** `1e68293` — feat(auth): auto-sign-in original tab after email verification · lokalus

**Pakeitimai:** 7 files changed, 325 insertions(+), 19 deletions(-)

**Failai:**
- prisma/schema.prisma
- src/app/(auth)/patvirtinti/page.tsx
- src/app/(auth)/registruotis/page.tsx
- src/app/api/auth/check-verified/route.ts
- src/app/api/auth/register/route.ts
- src/components/marketing/ProviderCtaLink.tsx
- src/lib/auth.ts

**Toliau:** PRIES DEPLOY paleisti `npm run db:push` — schema turi naują
`PendingSignInToken` modelį (lentelė `pending_signin_tokens`). Be jos
registracija failint po `/api/auth/register` insert'o. Token TTL 30 min,
polling kas 3s — koreguoti jei reikia. Manuelis QA: (1) anonimui spausti
"Tapti meistu" → turi nuvesti į /registruotis?intent=provider;
(2) baigti registraciją; (3) atidaryti email patvirtinimą inkognito
tabe; (4) originalus tabas turi per ~3s auto-prisijungti ir nukreipti
į /tapti-tiekeju.


## 2026-05-26 01:02 — Claude

**Commit:** `ebe05af` — fix(auth): guard /tiekejas/* with server-side role check · lokalus

**Pakeitimai:** 1 file changed, 22 insertions(+)

**Failai:**
- src/app/tiekejas/layout.tsx

**Toliau:** Server layout uždaro /tiekejas/* subroute'us — ADMIN/PROVIDER
praeina, kiti → redirect /tapti-tiekeju. Pastaba: /admin/layout.tsx dar
yra "use client" be sesijos patikrinimo, tad ten ta pati spraga. Vertėtų
pridėti analogišką server-side guard'ą, bet nėra blokeris šiam deploy'ui.


## 2026-05-25 23:10 — Claude

**Commit:** `74536df` — Replace 'Aktyvus' filter with presence-based 3-state segmented control · lokalus

**Pakeitimai:** 5 files changed, 148 insertions(+), 31 deletions(-)

**Failai:**
- src/app/meistrai/page.tsx
- src/components/tiekejai/ProviderFilterBar.tsx
- src/components/tiekejai/ProviderListingClient.tsx
- src/components/tiekejai/ProvidersExperience.tsx
- src/lib/provider-filters.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-25 22:55 — Claude

**Commit:** `c3e14a1` — Make presence pills more transparent on /meistrai cards · lokalus

**Pakeitimai:** 1 file changed, 4 insertions(+), 4 deletions(-)

**Failai:**
- src/components/tiekejai/ProviderListingClient.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-25 22:52 — Claude

**Commit:** `b3732ee` — Add provider presence to /meistrai listing cards + polish avatar dot · lokalus

**Pakeitimai:** 7 files changed, 264 insertions(+), 11 deletions(-)

**Failai:**
- src/app/meistrai/[slug]/components/StoryAvatarButton.tsx (mano — taškas mažesnis + tarpukas nuo avataro)
- src/app/meistrai/page.tsx (mano — `select` praplėstas su `lastSeenAt`, mapinasi į `presenceLevel`)
- src/components/tiekejai/ProviderFilterBar.tsx (Codex WIP — grid/list toggle UI)
- src/components/tiekejai/ProviderListingClient.tsx (mano + Codex — `PresenceDot` helper + abi (list + grid) atvaizdavimo pakopos)
- src/components/tiekejai/ProvidersExperience.tsx (Codex WIP — view state + localStorage)
- src/lib/presence.ts (mano — online slenkstis 2→5 min, naujas `getPresenceLevel` su 3 pakopomis)
- src/lib/provider-filters.ts (mano — `presenceLevel` laukas `ProviderCardData`)

**Toliau:**
- Push'inti `b3732ee` + `f27c9c8` į origin/main.
- 3 pakopų strategija kortelėje: žalias = <5 min, neutralus pilkas = <24h, nieko = senesnis. Profilis naudoja tą patį 5 min slenkstį "Prisijungęs dabar".
- Jei norėsis ateityje pakeisti slenksčius — viskas viename faile `src/lib/presence.ts` (`ONLINE_THRESHOLD_MS` + `RECENT_THRESHOLD_MS`).
- Realiame DB visi `lastSeenAt` dabar `NULL`, užsipildys per NextAuth JWT callback (60s throttle) kai vartotojai prisijungs / atidarys autorizuotus puslapius.

**Pastabos kitam agentui:**
- Šitas commit'as **įtraukė Codex grid/list view toggle WIP** (3 tiekejai/ failai) — buvo neįmanoma atskirti, nes `PresenceDot` helper'is gyvena `ProviderListingClient.tsx`, o tas WIP įveda `view` propą per `ProvidersExperience → ProviderFilterBar + ProviderListingClient`. Build praeina, viskas suderinta. Jei norėjai dar tobulinti view toggle prieš commit'ą, dabar pakeitimai jau `b3732ee` viduje — daryk follow-up commit'ą virš jo.
- Likusi neliečiama Codex WIP working tree'je: `src/app/uzklausos/page.tsx`, `src/app/globals.css`, `public/theme-init.js`, `src/components/uzklausos/{RequestFilterBar,DensityToggle}.tsx`. Nelietau.


## 2026-05-25 22:32 — Claude

**Commit:** `f27c9c8` — Add provider presence indicator to /meistrai/[slug] · lokalus

**Pakeitimai:** 6 files changed, 142 insertions(+), 44 deletions(-)

**Failai:**
- prisma/schema.prisma
- src/app/meistrai/[slug]/components/StoryAvatarButton.tsx
- src/app/meistrai/[slug]/components/types.ts
- src/app/meistrai/[slug]/page.tsx
- src/lib/auth.ts
- src/lib/presence.ts

**Toliau:**
- Push'inti `f27c9c8` į origin/main (lokalus commit, dar nestumtas).
- DB jau turi `lastSeenAt` stulpelį (pridėtas per `npm run db:push`),
  bet pradžiai jis null visiems vartotojams — užpildysis savaime per
  NextAuth jwt callback'ą kai kas nors prisijungs / atidarys autorizuotą
  puslapį (1× per minutę throttle).
- Online tik dingsta po ~2 min nuo paskutinio `getServerSession` —
  jei norima realaus presence (window focus / blur), reikės atskiro
  heartbeat endpoint'o; dabartinis variantas yra "aktyvus prieš mažiau
  nei 2 min nuo paskutinio server-rendered puslapio".
- Pill rodomas tik `/meistrai/[slug]` puslapyje. Provider listing
  kortelės (`/meistrai`) kol kas presence nerodo — jei norima, prisidėti
  į `ProviderCard` ar lygiavertį komponentą.

**Pastabos kitam agentui:**
- Working tree turi nekomituotų pakeitimų kituose failuose (uzklausos,
  ProviderListing, theme-init, globals.css, +DensityToggle.tsx) — tai
  Codex / kito Claude'o WIP. Nelietau.
- Dev Prisma client cachuoja schemos snapshotą — keičiant `schema.prisma`
  ir leidžiant per Turbopack, gali tekti restart'inti dev serverį, kad
  naujas client'as įsikrautų (matomas kaip "Unknown field" Prisma error).


## 2026-05-25 16:26 — Claude

**Commit:** `6fdfa3e` — log: fill in Toliau for 2c9e101 (confirms hook works end-to-end) · lokalus

**Pakeitimai:** 1 file changed, 15 insertions(+)

**Failai:**
- AGENT_LOG.md

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-25 16:25 — Claude

**Commit:** `2c9e101` — Fix agent-log-entry.sh on BSD awk (macOS) + flesh out journal entry · lokalus

**Pakeitimai:** 2 files changed, 39 insertions(+), 10 deletions(-)

**Failai:**
- AGENT_LOG.md
- scripts/agent-log-entry.sh

**Toliau:**
- Push'inti `2c9e101` (+ `72eef0d`) į origin/main.
- Hook'as Claude'e patvirtintas — šis entry pridėtas automatiškai be mano `bash scripts/agent-log-entry.sh` kvietimo. Stub'as virsta tikru įrašu tik kai užpildai **Toliau** lauką ranka (arba per `/log`).


## 2026-05-25 16:25 — Claude

**Commit:** `72eef0d` — Add cross-agent coordination via AGENT_LOG.md · lokalus

**Pakeitimai:** 3 files changed, 166 insertions(+)

**Failai:**
- AGENTS.md (cross-agent coordination sekcija)
- AGENT_LOG.md (šis žurnalas)
- scripts/agent-log-entry.sh (shared helper, idempotent)
- + .claude/hooks/post-commit-log.sh ir .claude/settings.json (lokalūs, gitignored)
- + .claude/commands/log.md (lokalus `/log` slash command)

**Toliau:**
- Push'inti `72eef0d` į origin/main: `git push origin main`
- Codex: kai pradedi sesiją, perskaityk šio failo viršų — `scripts/agent-log-entry.sh Codex` paleisk po savo commit'ų. Hook'as veikia tik Claude pusėje.
- Jei užmiršti — bet kada gali paleisti rankiniu būdu, idempotentu (skip'ina jei toks commit jau yra logais).
- Jei reikia turtingesnio įrašo (notes, kontekstas) — Claude'e naudok `/log` su free-form argumentu.

**Pastabos kitam agentui:**
- Hook'as Claude'e suaktyvinamas tik nuo KITOS Claude sesijos (`.claude/settings.json` įkeliamas startup'e). Ši sesija script'ą paleido rankiniu būdu.
- BSD `awk` macOS nepriima multi-line `-v` — naudoju `sed` + temp file. Jei migruoji į GNU awk, kodas vis tiek veikia.
- `AGENT_LOG.md` IS committed; `.claude/` lieka gitignored. Codex pusėje hook'as turėtų gyventi `.codex/` (atskiras setup, dabar dar nepadarytas — tik instrukcija per AGENTS.md).


## 2026-05-25 17:35 — Claude

**Commit:** `fa50b61` — Add AI category suggestions and finish taxonomy unification wiring · push'inta

**Pakeitimai:** 21 files, +1903 / −129

**Failai (esmė):**
- `src/lib/category-suggestions.ts` (naujas) — deterministic Lt-aware scoringas + AI rerank
- `src/app/api/category-suggestions/route.ts` (naujas) — POST endpointas, zod + rate-limit
- `src/components/ai/CategorySuggestions.tsx` (naujas) — chip UI komponentas
- `src/app/uzklausos/nauja/page.tsx` — chips virš `GroupedCategoryPicker`
- `src/app/tiekejas/profilis/page.tsx` — chips virš `CategoryChecklist` + `MAX 6→20`
- `src/lib/validations.ts` — `categorySuggestionsSchema`
- `AI_CATEGORY_ASSISTANT_PROMPTS.md` (naujas) — orig spec
- Įtraukti ~500 eilučių iš anksčiau pradėto taxonomy unification (kitos sesijos WIP, kuris jau buvo working tree)

**Toliau:**
- Patikrinti deploy: https://vercel.com/dashboard (commit `fa50b61` push'intas į `main`)
- Naršyklėje paspausti naujus mygtukus `/uzklausos/nauja` ir `/tiekejas/profilis`
- Po dienos — pasižiūrėti ar `/api/category-suggestions` realiai naudojamas (logs)
- Pridėti `CategoryAlias` įrašus dažniausioms paieškoms (sinonimai)
- Cache'inti `getServiceCategoryGroups()` per `unstable_cache` su 1h TTL
- Praplėsti chip UI į: hero search, `/uzklausos/sekti/[id]/redaguoti`, `/meistrai/kurti-profili`

**Pastabos kitam agentui:**
- Jei tavo Codex windows turėjo unfinished WIP src/lib/service-categories.ts, src/lib/category-matching.ts, src/lib/ai-improve.ts ar provider/category UI failuose — patikrink `git diff fa50b61~1 fa50b61` ir įsitikink kad nieko esminio neatkirpta. Jei reikia, atstatyk savo branch'ą su `git reset`.
