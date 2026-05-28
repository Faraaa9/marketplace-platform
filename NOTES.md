# Notes & Follow-ups

Projekto neapibrėžtos pastabos, žinomi technologiniai skolų ir mažos
TODO užduotys, kurioms dar neverta atskiro PR'o. Kiekvienas įrašas
turi datą ir kontekstą — kad būtų aišku, ar dar aktualu.

Konvencija:
- `[ ]` — neatlikta
- `[x]` — atlikta (palikti istorijai bent vieną sprintą, paskui trinti)

---

## Saugumas / access control

- [ ] **2026-05-26 — `/admin/layout.tsx` neturi server-side guard'o.**
  `src/app/admin/layout.tsx` yra `"use client"` ir netikrina sesijos
  rolio. Bet kas, kas žino URL'ą, gali patekti į admin panelę — API
  endpoint'ai (pvz. `/api/admin/stats`) 403'ina, bet UI vis tiek
  pasikrauna ir gali rodyti tuščius rėmus prieš auth check'ą.
  Sprendimas: sukurti analogišką pattern'ą kaip `src/app/tiekejas/layout.tsx`
  (commit `ebe05af`) — Server Component, `getServerSession`, redirect į
  `/` jei rolė ne `ADMIN`. Ne blokeris, bet vertas kito PR'o.

- [ ] **2026-05-28 — `/tiekejas/{atsakymai,zinutes,zinutes/[id]}` peržiūros
  gate sušvelnintas (PR3 Suspense konversija).** Šie puslapiai dabar gate'inami
  `SessionGate requireRole="PROVIDER"` (sesija + rolė). Anksčiau client'as
  fetch'ino API route'ą su `requireActiveProvider()`, kuris PAPILDOMAI bouncin'o
  el. paštą nepatvirtinusius / neaktyvius (suspend'intus) tiekėjus į `/tiekejas`
  (per 403 code → client redirect). Tas patikrinimas dabar lieka TIK ant
  mutacijų (archyvo PATCH, žinučių POST — vis dar per `requireActiveProvider`),
  ne ant peržiūros. Pasekmė: suspend'intas/nepatvirtintas tiekėjas dabar mato
  (read-only) savo atsakymus/žinutes, bet negali archyvuoti/rašyti. `proxy.ts`
  gate'ina `/tiekejas/*` tik pagal rolę, tad jis šito nepadengia. Jei norima
  senos elgsenos — pridėti page-lygio active-provider redirect'ą (redirect
  versija `requireActiveProvider`) į server sekcijas.

## PR3 cleanup / UI follow-ups (2026-05-28)

- [ ] **`/api/tiekejas/atsakymai` route'as liko be vartotojų.** Po PR3 jį
  fetch'ino tik ištrintas `AtsakymaiClient`; `ResponsesList` daro Prisma query
  tiesiogiai. Paliktas vietoje (konservatyviai — „keep unless unused"), bet
  kandidatas ištrynimui atskirame cleanup PR'e. PASTABA: `/api/tiekejas/zinutes`
  ir `/api/tiekejas/zinutes/[id]` LIEKA (naudoja `MobileBottomNav` unread badge,
  dashboard, archyvo PATCH, žinučių POST); tik `[id]` GET handler'is liko be
  vartotojų (jo query perkeltas į `ThreadView`).

- [ ] **Inbox neperskaitytų skaičius nuimtas nuo chrome (PR3).**
  `/tiekejas/zinutes` antraštės subtitle („{n} neperskaitytos") ir „Neperskaityti"
  tab'o badge'as pašalinti — client filter shell'as (`InboxFilterShell`) neturi
  duomenų jiems skaičiuoti (plan'as: „label-only / counts derive from list").
  Globalus neperskaitytų badge'as vis dar yra `MobileBottomNav`'e. Jei norima
  in-page skaičiaus grįžimo — reikia mažos dedikuotos server sekcijos,
  streaminančios count'ą atskiru Suspense'u (nestreaminti per visą sąrašą).

## Performance follow-ups (po 2026-05-28 audit'o)

- [ ] **2026-05-28 — User-side žinutės be realtime po Suspense konversijos
  (PR4 `suspense/user-cluster`).** `/paskyra/zinutes` (ir `/paskyra/uzklausos`
  atsakymų count) dabar fetch'ina serveryje, todėl presence/unread rodikliai
  static-after-load — reikia reload, kad pamatytum naują žinutę. Kai dėsim
  realtime user-side žinutėms, reikės klientinio island'o, kuris hidratuojasi
  su server-fetch'intais initial duomenimis ir subscribe'inasi į Supabase
  (tas pats pattern kaip planuojama `/uzklausos/sekti/[id]` ir
  `/tiekejas/zinutes/[id]`). Ne blokeris — sąmoningai out of scope perf PR'ui.

- [ ] **Cache invalidation hooks neimplementuoti.** `/meistrai`,
  `/meistrai/[slug]`, `/`, `/tiekejams` puslapiai naudoja
  `unstable_cache` su 60-300s revalidate. Reiškia, kad provider
  profile update, naujas review, ar approved registracija
  pasimato vartotojui ne iš karto, o per artimiausius 60-300s.
  Sprendimas: pridėti `revalidateTag(...)` įvykiams:
  - `/api/paskyra/profilis` (PATCH/PUT) → `revalidateTag('providers')`
    ir `revalidateTag('provider:user:${userId}')`
  - Review approval (admin) → `revalidateTag('reviews')` ir
    `revalidateTag('reviews:user:${providerId}')`
  - New ServiceRequest → `revalidateTag('requests')`
  Tag'ai jau parašyti cache wrappers'iuose, tiesiog reikia hook'inti
  įvykius. ~30 min darbo.

  **Papildymas 2026-05-28:** `/meistrai/[slug]` `ReviewsSection` ir
  `SimilarProvidersSection` dabar irgi `'use cache'` (300s revalidate),
  naudoja tuos pačius tag'us — `reviews:user:${id}` (ReviewsSection) ir
  `provider:user:${id}` (SimilarProvidersSection). Planuojamas
  `revalidateTag('reviews:user:${providerId}')` (review approval) ir
  `revalidateTag('provider:user:${userId}')` (profilio update) wiring'as
  automatiškai padengia ir šias dvi sekcijas — papildomo darbo nereikia.

- [ ] **Vercel install grąžintas į npm.** `vercel.json` po
  `d5ba0a7` naudoja `npm install`, ne `pnpm install --frozen-lockfile`.
  Priežastis: pnpm switch'as sukėlė deploy'ų "Deploying outputs..."
  klaidą — įtarimas, kad chromium tracing per
  `outputFileTracingIncludes` (next.config.mjs) konfliktuoja su
  pnpm symlinked node_modules. Lokaliai pnpm vis dar canonical
  (pnpm-lock.yaml committed, package-lock.json ignoruojamas).
  Investigation idėja: galbūt `@sparticuz/chromium` `outputFileTracingIncludes`
  reikia atnaujinti į pnpm-style path (`./node_modules/.pnpm/@sparticuz+chromium*/node_modules/@sparticuz/chromium/**/*`)
  ar perkelti chromium loading'ą į runtime fetch (Vercel Blob/S3).
  Tikslas: grįžti į pnpm install, sutaupyti ~30-60s per build.

- [ ] **`/api/requests/[id]` (GET-by-token) — likę vartotojai po PR5.**
  Request tracker (`/uzklausos/sekti/[id]`) po PR5 (Suspense, branch
  `suspense/tracker-page`) duomenis ima serverio pusėje (`data.ts`), nebe per
  šį API. Endpoint'as paliktas, nes jį dar naudoja `redaguoti/page.tsx`
  (edit forma) ir `components/guest/RecentRequestBanner.tsx` (svečio
  banneris). Kai/jei tie du pereis prie serverio fetch'o, route'ą galima
  šalinti. Migracijos metu suvienodinti su `data.ts` select/transform, kad
  nedrift'intų.

- [x] **2026-05-28 — Cache Components (PPR) įjungta production'e.** Visi
  Phase 1-5 darbai padaryti per paralelinę 5 agentų sesiją + kelias
  iteracijas finišuojant ant `main` branch'o. `cacheComponents: true`
  next.config.mjs'e, build'as praeina, deploy'as Ready, daug routes
  prerender'inami kaip `◐ Partial Prerender` (statinis šeletas iš CDN
  + dinamika streamina per Suspense). `Cache-Control` headeris dabar
  `public, max-age=0, must-revalidate` (anksčiau buvo `private, no-store`)
  — Next.js nebepriverstinai blokuoja edge cache. Performance:
  /tiekejams ~107ms warm (instant CDN HIT), / ~500ms, /meistrai ~750ms
  (didesnis payload). Per-user puslapiai (paskyra, tiekejas/*) dabar
  rodo statinį šeletą iškart, dinamika streamina į Suspense'us.
  Originalus follow-up (kuris dabar baigtas):

- [ ] **Per-user puslapiai negali būti public edge cache'inami — reikia Cache Components.**
  `/meistrai/[slug]` (owner preview PENDING), `/uzklausos` (session-aware),
  visi `/tiekejas/*`, `/paskyra/*`, `/admin/*` — turi per-vartotojo
  logiką, todėl `CDN-Cache-Control: public` saugumo problema.
  Server-side `unstable_cache` jau dirba, bet kiekvienas request'as
  vis dar invokuoja funkciją. Norint instant load — reikia Cache
  Components (Next 16 PPR): statinis šeletas prerenderinasi build'e,
  dinamiškos dalys (session-aware) streaminasi per `<Suspense>`.

  **Bandymas 2026-05-28**: įjungtas `cacheComponents: true`,
  pradėta pašalinti 58 `export const dynamic = "force-dynamic"`, bet
  paaiškėjo, kad reikia 52 API routes refactor (`await connection()` viršuje)
  plius unstable_cache→'use cache' konversijos plius Suspense boundaries.
  Realus scope = 2-3 darbo dienos, ne valandos. Stash'as drop'intas,
  production stabilus, jokie pakeitimai negit'inti.

  **Antras bandymas 2026-05-28 (Task G)**: pakartotinai flippinta `cacheComponents: true`
  ant `cache-components/task-g-enable-flag` branch'o (be prep darbų). Build
  lūžo greitai su lygiai tokiu pattern'u, kokio tikėtasi:
  - `Route segment config "runtime" is not compatible with nextConfig.cacheComponents.`
    pirminis trigger'is `src/app/api/stories/feed/route.ts:4` (`export const runtime = "nodejs"`).
  - 58 sekantiniai error'ai per visus `force-dynamic` eksportus
    (`src/app/api/admin/*`, `/api/paskyra/*`, `/api/tiekejas/*`, `/api/requests/*`
    plius 6 puslapiai: `meistrai/kurti-profili`, `paskyra/profilis`,
    `paskyra/zinutes`, `meistrai/[slug]`, `meistrai`, `tiekejams`).
  - Build'as nepasiekė `unstable_cache` fail'ų — sustojo per pirmą sluoksnį.
  Flag'as iš next.config.mjs revert'intas, branch'as `cache-components/task-g-enable-flag`
  pasiliko lokaliai (uncommitted, neglobalizuotas). Multi-session plan'as
  (Phases 1-4) lieka galiojantis ir reikalingas prieš flag flip.

  **Multi-session migration plan**:

  ### Phase 1 — API routes `connection()` (~2-3 val.)
  - Tikslas: pakeisti 52 `/api/**/route.ts` failus, kad cacheComponents
    neprerendrintų jų ir try/catch neapgaubtų bailout error'ų.
  - Pattern kiekvienam: pridėti `connection` į `from "next/server"` import'ą +
    `await connection();` kaip pirmą eilutę GET/POST/PUT/PATCH/DELETE handler'yje.
  - Sąrašas: `grep -rlE "(req\.url|request\.url|nextUrl|getServerSession|cookies\(\)|headers\(\))" src/app/api --include="route.ts"`
  - **NEDARYTI** batch perl regex'u — sulaužys importus. Po vieną per `Edit` tool.

  ### Phase 2 — Page-level fixes (~1 val.)
  - `src/components/layout/Footer.tsx`: `new Date().getFullYear()` →
    module-scope const arba klientinis komponentas.
  - `src/app/api/internal/cleanup-*-route.ts` (2 cron failai):
    pašalinti `force-dynamic`. Cron'ai nepatenka į PPR scope.
  - Pašalinti `export const runtime = "nodejs"` iš `/api/stories/feed`,
    `/api/profile/ai-generate`. Defaults į Node 24.
  - Pašalinti `export const revalidate = N` iš mano cache'intų puslapių
    (`/meistrai`, `/meistrai/[slug]`, `/tiekejams`).

  ### Phase 3 — `unstable_cache` → `'use cache'` (~1 val.)
  - 6 failai naudoja `unstable_cache`: `/`, `/meistrai/page.tsx`,
    `/meistrai/[slug]/page.tsx`, `/uzklausos/page.tsx`,
    `/tiekejams/page.tsx`, `src/lib/providers-listing.ts`, plus
    `/api/categories/route.ts`.
  - Pattern:
    ```ts
    // Prieš
    const getX = unstable_cache(async () => {...}, ["key"], { revalidate: 60, tags: ["tag"] });
    // Po
    async function getX() {
      'use cache';
      cacheLife({ revalidate: 60 });
      cacheTag('tag');
      return ...
    }
    ```
  - Restrikcija: `'use cache'` viduje NEGALI `cookies()/headers()/searchParams`.
    Reikia ekstraktuoti į argument'us.

  ### Phase 4 — Suspense boundaries (faktinis PPR win, ~2 val.)
  - Tikslas: po phases 1-3 build'as praeis. Bet PPR statinio šelet'o
    pranašumo dar nebus — puslapiai vis dar pilni dinamiški.
  - Padengti šituos puslapius:
    - `/tiekejas` (root dashboard)
    - `/tiekejas/uzklausos`, `/tiekejas/uzklausos/[id]`
    - `/uzklausos/sekti/[id]`
    - `/paskyra/profilis`
  - Pattern: wrap'inti slow data fetches `<Suspense fallback={<Skeleton />}>`,
    layout/header/nav lieka statiniai.

  ### Phase 5 — Deploy + monitoring (~30 min)
  - Push staging branch'as pirmu kartu (ne main), patikrinti Vercel preview.
  - Jei OK → merge'inti į main.
  - Po deploy'aus stebėti Vercel logs 24h dėl prerender error'ų.

  **Bendras estimate**: 6-8 val. focused, kelis darbo dienas dėl QA.
  Patarimas: phase'us split'inti į atskirus PR'us, kad jei phase 3 lūš,
  galima rollback'inti tik tą sluoksnį.

- [ ] **Manual DB migration neatliktas per CI/CD.** `prisma/manual-migrations/20260528_add_provider_listing_indexes.sql`
  ir kiti `manual-migrations/` failai aplikuojami rankom per Supabase
  SQL Editor. Tai vienkartinis pasirinkimas, bet auga rizika pamiršti
  paleisti migraciją po deploy'aus. Mintis ateičiai: arba pereiti į
  `prisma migrate deploy` per Vercel build, arba sukurti CI step'ą,
  kuris `manual-migrations/*.sql` aplikuoja per `supabase` MCP
  automatiškai po deploy'aus.

- [ ] **2026-05-28 — `/api/tiekejas/uzklausos/[id]` GET tampa dead code po PR6.**
  `suspense/provider-request-detail` perkėlė request-detail duomenis į server
  sekcijas, todėl puslapis nebekviečia GET `/api/tiekejas/uzklausos/[id]`. POST
  (atsakymo pateikimas per `ResponseForm`) vis dar naudojamas, todėl route
  failas paliktas nepaliestas. Follow-up: kai PR6 sumerge'intas, grep'inti ar
  koks mobile/external klientas naudoja GET'ą; jei ne — ištrinti tik GET
  handler'į (palikti POST). Ne blokeris.

## Suspense PR7 follow-ups (tiekejas/uzklausos + dashboard)

- [ ] **2026-05-28 — Optimistinis filtravimas `/tiekejas/uzklausos` (jei reikės).**
  Lista dabar serverinė: filtro keitimas = URL navigacija → `RequestsList`
  re-streamina (sena lista lieka matoma per transition, jokio full-page blank).
  Per §Page 2 Risk F optimistinis in-memory filtravimas SĄMONINGAI nedarytas.
  Jei QA/vartotojai skųsis filtrų latency (~500-1000ms dėl lėtos užklausos),
  TADA pridėti optimistinį client filtravimą ant turimo puslapio dataset'o.
  Nematuota su realiu account'u — pamatuoti pirma.

- [ ] **2026-05-28 — `recordAiRun` dabar kviečiamas iš server-komponento render'io.**
  Buvo route handler'yje (`/api/tiekejas/uzklausos`), dabar `RequestsList.tsx`
  viduje (`void recordAiRun(...)`, fire-and-forget). Semantic-match shadow
  telemetrija turėtų rašytis 1x per request dinamiškame render'e (po
  `await searchParams` bailout'o — build'e nesirašo). Patikrinti prod logs,
  kad `semantic_match_shadow` įrašai vis dar atsiranda ir nedubliuojasi.

- [ ] **2026-05-28 — Result count perkeltas į `RequestsList` (serveris).**
  Anksčiau buvo chip'ų eilutėje (`{total} užklausų`, dešinėje, kartu su filtrų
  chip'ais). Dabar — virš kortelių sąrašo (dešinėje), nes `total` ateina iš
  serverinės užklausos, o chip'ai liko client filter shell'e. Smulkmena, bet
  QA metu patikrinti, kad atrodo tvarkingai (gali būti viena papildoma eilutė).

- [ ] **2026-05-28 — `/api/tiekejas/uzklausos` route ir `ui/Pagination` be UI vartotojo.**
  Po list refactor'o `/api/tiekejas/uzklausos/route.ts` nebeturi naršyklės
  vartotojo (logika perkelta į `RequestsList`). `src/components/ui/Pagination.tsx`
  (client, `onPageChange`) irgi liko be vartotojų — listoj naudojami `<Link>`
  pagination. Abu palikti (galimi mobile/ateities vartotojai). Prieš trinant —
  grep per visą repo + mobile klientus. Ne šito PR'o scope.

- [ ] **2026-05-28 — `/tiekejas` quick-links nebešviesina disabled būsenos.**
  Anksčiau Užklausos/Žinutės kortelės buvo grayed-out + "Patvirtinkite el. paštą"
  / "Paskyra sustabdyta" kai `!canAccessRequests`. `QuickLinksGrid` dabar sync
  (per planą), tad nemato canAccess be fetch'o — kortelės visada enabled.
  Mitigacija: destination puslapiai gate'ina (`/tiekejas/uzklausos` redirect'ina
  unverified/suspended į /tiekejas; patikrinti, ar `/tiekejas/zinutes` +
  `/tiekejas/atsakymai` daro tą patį) + AccountCard rodo verif/suspension
  banner'ius. Jei norisi disabling atgal: `QuickLinksGrid` → async server su savo
  `<Suspense>`, skaityti canAccess (emailVerified+isActive), rodyti disabled
  korteles.

- [ ] **2026-05-28 — Telemetrija rašoma iš server-komponento render'io (2 vietos).**
  `RequestsList` (`void recordAiRun`) ir `FollowUpsCard` (`await
  recordFollowUpScan`) — abu buvo route handler'iuose, dabar render'e.
  Faithful (1x per request dinamiškame render'e), bet side-effect render'e.
  Švaresnis variantas: `import { after } from "next/server"` ir įdėti rašymą į
  `after(() => ...)` kad nestabdytų stream'o ir tikrai nebūtų dropinamas.
  Patikrinti prod logs, kad `semantic_match_shadow` + follow-up scan įrašai
  vis dar atsiranda.

- [ ] **2026-05-28 — canAccess (emailVerified+isActive) skaitomas per-sekciją.**
  `/tiekejas` 5 sekcijos (AccountCard, StatsGrid, ProfileCompleteness,
  FollowUps, QuickLinks/InboxUnreadBadge) kiekviena nepriklausomai skaito
  user/profile. Per Suspense planą tai sąmoninga (nepriklausomas streaming,
  connection pool atlaiko paralelinius reads). Jei profiling parodys, kad svarbu
  — galima hoist'inti canAccess į vieną wrapper'į ir paduoti props'ais (kaina:
  ~30-50ms blokavimas prieš sekcijų streaming'ą).

## Build / priklausomybės

- [x] **2026-05-28 — `sharp` importuojamas, bet nedeklaruotas `package.json`.**
  `src/lib/image-processor.ts` daro `import sharp from "sharp"`, tačiau
  `sharp` nėra `dependencies` sąraše — egzistuoja tik kaip tranzityvi
  priklausomybė pnpm store'e (`node_modules/.pnpm/sharp@0.34.5`).
  Pagrindiniame repo `node_modules/sharp` atsitiktinai prieinamas top-level
  (senas install'as), todėl build'as ten praeina. Švariame worktree/CI
  install'e (`pnpm install` be hoist) sharp nehoistinamas į top-level →
  `next build` lūžta: `Module not found: Can't resolve 'sharp'` (import trace
  per `src/app/api/profile/ai-generate/route.ts`). Sprendimas: `pnpm add sharp`
  (deklaruoti kaip tiesioginę dependency). Aptikta dirbant ant
  `suspense/foundation-and-paskyra-profilis` — ne to PR'o scope.
  **Sutvarkyta 2026-05-28 (commit `4961710`, branch `fix/declare-sharp-dep`):**
  `sharp` deklaruotas kaip tiesioginė dependency (`sharp: 0.34.5`, exact pin
  prod determinizmui su chromium bundle'u), `pnpm-lock.yaml` atnaujintas.
  Švarūs strict-pnpm worktree/CI build'ai dabar resolvina sharp be hoist'o.
