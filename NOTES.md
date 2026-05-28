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

## Performance follow-ups (po 2026-05-28 audit'o)

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
