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

- [ ] **Per-user puslapiai negali būti public edge cache'inami.**
  `/meistrai/[slug]` (owner preview PENDING), `/uzklausos` (session-aware),
  visi `/tiekejas/*`, `/paskyra/*`, `/admin/*` — turi per-vartotojo
  logiką, todėl `CDN-Cache-Control: public` saugumo problema.
  Server-side `unstable_cache` jau dirba, bet kiekvienas request'as
  vis dar invokuoja funkciją. Norint instant load — reikia Cache
  Components (Next 16 PPR): statinis šeletas prerenderinasi build'e,
  dinamiškos dalys (session-aware) streaminasi per `<Suspense>`.
  ~3 val. darbo, bet game changer per-user puslapiams.

- [ ] **Manual DB migration neatliktas per CI/CD.** `prisma/manual-migrations/20260528_add_provider_listing_indexes.sql`
  ir kiti `manual-migrations/` failai aplikuojami rankom per Supabase
  SQL Editor. Tai vienkartinis pasirinkimas, bet auga rizika pamiršti
  paleisti migraciją po deploy'aus. Mintis ateičiai: arba pereiti į
  `prisma migrate deploy` per Vercel build, arba sukurti CI step'ą,
  kuris `manual-migrations/*.sql` aplikuoja per `supabase` MCP
  automatiškai po deploy'aus.
