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

## 2026-06-17 01:17 — Claude

**Commit:** `8aa1a0d` — experiment(dashboard): dismissible one-off cards (Semrush-style X)

**Pakeitimai:** 2 files changed, 96 insertions(+)

**Failai:**
- src/app/tiekejas/sections/ProviderWorkCenter.tsx
- src/components/ui/DismissibleCard.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-15 20:14 — Claude

**Commit:** `17df08a` — fix(categories): make picker search precise and results readable

**Pakeitimai:** 1 file changed, 42 insertions(+), 21 deletions(-)

**Failai:**
- src/components/categories/GroupedCategoryPicker.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-13 09:12 — Claude

**Commit:** `ddadee7` — fix(tiekejas): request rows in dashboard match inbox hierarchy · lokalus

**Pakeitimai:** 3 files changed, 116 insertions(+), 42 deletions(-)

**Failai:**
- src/app/tiekejas/sections/ProviderWorkCenter.tsx
- src/app/tiekejas/sections/provider-work-center-data.ts
- src/app/tiekejas/zinutes/ProviderInboxClient.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-13 02:23 — Claude

**Commit:** `1f852ce` — fix(home): stop SSR crash from useSession in RecentRequestBanner · lokalus

**Pakeitimai:** 1 file changed, 15 insertions(+)

**Failai:**
- src/components/guest/RecentRequestBanner.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-13 02:18 — Claude

**Commit:** `6dd1a00` — chore(notes): tracker retirement status - what shipped, what remains · lokalus

**Pakeitimai:** 1 file changed, 12 insertions(+), 12 deletions(-)

**Failai:**
- NOTES.md

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-13 02:08 — Claude

**Commit:** `bc83c32` — chore(notes): record decision to retire /uzklausos/sekti tracker page · lokalus

**Pakeitimai:** 1 file changed, 12 insertions(+)

**Failai:**
- NOTES.md

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-13 02:00 — Claude

**Commit:** `52cd6c0` — style(paskyra): request list rows match hierarchy mockup · lokalus

**Pakeitimai:** 1 file changed, 43 insertions(+), 121 deletions(-)

**Failai:**
- src/app/paskyra/uzklausos/MyRequestsList.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-13 01:58 — Claude

**Commit:** `5d4ba47` — feat(zinutes): merge own requests into inbox as expandable rows · lokalus

**Pakeitimai:** 3 files changed, 383 insertions(+), 4 deletions(-)

**Failai:**
- src/app/api/requests/mine/list/route.ts
- src/app/tiekejas/zinutes/MyRequestRow.tsx
- src/app/tiekejas/zinutes/ProviderInboxClient.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-13 01:41 — Claude

**Commit:** `09ce237` — chore(notes): record work-queue merge darbukas · lokalus

**Pakeitimai:** 1 file changed, 4 insertions(+)

**Failai:**
- NOTES.md

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-13 00:04 — Claude

**Commit:** `832f715` — chore(notes): mark uzklausu UX darbukai done + add hierarchy/strip mockups · lokalus

**Pakeitimai:** 3 files changed, 549 insertions(+)

**Failai:**
- NOTES.md
- mockups/nauja-uzklausa-su-nuoroda.html
- mockups/uzklausu-hierarchija.html

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-12 23:52 — Claude

**Commit:** `b92b1e8` — feat(uzklausos): simplify new-request card + active requests strip · lokalus

**Pakeitimai:** 5 files changed, 238 insertions(+), 237 deletions(-)

**Failai:**
- src/app/api/requests/mine/summary/route.ts
- src/app/uzklausos/nauja/page.tsx
- src/components/layout/Header.tsx
- src/components/uzklausos-v2/ActiveRequestsStrip.tsx
- src/components/uzklausos-v2/InlineListingCard.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-12 22:34 — Claude

**Commit:** `9788d93` — chore(dashboard): remove dead StatsGrid + skeleton · lokalus

**Pakeitimai:** 5 files changed, 16 insertions(+), 344 deletions(-)

**Failai:**
- AGENT_LOG.md
- src/app/tiekejas/sections/StatsGrid.tsx
- src/components/ui/skeletons/StatsGridSkeleton.tsx
- src/components/ui/skeletons/index.ts
- src/lib/provider-completeness.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-12 22:34 — Claude

**Commit:** `d614552` — chore(dashboard): remove dead StatsGrid + skeleton · lokalus

**Pakeitimai:** 2 files changed, 340 deletions(-)

**Failai:**
- src/app/tiekejas/sections/StatsGrid.tsx
- src/components/ui/skeletons/StatsGridSkeleton.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-12 21:24 — Codex

**Commit:** `f64bf37` — feat(provider): redesign dashboard work center · lokalus

**Pakeitimai:** 5 files changed, 2258 insertions(+), 51 deletions(-)

**Failai:**
- provider-dashboard-preview-clean.html
- provider-dashboard-preview.html
- src/app/tiekejas/page.tsx
- src/app/tiekejas/sections/ProviderWorkCenter.tsx
- src/app/tiekejas/sections/provider-work-center-data.ts

**Toliau:** Patikrinti `/tiekejas` prisijungus kaip tiekėjas; dashboardo buildas praėjo, bet vizualus authenticated QA dar liko.


## 2026-06-12 17:05 — Claude

**Commit:** `d179c14` — chore: route provider request page to /tiekejas/uzklausa, add design audit · lokalus

**Pakeitimai:** 58 files changed, 1020 insertions(+), 1817 deletions(-)

**Failai:**
- AGENTS.md
- DESIGN_AUDIT.md
- next.config.mjs
- public/sw.js
- src/app/(auth)/prisijungti/page.tsx
- src/app/admin/FollowUpAgentCard.tsx
- src/app/api/tiekejas/atsakymai/route.ts
- src/app/api/tiekejas/follow-ups/route.ts
- src/app/api/tracking/[token]/messages/route.ts
- src/app/api/tracking/[token]/status/route.ts
- src/app/chat-preview/page.tsx
- src/app/meistrai/[slug]/components/DirectInquiryWidget.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-11 13:01 — Claude

**Commit:** `2ece62b` — perf(fonts): Inter display optional - font swap repaint was the LCP event

**Pakeitimai:** 2 files changed, 10 insertions(+), 1 deletion(-)

**Failai:**
- NOTES.md
- src/app/layout.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-11 12:57 — Claude

**Commit:** `993a2cb` — perf: cut homepage critical path - lazy supabase-js, defer GA, fix CLS

**Pakeitimai:** 7 files changed, 65 insertions(+), 32 deletions(-)

**Failai:**
- src/app/(auth)/registruotis/page.tsx
- src/app/layout.tsx
- src/app/tiekejas/zinutes/ProviderInboxClient.tsx
- src/components/analytics/GoogleAnalytics.tsx
- src/components/layout/NotificationBell.tsx
- src/components/messaging/ThreadChat.tsx
- src/lib/supabase-browser.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-11 12:32 — Claude

**Commit:** `ac07bce` — fix(infra): clear Supabase advisor alerts + mount Speed Insights

**Pakeitimai:** 3 files changed, 30 insertions(+)

**Failai:**
- NOTES.md
- prisma/schema.prisma
- src/app/layout.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-11 09:22 — Claude

**Commit:** `a463bba` — feat(routing): v4.1 keep-direction fixes + core unit tests + golden-300 eval harness

**Pakeitimai:** 7 files changed, 782 insertions(+), 23 deletions(-)

**Failai:**
- NOTES.md
- package.json
- scripts/routing-eval-golden.ts
- scripts/shadow-routing-smoke.ts
- src/lib/routing/__tests__/multi-routing-v4.test.ts
- src/lib/routing/__tests__/taxonomy-map.test.ts
- src/lib/routing/multi-routing-v4.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-10 20:36 — Claude

**Commit:** `30f5ddd` — feat(routing): routing review queue MVP — schema + admin API + eval export

**Pakeitimai:** 10 files changed, 959 insertions(+), 1 deletion(-)

**Failai:**
- .env.example
- package.json
- prisma/manual-migrations/20260610_add_routing_review_items.sql
- prisma/schema.prisma
- src/app/api/admin/routing-review/[id]/route.ts
- src/app/api/admin/routing-review/export/route.ts
- src/app/api/admin/routing-review/route.ts
- src/lib/routing/__tests__/review-queue.test.ts
- src/lib/routing/review-queue.ts
- src/lib/routing/shadow.ts

**Toliau:** DB migracija NEpaleista — pritaikyti `prisma/manual-migrations/20260610_add_routing_review_items.sql` (arba `pnpm db:push`) prieš įjungiant `ROUTING_REVIEW_QUEUE_ENABLED`. Enqueue hook'as veikia tik kartu su `ROUTING_SHADOW_ENABLED`. Kitas etapas: admin UI peržiūros eilei + eval eksporto integracija į v4 vertinimo tooling'ą.


## 2026-06-10 19:52 — Claude

**Commit:** `0e38936` — chore(data): commit routing eval datasets + gitignore python pycache · lokalus

**Pakeitimai:** 7 files changed, 1323572 insertions(+)

**Failai:**
- .gitignore
- data/routing/category-intelligence/category_confusions.csv
- data/routing/category-intelligence/category_phrase_summary.json
- data/routing/category-intelligence/phrase_category_stats.json
- data/routing/eval/golden_eval_300_labeled.jsonl
- data/routing/eval/requests_sample_10000.parquet
- data/routing/taxonomy/taxonomy_flat.jsonl

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-10 19:39 — Claude

**Commit:** `e32d0e0` — chore(lint): zero warnings — real fixes + documented per-line disables

**Pakeitimai:** 16 files changed, 37 insertions(+), 16 deletions(-)

**Failai:**
- eslint.config.mjs
- src/app/(auth)/prisijungti/page.tsx
- src/app/api/requests/[id]/route.ts
- src/app/chat-preview/page.tsx
- src/app/paskyra/uzklausos/MyRequestsList.tsx
- src/app/tiekejas/StoryModal.tsx
- src/app/tiekejas/sections/FollowUpsCard.tsx
- src/app/tiekejas/uzklausos/sections/RequestCard.tsx
- src/app/tiekejas/uzklausos/sections/RequestsList.tsx
- src/app/tiekejas/zinutes/ProviderInboxClient.tsx
- src/components/marketing/HeroSearch.tsx
- src/components/uzklausos/RequestFilterBar.tsx

**Toliau:** Lint dabar 0 warnings — `react-hooks/purity` ir `set-state-in-effect`
liko aktyvios; naujam kodui jų neslopinti be priežasties komentaro.
`no-unused-vars` dabar laikosi `^_`/`ignoreRestSiblings` konvencijos.


## 2026-06-10 19:39 — Claude

**Commit:** `254b570` — fix(payments,ops): production blockers — webhook idempotency, refunds, health, chat reconnect

**Pakeitimai:** 12 files changed, 490 insertions(+), 21 deletions(-)

**Failai:**
- .github/workflows/ci.yml
- NOTES.md
- prisma/manual-migrations/20260610_add_webhook_events_and_charge_id.sql
- prisma/schema.prisma
- src/app/api/health/route.ts
- src/app/api/stripe/webhook/route.ts
- src/app/uzklausos/nauja/page.tsx
- src/app/uzklausos/sekti/[id]/page.tsx
- src/components/messaging/ThreadChat.tsx
- src/lib/credits.ts
- src/lib/telegram/__tests__/conversation.test.ts
- src/lib/webhook-events.ts

**Toliau:** PRIEŠ deploy: (1) pritaikyti
`prisma/manual-migrations/20260610_add_webhook_events_and_charge_id.sql`
Supabase'e — be jos webhook'as kris ant `webhook_events` lentelės;
(2) Stripe Dashboard'e prijungti `charge.refunded` prie webhook endpoint'o.
Likę launch darbai — NOTES.md sekcija "Production launch".


## 2026-06-09 09:36 — Claude

**Commit:** `3bb4a41` — feat(routing): add data-driven taxonomy domain signal to category filter · lokalus

**Pakeitimai:** 4 files changed, 247 insertions(+), 7 deletions(-)

**Failai:**
- src/lib/__tests__/category-selection-rules.test.ts
- src/lib/ai-improve.ts
- src/lib/category-selection-rules.ts
- src/lib/category-suggestions.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-09 08:58 — Claude

**Commit:** `d29edf9` — fix(routing): recover recall in live category-selection rule filter

**Pakeitimai:** 4 files changed, 168 insertions(+), 28 deletions(-)

**Failai:**
- .github/workflows/ci.yml
- package.json
- src/lib/__tests__/category-selection-rules.test.ts
- src/lib/category-selection-rules.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-08 19:53 — Claude

**Commit:** `063e118` — docs(ai-routing): record taxonomy coverage shadow findings · lokalus

**Pakeitimai:** 1 file changed, 124 insertions(+)

**Failai:**
- docs/ai-routing/2026-06-08-taxonomy-coverage-and-shadow-findings.md

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-05 12:46 — Codex

**Commit:** `431c5fa` — fix(categories): add intent-gated category selection · lokalus

**Pakeitimai:** 7 files changed, 42699 insertions(+), 19 deletions(-)

**Failai:**
- category-map.html
- src/app/api/admin/ai-registry/route.ts
- src/lib/__tests__/category-selection-rules.test.ts
- src/lib/ai-improve.ts
- src/lib/ai/prompt-config.ts
- src/lib/category-selection-rules.ts
- src/lib/category-suggestions.ts

**Toliau:** Po deploy patikrinti Telegram audio scenarijų „varva vanduo po
virtuvės kriaukle...“ — turi grįžti `Smulkūs santechnikos darbai`, be virtuvės
baldų kategorijų. Taip pat patikrinti `/admin/ai`: registry endpointas dabar
turi fallback'ą, jei `ai_touchpoint_configs.enabled` migracija dar nepritaikyta.


## 2026-06-05 09:39 — Codex

**Commit:** `9c05da9` — feat(admin): add AI workflow toggles · lokalus

**Pakeitimai:** 14 files changed, 234 insertions(+), 7 deletions(-)

**Failai:**
- prisma/manual-migrations/20260605_add_ai_touchpoint_enabled.sql
- prisma/schema.prisma
- src/app/admin/ai/page.tsx
- src/app/api/admin/ai-config/route.ts
- src/app/api/admin/ai-registry/route.ts
- src/app/api/category-suggestions/route.ts
- src/app/api/profile/ai-generate/route.ts
- src/app/api/requests/improve/route.ts
- src/app/api/requests/transcribe/route.ts
- src/app/api/tiekejas/follow-ups/route.ts
- src/app/api/tiekejas/uzklausos/[id]/copilot/route.ts
- src/app/api/tiekejas/uzklausos/[id]/juodrastis/route.ts

**Toliau:** Po deploy pritaikyti DB migraciją
`prisma/manual-migrations/20260605_add_ai_touchpoint_enabled.sql`, tada
admin `/admin/ai` išjungti `follow_up_scan` jei follow-up kortelė tiekėjo
panelėje erzina. `npm run build` praėjo lokaliai prieš commit.


## 2026-06-05 09:30 — Codex

**Commit:** `24f44d3` — fix(telegram): categorize voice drafts from cleaned text · lokalus

**Pakeitimai:** 3 files changed, 16 insertions(+), 10 deletions(-)

**Failai:**
- src/lib/category-suggestions.ts
- src/lib/telegram/__tests__/conversation.test.ts
- src/lib/telegram/conversation.ts

**Toliau:** Po production deploy pakartoti Telegram balso testą su tekstu apie
plytelių keitimą bute. Tikėtinas rezultatas: juodraščio kategorijos iš
sutvarkyto aprašymo, pvz. „Plytelių klijavimas“ / „Plytelių demontavimas“,
ne raw transkripto triukšmo kategorijos. Taip pat stebėti, ar
`category_suggest` nebekrenta dėl OpenRouter `reasoning` klaidos.


## 2026-06-05 09:14 — Codex

**Commit:** `8d2bcad` — fix(telegram): fallback category matching for voice drafts · lokalus

**Pakeitimai:** 3 files changed, 45 insertions(+), 4 deletions(-)

**Failai:**
- src/lib/telegram/__tests__/conversation.test.ts
- src/lib/telegram/bot.ts
- src/lib/telegram/conversation.ts

**Toliau:** Po production deploy patikrinti Telegram botą su realiu balso įrašu
apie aiškią paslaugą (pvz. santechnikas / plytelių klijavimas) ir įsitikinti,
kad po „Klausau įrašo...“ sukuriamas juodraštis su kategorija, nebe „Nepavyko
parinkti kategorijos“.


## 2026-06-05 08:57 — Codex

**Commit:** `a048a24` — feat(auth): add telegram qr login · lokalus

**Pakeitimai:** 15 files changed, 861 insertions(+), 13 deletions(-)

**Failai:**
- package.json
- pnpm-lock.yaml
- prisma/manual-migrations/20260605_add_telegram_login_tokens.sql
- prisma/schema.prisma
- src/app/(auth)/prisijungti/page.tsx
- src/app/admin/nustatymai/page.tsx
- src/app/api/auth/telegram-login/route.ts
- src/lib/auth.ts
- src/lib/service-requests/link-user.ts
- src/lib/telegram-login.ts
- src/lib/telegram/api.ts
- src/lib/telegram/bot.ts

**Toliau:** Po production deploy patikrinti live `/prisijungti` Telegram QR/link login flow ir įsitikinti, kad Telegram webhook nukreiptas į `https://www.paslaugurinka.lt/api/telegram/webhook`.


## 2026-06-05 01:23 — Codex

**Commit:** `822d326` — style(chat): apply warm premium messaging theme · lokalus

**Pakeitimai:** 4 files changed, 911 insertions(+), 38 deletions(-)

**Failai:**
- src/app/chat-preview/page.tsx
- src/app/globals.css
- src/app/tiekejas/zinutes/ProviderInboxClient.tsx
- src/components/messaging/ThreadChat.tsx

**Toliau:** Po refresh patikrinti `/tiekejas/zinutes` realų chat kontrastą, o `/chat-preview` naudoti tik kaip laikinas dizaino eksperimentų puslapis; jei nebereikės, pašalinti prieš production release.


## 2026-06-04 18:43 — Codex

**Commit:** `33fbcca` — feat(chat): add read receipts and history loading · lokalus

**Pakeitimai:** 7 files changed, 374 insertions(+), 55 deletions(-)

**Failai:**
- src/app/api/tiekejas/zinutes/[id]/route.ts
- src/app/api/zinutes/[token]/route.ts
- src/app/tiekejas/zinutes/ProviderInboxClient.tsx
- src/app/zinutes/[token]/TokenClient.tsx
- src/components/messaging/ThreadChat.tsx
- src/lib/thread-window.ts
- src/store/useConversationStore.ts

**Toliau:** Po deploy/dev restart patikrinti du langus: ar `Išsiųsta` virsta `Matyta` be refresh, ir ar `Įkelti ankstesnes` prideda istoriją viršuje išlaikydamas scroll poziciją.


## 2026-06-04 18:22 — Codex

**Commit:** `d94ab4b` — perf(chat): speed up provider messaging · lokalus

**Pakeitimai:** 18 files changed, 283 insertions(+), 209 deletions(-)

**Failai:**
- src/app/api/requests/[id]/messages/route.ts
- src/app/api/tiekejas/zinutes/[id]/messages/route.ts
- src/app/api/tiekejas/zinutes/[id]/route.ts
- src/app/api/tiekejas/zinutes/route.ts
- src/app/api/tracking/[token]/messages/route.ts
- src/app/api/zinutes/[token]/messages/route.ts
- src/app/api/zinutes/[token]/route.ts
- src/app/tiekejas/sections/AccountCard.tsx
- src/app/tiekejas/sections/FollowUpsCard.tsx
- src/app/tiekejas/sections/InboxUnreadBadge.tsx
- src/app/tiekejas/sections/StatsGrid.tsx
- src/app/tiekejas/zinutes/ProviderInboxClient.tsx

**Toliau:** Jei tęsiamas chat darbas, pirmiausia tikrinti naujus naršyklės instrumentation logus: ar Supabase broadcast/postgres_changes ateina be refresh, ar thread recent-window pakanka UX, ir ar dashboard `/tiekejas` cold DB spike'ai dar matomi.


## 2026-06-04 12:06 — Codex

**Commit:** `617c654` — perf(chat): optimize realtime inbox messaging · lokalus

**Pakeitimai:** 15 files changed, 728 insertions(+), 179 deletions(-)

**Failai:**
- prisma/manual-migrations/20260604_optimize_chat_inbox_indexes.sql
- prisma/schema.prisma
- src/app/api/notifications/route.ts
- src/app/api/realtime/read/route.ts
- src/app/api/realtime/token/route.ts
- src/app/api/tiekejas/zinutes/[id]/messages/route.ts
- src/app/api/tiekejas/zinutes/[id]/route.ts
- src/app/api/tiekejas/zinutes/route.ts
- src/app/api/zinutes/[token]/messages/route.ts
- src/app/api/zinutes/[token]/route.ts
- src/app/tiekejas/zinutes/ProviderInboxClient.tsx
- src/components/layout/MobileBottomNav.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-04 10:48 — Codex

**Commit:** `9f3e9e2` — feat(chat): unify realtime inbox experience · lokalus

**Pakeitimai:** 18 files changed, 418 insertions(+), 118 deletions(-)

**Failai:**
- docs/realtime-chat-plan.md
- src/app/api/paskyra/zinutes/route.ts
- src/app/api/requests/[id]/messages/route.ts
- src/app/api/tiekejas/follow-ups/route.ts
- src/app/api/tiekejas/zinutes/[id]/messages/route.ts
- src/app/api/tiekejas/zinutes/route.ts
- src/app/api/zinutes/[token]/messages/route.ts
- src/app/meistrai/[slug]/components/DirectInquiryWidget.tsx
- src/app/paskyra/zinutes/SentInquiriesView.tsx
- src/app/tiekejas/sections/FollowUpsCard.tsx
- src/app/tiekejas/zinutes/ProviderInboxClient.tsx
- src/app/tiekejas/zinutes/[id]/page.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-04 05:54 — Codex

**Commit:** `374bd2b` — polish(ui): enhance provider inbox controls · lokalus

**Pakeitimai:** 7 files changed, 422 insertions(+), 96 deletions(-)

**Failai:**
- src/app/api/tiekejas/zinutes/[id]/route.ts
- src/app/api/tiekejas/zinutes/route.ts
- src/app/globals.css
- src/app/tiekejas/zinutes/ConversationList.tsx
- src/app/tiekejas/zinutes/ProviderInboxClient.tsx
- src/app/tiekejas/zinutes/[id]/ThreadView.tsx
- src/components/messaging/ThreadChat.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-04 05:26 — Codex

**Commit:** `28ce14a` — polish(ui): refine provider chat dashboard · lokalus

**Pakeitimai:** 17 files changed, 626 insertions(+), 294 deletions(-)

**Failai:**
- src/app/globals.css
- src/app/paskyra/zinutes/SentInquiriesView.tsx
- src/app/tiekejas/ProviderFollowUpsCard.tsx
- src/app/tiekejas/page.tsx
- src/app/tiekejas/sections/ProfileCompletenessCard.tsx
- src/app/tiekejas/sections/QuickLinksGrid.tsx
- src/app/tiekejas/sections/StatsGrid.tsx
- src/app/tiekejas/zinutes/ConversationList.tsx
- src/app/tiekejas/zinutes/ProviderInboxClient.tsx
- src/components/layout/MobileBottomNav.tsx
- src/components/messaging/RequestBriefDrawer.tsx
- src/components/messaging/ThreadChat.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-04 03:33 — Codex

**Commit:** `8d66bc0` — polish(ui): refine marketplace chat and profile surfaces · lokalus

**Pakeitimai:** 15 files changed, 572 insertions(+), 47 deletions(-)

**Failai:**
- design-system.md
- src/app/admin/uzklausos/page.tsx
- src/app/globals.css
- src/app/layout.tsx
- src/app/meistrai/[slug]/components/ProfileShareButton.tsx
- src/app/meistrai/[slug]/page.tsx
- src/app/page.tsx
- src/app/tiekejas/uzklausos/[id]/sections/RequestHeader.tsx
- src/app/tiekejas/uzklausos/sections/RequestCard.tsx
- src/app/uzklausos/page.tsx
- src/components/layout/Footer.tsx
- src/components/ui/EmptyState.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-06-01 04:46 — Claude

**Commit:** `8195e81` — feat(seo): add /straipsniai/stogo-darbai roofing guide article · lokalus

**Pakeitimai:** 3 files changed, 362 insertions(+), 1 deletion(-)

**Failai:**
- src/app/sitemap.ts
- src/app/straipsniai/stogo-darbai/page.tsx
- src/lib/seo/page-seo.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-31 03:27 — Claude

**Commit:** `42d3a3e` — feat(seo): connect Google Search Console + GA4 · lokalus

**Pakeitimai:** 5 files changed, 76 insertions(+), 1 deletion(-)

**Failai:**
- .env.example
- next.config.mjs
- public/google99200452eec2882c.html
- src/app/layout.tsx
- src/components/analytics/GoogleAnalytics.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-30 23:58 — Claude

**Commit:** `54b6951` — perf(seo): slim category tree in RSC payload (fix Large HTML on /uzklausos) · lokalus

**Pakeitimai:** 1 file changed, 12 insertions(+), 8 deletions(-)

**Failai:**
- src/lib/service-categories.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-30 19:50 — Claude

**Commit:** `9e65608` — fix(seo): noindex utility/seed pages, fix Review schema, shorten titles · lokalus

**Pakeitimai:** 10 files changed, 110 insertions(+), 6 deletions(-)

**Failai:**
- AGENT_LOG.md
- src/app/(auth)/layout.tsx
- src/app/(auth)/prisijungti/layout.tsx
- src/app/(auth)/registruotis/layout.tsx
- src/app/meistrai/[slug]/page.tsx
- src/app/paslaugos/elektrikas-kaune/page.tsx
- src/app/paslaugos/santechnikas-kaune/page.tsx
- src/app/sitemap.ts
- src/app/uzklausos/nauja/layout.tsx
- src/lib/seo/page-seo.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-30 19:23 — Claude

**Commit:** `b4fdc20` — fix(seo): noindex utility/seed pages, fix Review schema, shorten titles · lokalus

**Pakeitimai:** 9 files changed, 90 insertions(+), 6 deletions(-)

**Failai:**
- src/app/(auth)/layout.tsx
- src/app/(auth)/prisijungti/layout.tsx
- src/app/(auth)/registruotis/layout.tsx
- src/app/meistrai/[slug]/page.tsx
- src/app/paslaugos/elektrikas-kaune/page.tsx
- src/app/paslaugos/santechnikas-kaune/page.tsx
- src/app/sitemap.ts
- src/app/uzklausos/nauja/layout.tsx
- src/lib/seo/page-seo.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-30 07:15 — Claude

**Commit:** `5bacfc9` — feat(seo): "Elektrikas Kaune" lead-gen landing page

**Pakeitimai:** 5 files changed, 471 insertions(+), 1 deletion(-)

**Failai:**
- scripts/_register-paths.js
- scripts/generate-landing-images.ts
- src/app/paslaugos/elektrikas-kaune/page.tsx
- src/app/sitemap.ts
- src/lib/seo/page-seo.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-30 06:22 — Claude

**Commit:** `efba5c7` — feat(seo): drop invalid LocalBusiness schema + add SEO gate script · lokalus

**Pakeitimai:** 5 files changed, 210 insertions(+), 10 deletions(-)

**Failai:**
- NOTES.md
- package.json
- scripts/seo-check.ts
- src/app/meistrai/[slug]/page.tsx
- src/app/page.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-30 06:15 — Claude

**Commit:** `f71f4dd` — feat(seo): dynamic category content unlocks indexing gate · lokalus

**Pakeitimai:** 6 files changed, 339 insertions(+), 79 deletions(-)

**Failai:**
- NOTES.md
- src/app/meistrai/page.tsx
- src/app/sitemap.ts
- src/lib/seo/category-content.ts
- src/lib/seo/category-view.ts
- src/lib/seo/index-gate.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-30 06:06 — Claude

**Commit:** `d6ab41b` — feat(seo): central buildPageSeo contract + index gate · lokalus

**Pakeitimai:** 7 files changed, 527 insertions(+), 88 deletions(-)

**Failai:**
- NOTES.md
- src/app/meistrai/[slug]/page.tsx
- src/app/meistrai/page.tsx
- src/app/sitemap.ts
- src/app/uzklausos/page.tsx
- src/lib/seo/index-gate.ts
- src/lib/seo/page-seo.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-30 05:23 — Claude

**Commit:** `d2280f5` — fix(admin): guard telegramBotEnabled reads against missing column

**Pakeitimai:** 2 files changed, 27 insertions(+), 12 deletions(-)

**Failai:**
- src/app/api/admin/telegram/route.ts
- src/app/api/telegram/webhook/route.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-30 05:22 — Claude

**Commit:** `5ce2f2c` — feat(admin): Telegram control actions — kill switch, webhook, sessions

**Pakeitimai:** 6 files changed, 458 insertions(+), 138 deletions(-)

**Failai:**
- NOTES.md
- prisma/manual-migrations/add-telegram-bot-enabled.sql
- src/app/admin/telegram/page.tsx
- src/app/api/admin/telegram/route.ts
- src/app/api/telegram/webhook/route.ts
- src/lib/telegram/api.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-30 05:13 — Claude

**Commit:** `d93ebf6` — feat(admin): Telegram overview page — config, webhook, sessions, listings

**Pakeitimai:** 5 files changed, 597 insertions(+), 1 deletion(-)

**Failai:**
- NOTES.md
- src/app/admin/layout.tsx
- src/app/admin/telegram/page.tsx
- src/app/api/admin/telegram/route.ts
- src/lib/telegram/api.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-30 05:00 — Claude

**Commit:** `c5936f0` — docs(seo): add SEO architecture plan for generated pages

**Pakeitimai:** 1 file changed, 65 insertions(+)

**Failai:**
- NOTES.md

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-30 03:57 — Claude

**Commit:** `ee02e5a` — style(messaging): tune own-message bubble color and bystander text contrast · lokalus

**Pakeitimai:** 1 file changed, 2 insertions(+), 2 deletions(-)

**Failai:**
- src/components/messaging/ThreadChat.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-29 23:23 — Claude

**Commit:** `5d2c33f` — feat(ai): per-touchpoint cost + token visibility in /admin/ai

**Pakeitimai:** 12 files changed, 81 insertions(+), 8 deletions(-)

**Failai:**
- NOTES.md
- src/app/admin/ai/page.tsx
- src/lib/admin/ai-usage.ts
- src/lib/ai-improve.ts
- src/lib/ai-proposal.ts
- src/lib/ai-transcribe.ts
- src/lib/ai/lead-copilot.ts
- src/lib/ai/openrouter.ts
- src/lib/category-picker-ai.ts
- src/lib/category-suggestions.ts
- src/lib/image-processor.ts
- src/lib/moderation/index.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-29 23:09 — Claude

**Commit:** `7153210` — feat(ai): shared OpenRouter client + log the real model/usage per touchpoint

**Pakeitimai:** 18 files changed, 997 insertions(+), 742 deletions(-)

**Failai:**
- NOTES.md
- src/app/api/category-suggestions/route.ts
- src/app/api/profile/ai-generate/route.ts
- src/app/api/requests/improve/route.ts
- src/app/api/requests/transcribe/route.ts
- src/app/api/tiekejas/uzklausos/[id]/juodrastis/route.ts
- src/lib/ai-improve.ts
- src/lib/ai-proposal.ts
- src/lib/ai-transcribe.ts
- src/lib/ai/lead-copilot.ts
- src/lib/ai/openrouter.ts
- src/lib/ai/prompt-config.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-29 22:28 — Claude

**Commit:** `97a4b64` — feat(stories): view tracking, reactions, contact CTA, seen-state

**Pakeitimai:** 17 files changed, 1015 insertions(+), 138 deletions(-)

**Failai:**
- NOTES.md
- prisma/schema.prisma
- src/app/api/provider/stories/[id]/viewers/route.ts
- src/app/api/stories/[id]/reaction/route.ts
- src/app/api/stories/[id]/view/route.ts
- src/app/api/stories/feed/route.ts
- src/app/api/stories/seen-state/route.ts
- src/app/globals.css
- src/app/meistrai/[slug]/components/StoryAvatarButton.tsx
- src/app/meistrai/[slug]/components/StoryViewer.tsx
- src/app/tiekejas/StoryModal.tsx
- src/components/stories/GlobalStoriesStrip.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-29 18:30 — Claude

**Commit:** `9f21448` — feat(ai): central prompt/model registry + admin AI control panel · lokalus

**Pakeitimai:** 17 files changed, 2044 insertions(+), 328 deletions(-)

**Failai:**
- prisma/schema.prisma
- src/app/admin/ai/page.tsx
- src/app/admin/layout.tsx
- src/app/api/admin/ai-config/route.ts
- src/app/api/admin/ai-registry/route.ts
- src/app/api/profile/ai-generate/route.ts
- src/lib/admin/ai-usage.ts
- src/lib/ai-improve.ts
- src/lib/ai-proposal.ts
- src/lib/ai-transcribe.ts
- src/lib/ai/lead-copilot.ts
- src/lib/ai/prompt-config.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-29 03:22 — Claude

**Commit:** `8797468` — feat(telegram): attach photos to requests via the bot · lokalus

**Pakeitimai:** 5 files changed, 173 insertions(+), 3 deletions(-)

**Failai:**
- src/lib/telegram/__tests__/conversation.test.ts
- src/lib/telegram/bot.ts
- src/lib/telegram/conversation.ts
- src/lib/telegram/format.ts
- src/lib/telegram/types.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-29 02:32 — Claude

**Commit:** `812c871` — fix(telegram): prepend + to shared-contact phone so non-LT numbers normalize · lokalus

**Pakeitimai:** 2 files changed, 36 insertions(+), 3 deletions(-)

**Failai:**
- src/lib/telegram/__tests__/conversation.test.ts
- src/lib/telegram/conversation.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-29 02:26 — Claude

**Commit:** `a0559c6` — fix(telegram): re-prompt for contact button instead of treating typed text as a new request · lokalus

**Pakeitimai:** 3 files changed, 30 insertions(+)

**Failai:**
- src/lib/telegram/__tests__/conversation.test.ts
- src/lib/telegram/conversation.ts
- src/lib/telegram/format.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-29 02:21 — Claude

**Commit:** `cd39276` — feat(categories): precise AI picking + paid timed category unlock · lokalus

**Pakeitimai:** 24 files changed, 967 insertions(+), 103 deletions(-)

**Failai:**
- NOTES.md
- prisma/manual-migrations/20260529_strip_root_categories_from_providers.sql
- prisma/schema.prisma
- src/app/api/profile/ai-generate/route.ts
- src/app/api/tiekejas/profilis/categories/route.ts
- src/app/api/tiekejas/profilis/categories/unlock/route.ts
- src/app/api/tiekejas/profilis/route.ts
- src/app/api/tiekejas/uzklausos/[id]/copilot/route.ts
- src/app/api/tiekejas/uzklausos/[id]/unlock/route.ts
- src/app/api/tiekejas/uzklausos/route.ts
- src/app/kontaktai/AIProfileSetup.tsx
- src/app/meistrai/[slug]/components/SimilarProvidersSection.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-29 01:53 — Claude

**Commit:** `252c239` — feat(telegram): conversation bot for voice/text request posting · lokalus

**Pakeitimai:** 7 files changed, 818 insertions(+), 12 deletions(-)

**Failai:**
- package.json
- src/app/api/telegram/webhook/route.ts
- src/lib/ai-transcribe.ts
- src/lib/telegram/__tests__/conversation.test.ts
- src/lib/telegram/bot.ts
- src/lib/telegram/conversation.ts
- src/lib/telegram/format.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-29 01:28 — Claude

**Commit:** `14903aa` — feat(requests): extract createServiceRequest core + phone identity helper · lokalus

**Pakeitimai:** 4 files changed, 401 insertions(+), 207 deletions(-)

**Failai:**
- prisma/schema.prisma
- src/app/api/requests/route.ts
- src/lib/service-requests/create.ts
- src/lib/service-requests/link-user.ts

**Toliau:** Bot foundation ready — bot agents can wire against these contracts:

- `createServiceRequest(input): Promise<CreateServiceRequestResult>` in
  `src/lib/service-requests/create.ts`. For Telegram pass `source: "telegram"`,
  `contactPreVerified: true` (skips email/phone verification-record lookups;
  moderation + category validation still run), and the linked `clientId`.
  Returns `{ ok:true, trackingToken, moderationStatus }` or
  `{ ok:false, code, message }` with code in VALIDATION | CONTACT_UNVERIFIED |
  CATEGORY_INVALID | MODERATION_REJECTED | RATE_LIMITED | ERROR. `message` is
  user-safe Lithuanian.
- `findOrCreateUserByPhone(phone, name?)` in
  `src/lib/service-requests/link-user.ts` — the ONLY path that writes User rows
  for the bot. New accounts are CLIENT + phoneVerifiedAt set. Returns
  `{ userId, email }`; `email` is `null` when the account carries the
  non-deliverable placeholder (`User.email` is NOT NULL + unique, so phone-only
  accounts get `tg-<digits>@telegram.paslaugurinka.lt`). `createServiceRequest`
  auto-skips the confirmation email for placeholder addresses.
- New `TelegramSession` model (`telegram_sessions`) added to schema for bot
  conversation state. Prisma client regenerated. NOT pushed to DB — human must
  run `npm run db:push` after review before the bot can read/write sessions.

Note: `npm run build` is currently red ONLY due to in-flight telegram WIP
(`src/app/api/telegram/webhook/route.ts`: missing `@/lib/telegram/bot`, and an
`export const runtime = "nodejs"` that conflicts with `cacheComponents`).
My four files type-check clean in isolation (`tsc --noEmit` reports errors
only in that webhook route).


## 2026-05-29 01:24 — Claude

**Commit:** `5404ace` — feat(telegram): transport layer + webhook endpoint for request bot · lokalus

**Pakeitimai:** 6 files changed, 296 insertions(+), 1 deletion(-)

**Failai:**
- .env.example
- package.json
- scripts/telegram-set-webhook.ts
- src/app/api/telegram/webhook/route.ts
- src/lib/telegram/api.ts
- src/lib/telegram/types.ts

**Toliau:** Transport sluoksnis paruoštas pokalbio agentui. Webhook
`src/app/api/telegram/webhook/route.ts` importuoja `handleUpdate(update)` iš
`@/lib/telegram/bot` — tą modulį kuria pokalbio agentas (jis dar neegzistuoja,
todėl `tsc`/`build` mes vieną laukiamą TS2307 klaidą iki merge).

API kontraktas, prieš kurį galima koduoti (`@/lib/telegram/api`):
- `sendMessage(chatId: number, text: string, opts?: SendMessageOptions): Promise<void>`
  - `SendMessageOptions = { inlineKeyboard?: InlineButton[][]; requestContact?: { buttonText: string }; parseMode?: "HTML" | "MarkdownV2" }`
  - `InlineButton = { text: string; callback_data: string }`
  - inlineKeyboard ir requestContact yra vienas-arba-kitas (inline turi pirmenybę).
- `answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void>`
- `getFileLink(fileId: string): Promise<string>` — pilnas atsisiuntimo URL.
- `downloadFile(fileId: string): Promise<Buffer>` — voice → transkripcija.
- Klaidos metamos kaip `TelegramApiError` (eksportuota). Token iš `TELEGRAM_BOT_TOKEN`.

Tipai (`@/lib/telegram/types`): `TgUpdate { update_id; message?; callback_query? }`,
`TgMessage { message_id; from?; chat; text?; voice?; contact? }`, `TgUser { id; first_name?; username? }`,
`TgChat { id }`, `TgVoice { file_id; duration; mime_type?; file_size? }`,
`TgContact { phone_number; user_id?; first_name? }`, `TgCallbackQuery { id; from; data?; message? }`.

Env: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` (jau .env.example).
Webhook registracija: `pnpm telegram:set-webhook [baseUrl]` — paleidžia žmogus.


## 2026-05-29 00:14 — Claude

**Commit:** `1d2c290` — fix(categories): scrollable dropdown + unified provider profile picker · lokalus

**Pakeitimai:** 3 files changed, 44 insertions(+), 177 deletions(-)

**Failai:**
- src/app/tiekejas/profilis/components/CategoryChecklist.tsx
- src/app/tiekejas/profilis/page.tsx
- src/components/categories/GroupedCategoryPicker.tsx

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-28 22:49 — Claude

**Commit:** `7e9ec6f` — feat(provider): harden SMS rate-limit + clearer empty leads state · lokalus

**Pakeitimai:** 3 files changed, 51 insertions(+), 4 deletions(-)

**Failai:**
- src/app/api/requests/send-phone-code/route.ts
- src/app/tiekejas/uzklausos/sections/RequestsList.tsx
- src/lib/rate-limit.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-28 22:29 — Claude

**Commit:** `0111921` — fix(audit): P1/P2 polish from production-readiness audit · lokalus

**Pakeitimai:** 8 files changed, 109 insertions(+), 23 deletions(-)

**Failai:**
- src/app/meistrai/[slug]/components/DirectInquiryWidget.tsx
- src/app/meistrai/[slug]/components/SectionErrorBoundary.tsx
- src/app/meistrai/[slug]/page.tsx
- src/components/tiekejai/ProvidersExperience.tsx
- src/components/ui/EmptyState.tsx
- src/components/uzklausos-v2/AiSuggestionsStrip.tsx
- src/components/uzklausos-v2/InlineListingCard.tsx
- src/lib/auth.ts

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-28 18:36 — Claude

**Commit:** `87cb73a` — docs(notes): defer taxonomy category-filter consolidation (not urgent) · lokalus

**Pakeitimai:** 1 file changed, 27 insertions(+)

**Failai:**
- NOTES.md

**Toliau:** _(papildyk ranka kai aišku)_


## 2026-05-28 15:56 — Claude

**Šaka:** `suspense/provider-secondary` (PR3, push'inta, **NEmergint'a**) — 4 commit'ai:
- `26b2928` fix(auth): SessionGate naudojamas kaip JSX komponentas
- `036c65e` perf(tiekejas/atsakymai)
- `17d2c6f` perf(tiekejas/zinutes/[id])
- `c51ab75` perf(tiekejas/zinutes)

**Pakeitimai:** PR3 (SUSPENSE_PLAN.md §Page 7/5/4) — trys provider'io antriniai
puslapiai konvertuoti iš „client fetch useEffect'e" į „plonas server shell +
SessionGate + streamin'amos server sekcijos". Visi trys dabar `◐ Partial
Prerender` (statinis šeletas iškart, dinamika per Suspense). `pnpm build`
praeina (švarus worktree, sharp deklaruotas). Kiekvienas puslapis = vienas
fetch'as → vienas data Suspense.

**Nauji failai:**
- `src/app/tiekejas/atsakymai/ResponsesList.tsx` (async server) + `ResponsesListSkeleton`
- `src/app/tiekejas/zinutes/[id]/ThreadView.tsx` (async server) + `ArchiveButton.tsx` & `InquiryThreadChat.tsx` (client leaves) + `ThreadViewSkeleton`
- `src/app/tiekejas/zinutes/ConversationList.tsx` (async server) + `InboxFilterShell.tsx` (client, ?tab=) + `ConversationListSkeleton`
- 3 skeletonai re-export'inti per `src/components/ui/skeletons/index.ts`
- ištrinti: `AtsakymaiClient.tsx`, `IdClient.tsx`; `/tiekejas/zinutes/page.tsx` iš „use client" → server shell.

**Toliau:**
- **SessionGate latent bug pataisytas (`26b2928`).** Merge'intas SessionGate
  grąžino `children(userId)` kaip `ReactNode` (su `bigint`) → async komponentas
  negaliojo kaip JSX (`AwaitedReactNode`). Kompiliavosi PR1'e tik todėl, kad
  niekas dar nerenderino `<SessionGate/>`. Fix = Fragment wrap. **PR4-7 tą fix'ą
  paveldi po PR3 merge**; jei jie šakoti nuo seno main, jiems reikės to paties
  vieno-eilutės fix'o (trivialus konfliktas).
- **QA prieš merge (Vercel preview, realus PROVIDER account'as).** Lokaliai
  netestuota su login'u (vengiau live DB / nėra test account'o — kaip PR1).
  Patikrinti: skeleton→content streaming (throttle slow-3g); logged-out →
  `/prisijungti` (proxy); non-PROVIDER → `/tapti-tiekeju` (SessionGate);
  atsakymų tab'ai `?status=`; inbox tab'ai `?tab=`; thread žinučių siuntimas +
  archyvavimas (archyvas dabar daro `router.refresh()`, ne lokalų optimistic).
- Žr. `NOTES.md` PR3 įrašus dėl 2 sąmoningų sprendimų (active-provider gate
  sušvelnintas; inbox unread count nuimtas) + 1 orphaned route.

## 2026-05-28 15:57 — Claude

**Commit:** `1de8ba6` (+ `4947706`, `19b656f`, `a170176`) — PR4
`suspense/user-cluster` · lokalus (**NEsumerge'inta**, push'inta kaip branch)

**Pakeitimai:** 4 commit'ai, 8 failai

**Failai:**
- src/components/auth/SessionGate.tsx (fix)
- src/components/ui/skeletons/InquiriesListSkeleton.tsx (new)
- src/components/ui/skeletons/MyRequestsListSkeleton.tsx (new)
- src/components/ui/skeletons/index.ts (barrel)
- src/app/paskyra/zinutes/page.tsx + SentInquiriesView.tsx
- src/app/paskyra/uzklausos/page.tsx + MyRequestsList.tsx (new)

**Esmė:** PR4 (SUSPENSE_PLAN §Page 9 + §Page 10). Du user-side puslapiai iš
client-fetch paversti į server-streamed sekcijas:
- `/paskyra/zinutes`: `SentInquiriesView` `"use client"` → async server
  komponentas, fetch'ina inline (tie patys 2 query: approved inquiries +
  unread NEW_MESSAGE notifications). Page-local `SessionGate` IŠLAIKO abu
  redirect'us, įsk. cross-role PROVIDER → `/tiekejas/zinutes` (generinis gate
  to neišreiškia). Fallback `null` → `InquiriesListSkeleton`. Tab'ai →
  `<Link href="?tab=...">`, awaitinami sekcijoje (ne shell'e, kad liktų static).
- `/paskyra/uzklausos`: Pattern C → server shell. Generinis `SessionGate`
  auth-only (be `requireRole` — abu USER ir PROVIDER mato, skiriasi tik title);
  role nuskaitomas header'iui (title + provider toggle) per pigų JWT decode.
  `MyRequestsList` ištrauktas (async server, query inline). Status tab'ai →
  `<Link href="?status=...">`. Default tab `OPEN` (kaip anksčiau).
- Nauji skeleton'ai `InquiriesListSkeleton` + `MyRequestsListSkeleton`
  (su `withHeader` outer gate fallback'ui), re-export'inti iš barrel'io.

**SVARBU (cross-agent):** `SessionGate.tsx` pataisytas (`a170176`) —
`children(userId)` apgaubtas fragmentu. Async komponentas grąžinantis bare
`ReactNode` nėra validus JSX element type (React 19 `ReactNode` turi `bigint`,
kurio `AwaitedReactNode` neturi). PR1 sukūrė `SessionGate` bet niekada
nerenderino, todėl klaida išlindo tik dabar (PR4 = pirmas vartotojas).
**PR3 (`suspense/provider-secondary`) ir kiti, kurie renderins generinį
`SessionGate`, turi turėti šitą fix'ą** — jei rebase'ins ant šio PR, gaus
nemokamai; kitaip turės pakartoti. Galimas trivialus konfliktas tame faile.

**Verifikacija:** `pnpm build` praeina; abu route'ai dabar `◐ Partial
Prerender` (statinis šeletas + streamina gate/data). Logged-out smoke test
(lokalus dev :3939): `/paskyra/uzklausos` ir `/paskyra/zinutes` → 307
(proxy → `/api/auth/signin` → `/prisijungti`, `pages.signIn` sukonfigūruota),
jokio 500. **Logged-in streaming (skeleton→turinys ant throttle), USER vs
PROVIDER title, PROVIDER → /tiekejas/zinutes redirect, `?tab`/`?status`
navigacija — NETESTUOTI lokaliai** (nėra test account'o, live DB su realiais
duomenimis — vengiau, kaip ir PR1).

**Toliau:** prieš merge — Vercel preview QA su realiu USER + PROVIDER account'u
(SUSPENSE_PLAN §Merge strategy + DoD): multi-stage streaming ant slow-3g,
abiejų rolių title, cross-role redirect, filtrų tab navigacija. **NEMERGE'INTI**
kol nepatikrinta preview'e. Realtime (presence/unread) lieka static-after-load
— žr. NOTES follow-up.

## 2026-05-28 15:59 — Claude

**Commit:** `d1bde0f` — perf(uzklausos/sekti): stream request tracker via granular Suspense · lokalus

**Pakeitimai:** 11 files changed, 949 insertions(+), 632 deletions(-)

**Failai:**
- src/app/uzklausos/sekti/[id]/ProposalsClient.tsx
- src/app/uzklausos/sekti/[id]/TrackRequestClient.tsx
- src/app/uzklausos/sekti/[id]/ViewerBanner.tsx
- src/app/uzklausos/sekti/[id]/data.ts
- src/app/uzklausos/sekti/[id]/loading.tsx
- src/app/uzklausos/sekti/[id]/not-found.tsx
- src/app/uzklausos/sekti/[id]/page.tsx
- src/app/uzklausos/sekti/[id]/sections/ProposalsSection.tsx
- src/app/uzklausos/sekti/[id]/sections/RequestBody.tsx
- src/app/uzklausos/sekti/[id]/sections/RequestHeader.tsx
- src/app/uzklausos/sekti/[id]/skeletons.tsx

**Toliau:** PR5 (SUSPENSE_PLAN.md §Page 11) baigtas ant `suspense/tracker-page`
(push'inta, **NEMERGE'INTA**). `/uzklausos/sekti/[id]` Pattern A → PPR: statinis
shell + 3 Suspense boundaries — `RequestHeader` (badge/title/meta/alerts/timeline/
view-count/banneriai, paišo pirmas), `RequestBody` (aprašymas + `ViewerBanner`),
`ProposalsSection` (lėtas responses+messages query, streamina paskutinis →
`ProposalsClient`). `ViewerBanner` client island su session loading-gate (nerodo
"sukurti paskyrą" CTA flash'o login'usiems). `ThreadChat` lieka realtime client
leaf — serveris pre-fetchina initialMessages, klientas subscribe'ina (Suspense
nevaldo subscription'o). `data.ts` centralizuoja serverio reads (cached light
summary header+body; heavy proposals su `after()` read-receipt). Mutacijos
(accept/close/delete/review/claim) → `router.refresh()`. `pnpm build` praeina
(route ◐ Partial Prerender), `tsc --noEmit` švarus. Lokalus QA (3 realūs token'ai,
anon): header/body/proposals/ThreadChat OK; ViewerBanner matrica OK (claimed→tik
bookmark; unclaimed→create-account; IN_PROGRESS→accepted card + ReviewForm); jokių
console/hydration error'ų. **Netestuota live:** login'usio owner'io claim CTA +
dviejų sesijų realtime žinučių apsikeitimas (vengiau mutuoti live DB / nėra test
account'o) — kodo keliai nepakeisti, tik data-fetch perkeltas į serverį. **Prieš
merge:** Vercel preview QA su realiu USER/PROVIDER account'u (streaming order +
two-session realtime). `/api/requests/[id]` paliktas (žr. NOTES follow-up).

## 2026-05-28 16:10 — Claude

**Commit:** `18eeada` — refactor(tiekejas/uzklausos): stream request detail via Suspense sections · NESUMERGINTA (branch `suspense/provider-request-detail`)
**Commit:** `7908e38` — fix(auth): make SessionGate usable as a JSX element · NESUMERGINTA (tas pats branch)

**Pakeitimai:** PR6 (SUSPENSE_PLAN §Page 3). 9 failai, ~+708 / −505.

**Failai (esmė):**
- `src/app/tiekejas/uzklausos/[id]/page.tsx` — perrašytas: statinis container + back-link (`<Link>`) VIRŠ gate'o; `<Suspense fallback={null}><SessionGate requireRole="PROVIDER">` apgaubia 3 sekcijas, kiekviena savo `<Suspense>`. Route dabar `◐ Partial Prerender`.
- `.../sections/RequestHeader.tsx` (naujas, async server) — kategorijos/statusas/title/meta pills. Be provider guard'o (metadata nejautri — ta pati matoma užklausų sąraše).
- `.../sections/RequestBody.tsx` (naujas, async server) — aprašymas + `RequestPhotos` + kliento info; `isLeadUnlocked()` gate'ina email/telefoną; `requestView.upsert` view-tracking (best-effort).
- `.../sections/ResponseSection.tsx` (naujas, async server) — eligibility + copilot + unlock + forma + banner'iai (accepted/jau-atsakyta/uždaryta) + atsakymų kortelės + thread; `response.updateMany providerLastReadAt` read-status (best-effort).
- `.../ResponseForm.tsx` (naujas, `"use client"`) — formos state + `GenerateProposalButton` + POST submit → `router.refresh()`.
- `.../ResponseThread.tsx` (naujas, `"use client"`) — apgaubia `ThreadChat`, viduje `sendMessage` fetch; server pre-fetch'ina initial messages, klientas subscribe'ina realtime.
- `.../UnlockCard.tsx` — neserializuojamas `onUnlocked` callback'as pakeistas vidiniu `useRouter().refresh()` (tėvas dabar server komponentas).
- `.../RequestDetailClient.tsx` — IŠTRINTAS (443 eil., Pattern A).
- `src/components/auth/SessionGate.tsx` — fix (atskiras commit, žr. žemiau).

**Toliau:**
- **NESUMERGINTA.** Branch push'intas. Prieš merge — Vercel preview QA su realiu PROVIDER account'u: header→body→response streaming tvarka; copilot / unlock / AI-generate / submit / thread chat + realtime; non-PROVIDER redirect. Lokaliai naršyklėje NETESTUOTA (reikia auth sesijos + realios užklausos; vengiau live DB). `pnpm build` + `tsc` + `eslint` praeina.
- `/api/tiekejas/uzklausos/[id]` GET puslapio nebenaudojamas (POST vis dar — `ResponseForm` submit). Route paliktas (žr. NOTES follow-up).

**Pastabos kitam agentui:**
- **SessionGate fix paliečia VISUS PR3-7.** `src/components/auth/SessionGate.tsx` iki šiol nebuvo realiai naudotas kaip `<SessionGate>{...}</SessionGate>` — pirmas panaudojimas atskleidė TS2786 (async komponentas grąžino `ReactNode`, kuris po @types/react atnaujinimo apima `bigint` → nevalidus JSX element type). Sutvarkyta apgaubiant grąžinamą reikšmę fragmentu: `return <>{children(...)}</>` (commit `7908e38`). Jei tavo PR'e jau pridėjai savą fix'ą — tikėkis trivial conflict'o (1 eilutė).
- 3 sekcijos skaito tą pačią `serviceRequest.findUnique({id})` — **intentional dup** streaming'ui (SUSPENSE_PLAN §Page 3: pool'as parallel read'us tvarko pigiai, viena lėta query neblokuoja kitų). Jei profiling parodys kainą — hoist'inti į `<RequestGate>`, NE dabar.
- Naujas worktree neturi `.env`/`.env.local` (gitignored, neperkeliami) — nukopijavau iš pagrindinio repo, kad `pnpm build` praeitų (read-only prerender query'ai). Jei statai kitą worktree — padaryk tą patį.

## 2026-05-28 16:25 — Claude

**Commit:** `172c5e7` — perf(tiekejas): stream provider dashboard via server sections · push'inta
(+ `e4aa5e5` — perf(tiekejas): add provider dashboard section skeletons)

**Pakeitimai:** 14 files changed, 1275 insertions(+), 1116 deletions(-) (+ 4 skeletonai e4aa5e5)

**Failai:**
- src/app/api/tiekejas/stats/route.ts
- src/app/tiekejas/AccountStoryAvatar.tsx
- src/app/tiekejas/ProviderDashboardClient.tsx
- src/app/tiekejas/ProviderFollowUpsCard.tsx
- src/app/tiekejas/ResendVerificationBanner.tsx
- src/app/tiekejas/StoryModal.tsx
- src/app/tiekejas/page.tsx
- src/app/tiekejas/sections/AccountCard.tsx
- src/app/tiekejas/sections/FollowUpsCard.tsx
- src/app/tiekejas/sections/InboxUnreadBadge.tsx
- src/app/tiekejas/sections/ProfileCompletenessCard.tsx
- src/app/tiekejas/sections/QuickLinksGrid.tsx
- src/app/tiekejas/sections/StatsGrid.tsx + InboxUnreadBadge.tsx
- src/app/tiekejas/{StoryModal,AccountStoryAvatar,ResendVerificationBanner}.tsx (client leaves)
- src/lib/provider-completeness.ts (NEW shared helper)
- (del) ProviderDashboardClient.tsx (878 eil.) + api/tiekejas/stats/route.ts

**Toliau:** **PR7 BAIGTAS** — abu puslapiai (list + root dashboard) ant
`suspense/provider-dashboard`, push'inta, NEMERGE'inta. Task B (root, §Page 1):
878-eil. klientas → statinis header (h1) virš gate + 5 sekcijos kiekviena savam
`<Suspense>`. **C4 laikytasi — JOKIŲ naujų sekcijų:** "recent matching requests"
ir "recent reviews" NEDARYTI (šiandien dashboard rodo tik count'us). nextAction
CTA įdėtas į `StatsGrid` (jam reikia matchingRequests → `expandToMatchSet`
sumokamas VIENĄ kartą). acceptedCount header subtitle nuimtas (h1-only static
header per §C sketch; acceptedCount lieka "Priimti" tile'e). `/api/tiekejas/stats`
ištrintas (grep — vienintelis vartotojas buvo ištrintas klientas).
**SĄMONINGAS pakeitimas:** quick-links nebešviesina disabled būsenos
unverified/suspended tiekėjams (sync grid negali skaityti canAccess be fetch'o).
Mitiguota — destination puslapiai gate'ina + AccountCard rodo banner'ius;
jei reviewer'is nori atgal — daryti QuickLinksGrid async + savo Suspense (žr.
NOTES.md). **NETESTUOTA su realiu PROVIDER account'u** (nėra test acc; dev server
→ live DB; `FollowUpsCard`/`InboxUnreadBadge` daro reads, `recordFollowUpScan`
WRITE per render). Vercel preview QA reikalinga: multi-stage streaming
(account→stats→completeness→follow-ups, NE vienas spinner→viskas), story modal,
quick-links + unread badge, non-PROVIDER redirect, no-profile CTA. Build praeina,
`◐ /tiekejas`. Unauthenticated→/prisijungti patikrinta lokaliai. Žr. NOTES.md
PR7 follow-up'us (recordFollowUpScan/recordAiRun-in-render, canAccess per-section
dubliavimas, quick-links disabling).


## 2026-05-28 15:58 — Claude

**Commit:** `176c8fd` — perf(tiekejas/uzklausos): stream request list via server sections · push'inta
(+ prereq `c712a8e` — fix(auth): make SessionGate renderable as a JSX component)

**Pakeitimai:** 9 files changed, 1017 insertions(+), 615 deletions(-) (+ SessionGate.tsx)

**Failai:**
- src/app/tiekejas/uzklausos/page.tsx (thin shell: Suspense → SessionGate requireRole=PROVIDER)
- src/app/tiekejas/uzklausos/RequestsFilterShell.tsx (NEW, "use client" — search/sort/filter URL state; credit badge + list as slots)
- src/app/tiekejas/uzklausos/sections/RequestsList.tsx (NEW, async server — query+scoring+getUnlockedRequestIds, await searchParams inside)
- src/app/tiekejas/uzklausos/sections/CreditBadge.tsx (NEW, async server)
- src/app/tiekejas/uzklausos/sections/RequestCard.tsx (NEW, server)
- src/components/ui/skeletons/{RequestsListSkeleton,CreditBadgeSkeleton}.tsx + index.ts
- (del) src/app/tiekejas/uzklausos/RequestsListClient.tsx (558 eil.)
- src/components/auth/SessionGate.tsx (Fragment-wrap fix — žr. c712a8e)

**Toliau:** PR7 Task A (list, SUSPENSE_PLAN §Page 2) baigtas. **`c712a8e` SVARBU
visiems:** generinis `<SessionGate>` iki šiol niekur nebuvo renderintas kaip JSX
— jis turėjo latentų tipo bug'ą (`Promise<ReactNode>` su @types/react 18.3 bigint
mismatch). Sutvarkyta (Fragment wrap). **PRs 3,4,6 (mp-pr3/4/6) irgi importuos
`<SessionGate>` ir be šito fix'o jų build'as lūš** — kas merge'ins pirmas, tas
atneša fix'ą į main; kitiems reikės rebase. C2 laikytasi: jokio `key` ant Suspense,
`searchParams` Promise await'inamas `RequestsList` viduje (page lieka statinis ◐ PPR).
Filter shell paliktas client (URL state); optimistinis in-memory filtravimas
SĄMONINGAI nedarytas (§Page 2 Risk F — pridėti tik jei latency erzins). Build praeina,
route = `◐ /tiekejas/uzklausos`. **NETESTUOTA su realiu PROVIDER account'u** (nėra
test acc; dev server jungiasi prie live DB; `RequestsList` daro `recordAiRun` WRITE)
— reikia Vercel preview QA: skeleton→cards streaming, filtrų responsyvumas, kreditų
badge, pagination Link'ai, non-PROVIDER redirect. Unauthenticated→/prisijungti
patikrinta lokaliai. **Kitas: Task B — `/tiekejas` root dashboard** (toj pačioj
branch'oj; SUSPENSE_PLAN §Page 1 + C4 restructure-only). Žr. NOTES.md follow-up'us.

## 2026-05-28 06:59 — Claude

**Commit:** `a470b59` — perf(paskyra/profilis): hoist static header above the Suspense boundary · push'inta

**Pakeitimai:** 2 files changed, 215 insertions(+), 183 deletions(-)

**Failai:**
- src/app/paskyra/profilis/ProfileForm.tsx
- src/app/paskyra/profilis/page.tsx

**Toliau:** PR1 (Suspense foundation, žr. SUSPENSE_PLAN.md) baigtas ant
`suspense/foundation-and-paskyra-profilis` (push'inta). Sukurta: generinis
`SessionGate` (`src/components/auth/SessionGate.tsx`, render-prop, `requireRole?`)
+ skeleton lib home (`src/components/ui/skeletons/index.ts`); /paskyra/profilis
header iškeltas virš `<Suspense>` (route lieka ◐ Partial Prerender). `pnpm build`
praeina. **PRs 3-7 dabar atblokuoti** — jie importuoja `SessionGate` + skeleton
lib (per C3 PR1 buvo jų blokeris). Prieš merge į main — Vercel preview QA su
realiu USER/PROVIDER account'u: logged-in skeleton→form streaming ir redirect'ai
nebuvo testuoti lokaliai (vengiau live DB / nėra test account'o). NOTES.md
pridėtas follow-up: `sharp` nedeklaruotas `package.json` (atskiras fix).


## 2026-05-28 06:59 — Claude

**Commit:** `5d818b1` — feat(auth,ui): add generic SessionGate and skeleton library home · push'inta

**Pakeitimai:** 2 files changed, 53 insertions(+)

**Failai:**
- src/components/auth/SessionGate.tsx
- src/components/ui/skeletons/index.ts

**Toliau:** PR1 foundation — pilnas handoff viršutiniame įraše.


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
