# Notes & Follow-ups

Projekto neapibrėžtos pastabos, žinomi technologiniai skolų ir mažos
TODO užduotys, kurioms dar neverta atskiro PR'o. Kiekvienas įrašas
turi datą ir kontekstą — kad būtų aišku, ar dar aktualu.

Konvencija:
- `[ ]` — neatlikta
- `[x]` — atlikta (palikti istorijai bent vieną sprintą, paskui trinti)

---

- [ ] **ai-improve kategorijų priskyrimas negyvas** (2026-06-28). `getCategoryPromptData`
      (`src/lib/ai-improve.ts`) filtruoja `category.depth > 0`, bet
      `getFlatServiceCategories()` serializuoja node'us BE `depth/parentId/rootId`
      (numesta RSC payload plonimui) → kandidatų sąrašas tuščias kiekvienai
      užklausai → LLM negrąžina kategorijų (matuota 300/300 zero). Forma ir
      telegram bot'as krenta į `suggestCategories` (1 chip'as). Šis PR tik
      short-circuit'ina bevaisį domain-index skenavimą + dokumentuoja.
      **Tikras fix (atidėtas):** ai-improve turi krautis raw kategorijų eilutes
      SU `depth` (atskira prisma užklausa, kaip `suggestCategories.loadCandidates`),
      ne UI-suplonintą flat sąrašą. NEpridėti `depth` atgal į `getFlatServiceCategories`
      — tai grąžintų RSC payload problemą. Sprendimas ar apskritai taisyti
      (1 kalibruotas chip'as gali būti geriau nei 3 nepatikrinti LLM) — atviras.

## Darbukai (2026-06-12) — ĮGYVENDINTA 2026-06-12/13 (commit'ai 97429f9, 2654b06, 67ab060)

- [x] **Homepage hero kortelės supaprastinimas** (užklausos kūrimo kortelė su
      „AI sugalvos pavadinimą"). Turi likti tik vienas įvesties laukas + aiškus
      trumpas paaiškinimas, ką įvesti. Išimti: „AI parinks kategoriją" chip'ą,
      „Tvarkyti aprašymą su AI" mygtuką, „AI užpildys likusius laukus už tave"
      tekstą (palikti tik „min. 15 simbolių"). Apatinė eilutė po brūkšniu — ne
      „✦ Atpažins miestą/biudžetą/terminą", o kaip buvo anksčiau: pliusiukai
      („+ miestas", „+ biudžetas", „+ terminas"). PATVIRTINTA pagal
      `mockups/nauja-uzklausa-su-nuoroda.html` + PALIKTI record (mikrofonо)
      mygtuką prie lauko.
- [x] ~~Užklausos kūrimo žingsnių juosta — spalvos.~~ ATŠAUKTA — spalvos
      paliekamos kaip yra („ai poxui, geros tos spalvos").
- [x] **Užklausos sekimo puslapis — dubliavimasis.** Po paskelbimo rodomame
      puslapyje tas pats turinys kartojasi: (a) „pagerink užklausą" CTA 2×
      (rudas blokas „Padidinkite šansą..." su Nuotraukos/Biudžetas/Kategorija
      ir tie patys 3 mygtukai tuščioje „Pasiūlymai (0)" kortelėje);
      (b) „pasiūlymai ateis per kelias valandas" žinutė ~4× (žalias banneris,
      PERŽIŪROS plytelė, pilka eilutė „Tiekėjai dar neperžiūrėjo...",
      „Užklausa aktyvuota" kortelė); (c) „KITAS VEIKSMAS: palaukti arba
      papildyti" kartoja improve-CTA. Palikti po vieną kiekvienos žinutės
      vietą, kitas išimti / sujungti.
- [x] **Užklausos sekimo puslapis — „Live" ženkliukas.** Antraštės zonoje
      (prie „Atidaryta" / kategorijos) pridėti gyvą „Live" indikatorių
      (pvz., pulsuojantis taškelis + „Gyvai" / „Paskelbta"), kad žmogus
      iškart matytų, jog užklausa jau realiai paskelbta ir matoma tiekėjams.
      Derinti su #3 dedupe — galbūt „Live" ženkliukas pakeičia dalį
      besidubliuojančių „užklausa aktyvuota" žinučių.
- [x] **Užklausos sekimo puslapis — išimti stepper'į ir 3 plyteles.** Stepper'is
      (Patvirtinimas → Pasiūlymų laukimas → Vykdoma → Uždaryta) klaidina: be
      apmokėjimo platformoje Vykdoma/Uždaryta neįvyksta, Patvirtinimas — praeitis.
      Plytelės Matomumas/Peržiūros/Kitas veiksmas — nulinės informacijos (views
      klientui nerodyti; kur rodyti — spręsim vėliau, gal išvis nereikės).
      Nauja struktūra: (1) antraštė + Live ženkliukas, (2) viena eilutė „tiekėjai
      mato, pirmieji pasiūlymai per kelias valandas", (3) vienas improve-CTA
      (tik kol pasiūlymų 0), (4) užklausos turinys + veiksmai, (5) pasiūlymų
      sąrašas. Apima/išplečia #3 dedupe.
- [x] **Po paskelbimo — be banner'io, tik redirect.** Išimti žalią statinį
      „Užklausa paskelbta..." banner'į (`?created=1`). Paspaudus „skelbti"
      vartotoją mesti tiesiai į užklausos puslapį ir tiek. Daugiausia —
      trumpas toast'as, kuris iššoka ir pats pradingsta po ~2 s.
      (Patikslina #5 struktūros punktą (2) — atskiros žinutės nereikia.)
- [x] **Kliento dashboard — „Žinutės" plytelę keisti į „Pateiktos užklausos".**
      Plokščias žinučių sąrašas neskaluoja (5 užklausos × 10 tiekėjų = 50
      pokalbių krūvoje). Hierarchija: užklausų sąrašas → užklausos puslapis →
      pasiūlymai/pokalbiai. (1) Dashboard plytelė: aktyvių užklausų skaičius +
      bendras neskaitytų badge'as; (2) užklausų sąrašo puslapis: pavadinimas,
      Live/uždaryta, „N pasiūlymų", neskaitytų badge'as, rikiuota pagal
      naujausią aktyvumą; (3) užklausos puslapyje pasiūlymai — neskaityti
      pirmi; (4) unread skaičiai sumuojasi aukštyn (pokalbis → užklausa →
      dashboard). Globalaus žinučių inbox'o nedaryti.
      PATVIRTINTA + vizualas: `mockups/uzklausu-hierarchija.html` (labai patiko,
      „būtinai!"). VIETOS PLANAS (patikslinta):
      - 3 lygis (užklausos puslapis): `/uzklausos/sekti/[id]` — yra, tvarkyti pagal #5.
      - 2 lygis (sąrašas): `/paskyra/uzklausos` — jau egzistuoja (USER ir PROVIDER),
        perdaryti pagal mockup'ą (Live, „N pasiūlymų", unread badge, aktyvumo rikiavimas).
      - 1 lygis (plytelė su badge'u): tiekėjui — ProviderWorkCenter'yje
        (`src/app/tiekejas/sections/ProviderWorkCenter.tsx`) vietoj „Žinutės laukia
        atsakymo" plytelės (screenshot'as buvo iš čia); klientui — `/paskyra` root
        dashboard'e, kurio DAR NĖRA (senas TODO). Kol nėra — klientui 1-as lygis =
        header'io „Mano užklausos" nuoroda su unread badge'u (veikia visiems iškart).
      Svečiai be paskyros lieka 3-iame lygyje (magic link iš el. pašto) —
      tai paskata kurtis paskyrą, ne problema.
- [x] **Header navigacija: „Užklausos" → „Užklausų lenta".** Pervadinti
      nuorodą pagrindiniame meniu (Meistrai / Užklausos / Pateikti užklausą).
- [x] **„Pateikti užklausą" puslapis — juostelė į esamas užklausas.** Jei
      vartotojas turi ≥1 aktyvią užklausą, tarp antraštės ir stepper'io rodyti
      ploną nuorodos juostelę. PATVIRTINTA: B variantas — visada „N aktyvios
      užklausos (- laukia tavęs)" + suminis naujų badge'as + „Mano užklausos →"
      (į /paskyra/uzklausos), nepriklausomai nuo skaičiaus (su viena — „1 aktyvi
      užklausa"). Be naujų — be badge'o, rami juostelė.
      Vizualas: `mockups/nauja-uzklausa-su-nuoroda.html` (ten pat parodyta
      #1 supaprastinta kortelė ir #2 neutralus stepper'is kartu).
- [x] **Tiekėjo „Reikia dėmesio" — užklausos sulietos su žinutėmis** (56b5053).
      Pateiktos užklausos rodomos tame pačiame sąraše su tagu „Užklausa",
      burbulas: Visos | Žinutės | Užklausos (`?rodyti=`). Plytelių skaičiai
      liko tik žinučių.
- [x] **Užklausos sekimo puslapis išimtas iš prisijungusių srautų** (f00a5e9).
      (b) inbox'o užklausos eilutė turi „Redaguoti užklausą →" tiesiai į
      `/uzklausos/sekti/[id]/redaguoti`; (c) po paskelbimo PROVIDER →
      /tiekejas/zinutes, USER → /paskyra/uzklausos, svečiai → sekti puslapis;
      (d) pasiūlymo paspaudimas inbox'e atidaro pokalbį chat'o panelėje
      (tracking messages API + realtime per token, skaitymo kvitai žymimi).
      LIKO: (a) svečiai ir paprasti USER klientai detalei vis dar naudoja
      /uzklausos/sekti (USER neturi inbox'o — /tiekejas/* tik PROVIDER;
      /paskyra/zinutes tik direct inquiries). Galutinai trinti puslapį bus
      galima tik padarius kliento inbox'ą arba atidarius /tiekejas/zinutes
      visiems. Iki tol sekti puslapio UI nebeplėtoti. Pastaba: „Uždaryti/
      Ištrinti" veiksmai liko tik sekti puslapyje ir redaguoti flow.

---

## Production launch — likę darbai po fix/production-blockers PR (2026-06-10)

Šitas branch'as (`fix/production-blockers`) sutvarkė:
- ✅ Stripe webhook persistent idempotency (`webhook_events` table)
- ✅ `charge.refunded` handler + `stripeChargeId` ledger'yje + `reverseRefund()`
- ✅ `/api/health` route (DB ping uptime monitor'ui)
- ✅ Post-submit confirmation banner `/uzklausos/sekti/?created=1`
- ✅ Realtime chat degraded banner + auto-reconnect (8s cooldown + focus retry)
- ✅ CI: prisma generate + tsc --noEmit (vietoj `next build` kuriam reikia DB)
- ✅ Stale STRIPE_SECRET_KEY TODO'ai iš webhook/checkout route'ų

Likę darbai prieš/po launch:

- [ ] **DB migracija prieš deploy.** Pritaikyti `prisma/manual-migrations/20260610_add_webhook_events_and_charge_id.sql`
      Supabase'e PRIEŠ deploy'ą. Po to patvirtinti su `pnpm db:push` (no-op jeigu SQL teisingai pritaikytas).
- [ ] **Stripe Dashboard** — prijungti `charge.refunded` event'ą prie webhook endpoint'o.
- [ ] **Sentry** — `pnpm add @sentry/nextjs` + `npx @sentry/wizard@latest -i nextjs`.
- [ ] **Vercel uptime monitor** ant `/api/health` (60s ping).
- [ ] **`Response.price` Float → Int(cents)** — P0 pinigų-saugumo bug'as. Atskiras PR
      (migracija + backfill + UI/API cents refactor).
- [ ] **Cascade'ai → Restrict** ant `CreditTransaction.providerProfileId` ir `LeadUnlock.providerProfileId`,
      kad ledger'is išliktų po ProviderProfile hard-delete'o.
- [ ] **AdminActionLog modelis** — admin'o veiksmų audit trail.
- [ ] **Rate-limit `failClosed: true`** ant `/api/auth/register`, `/api/auth/reset-password`, `/api/requests/send-code`.
- [ ] **GDPR cleanup cron** (PasswordReset/EmailVerification/TelegramLogin tokens + InboundEmail 90d retention).
- [ ] **AI improve fallback** ant `/uzklausos/nauja` — retry + manual category UX.
- [ ] **Email/Phone verification UX** — resend/expired/rate-limit messages.
- [ ] **`/paskyra` root dashboard** + `/tiekejas` blank-state checklist.
- [ ] **`/claim/[slug]`** — `notFound()`. Sutvarkyti arba pašalinti.
- [ ] **Per-page JSON-LD** — `LocalBusiness` ant `/meistrai/[slug]`, `Service`+`BreadcrumbList` ant `/paslaugos/*`.
- [ ] **Status enums** → `src/lib/statuses.ts` const exports + state machines.
- [ ] **Client comp'ai >800 LOC** skaldyti (`tiekejas/profilis`, `ProviderListingClient`, `ProviderInboxClient`,
      `uzklausos/nauja`, `ThreadChat`).
- [ ] **`console.log` → structured logger** (23 vietos, daugiausia `ai-generate`, `inbound-router`).
- [ ] **E2E smoke (Playwright)** — landing, request-creation, provider-signup, unlock-lead, admin-claim.
- [ ] **Vitest** + money testai (grantCredits idempotency, unlockLead race, reverseRefund idempotency, webhook replay).

---

## AI stebėsena ir bendras OpenRouter klientas (A fazė)

- [x] **2026-05-29 — A1: bendras OpenRouter klientas + audito „tiesos sluoksnis".**
  Naujas `src/lib/ai/openrouter.ts` (vienas `fetch`, timeout, 1 retry per 5xx/429/tinklą,
  `usage` ištraukimas, grąžina realiai naudotą modelį). Visi 10 LLM touchpoint'ų migruoti.
  `ai_runs` nuo šiol logina REALŲ modelį (ne hardkodintą `OPENROUTER_MODEL`) + dinamišką
  `promptVersion` (`+override` kai aktyvus admino promptas) + token sąnaudas `metadataJson`.
  `category_picker` ir `image_generate` pradėti logginti (anksčiau visai nelogino) ir gavo
  timeout (anksčiau neturėjo). `category_suggest` nebelogina netikro „success" per
  deterministinį fallback (žymi `aiUsed`/`aiAttempted`). `transcribe` logina ir Telegram
  kelią. `prompt-config.ts` pridėti `resolvePromptVersion` / `getActiveOverrideFlags`.
  Build + `tsc` žali.

- [x] **2026-05-29 — A2: kaina + žetonai `/admin/ai` (be DB migracijos).**
  OpenRouter automatiškai grąžina `usage.cost` (USD) — `usage:{include:true}` deprecated,
  nereikia. Klientas parsina `costUsd`; kiekvienas touchpoint logina `costUsd` + token sumas
  į `metadataJson`. `getAiFeatureUsage` jas agreguoja (BE schemos pakeitimo), skydas rodo
  „≈ Kaina / N d." + „Žetonai / N d." per touchpoint'ą ir bendrą kainą viršuje. Pradinis
  „pridėti AiRun stulpelius + Prisma migracija" planas atmestas — DB liesti neprireikė.
  PASTABA: `profile_generate` kainos/žetonų nerodo, kol nemigruotas į klientą (žr. žemiau).

- [x] **2026-05-29 — `profile_generate` pilna kliento migracija.**
  `generateWithClaude`/`generateFromScratch` migruoti į `callOpenRouter` (timeout 60 s +
  retry + usage). Funkcijos grąžina `{ result, usage }`; route logina `costUsd` + token sumas.
  Onboarding'as nebepakimba dėl pakibusio OpenRouter kvietimo. Build + `tsc` žali.

- [x] **2026-05-29 — `category_picker` confidence + `category_suggest` reason (C-fazė).**
  Picker Pass 1 promptas suderintas su kodo 0.6 (anksčiau 0.5 → tyliai prarandamos šaknys).
  `category_suggest` override nebeturi hardkodintų „kriauklė/vanduo" — tuščias matchedTokens,
  reason grįžta į sąžiningą „Atitinka kategoriją …".

- [x] **2026-05-29 — `lead_copilot` confidence → null (C-fazė).**
  Trūkstamas confidence nebevirsta tyliu 0.5; `confidence: number | null`, UI rodo „įvertis
  neprieinamas". Tiekėjas nebesiremia fiktyviu skaičiumi sprendžiant, ar atrakinti kontaktus.

- [x] **2026-05-29 — NON-ISSUE (patikrinta, kodo nereikia).** Kelios analizės įžvalgos
  neatlaikė patikros: `transcribe` web VISADA perkoduoja į 16kHz mono WAV
  (`use-voice-recorder.ts`), tad route'o „wav" teisinga; `ai-usage` `14d` pavadinimai TEISINGI
  (`getAiUsageStats` kviečiamas su 14 d. langu per `/api/admin/stats` — atskira funkcija nuo
  30 d. `getAiFeatureUsage`); `moderation_image` `modelKind:"text"` nepavojinga — visi 6
  kuruoti modeliai yra multimodalūs.

- [ ] **Liko (smulku, ne prioritetas):** `moderation_image` >10 nuotraukų tyliai numetamos
  (batch'inti arba priverstinai „review"); `ai-usage` JS agregacija ties `take:5000/1000`
  augant srautui (Prisma `groupBy` optimizacija — ne dabar).

---

## Saugumas / access control

- [x] **2026-05-26 — `/admin/layout.tsx` neturi server-side guard'o.**
  `src/app/admin/layout.tsx` yra `"use client"` ir netikrina sesijos
  rolio. Bet kas, kas žino URL'ą, gali patekti į admin panelę — API
  endpoint'ai (pvz. `/api/admin/stats`) 403'ina, bet UI vis tiek
  pasikrauna ir gali rodyti tuščius rėmus prieš auth check'ą.
  Sprendimas: sukurti analogišką pattern'ą kaip `src/app/tiekejas/layout.tsx`
  (commit `ebe05af`) — Server Component, `getServerSession`, redirect į
  `/` jei rolė ne `ADMIN`. Ne blokeris, bet vertas kito PR'o.
  **Sutvarkyta 2026-05-28 (kodo nereikia):** `src/proxy.ts` JAU role-gat'ina
  `/admin/*` (eil. 28-30: ne-ADMIN → redirect į `/prisijungti` PRIEŠ render'į,
  edge'e; `authorized` callback reikalauja `!!token`). Tai uždaro spragą geriau
  nei layout check — ne-admin'as niekada nepasiekia UI. Šis įrašas rašytas prieš
  proxy gating'ą. NOTES siūlytas `getServerSession` layout'e dabar net netiktų:
  su `cacheComponents` jis laužytų prerender'į (žr. landmines). Proxy = teisingas
  auth-gating sluoksnis.

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

- [x] **Cache invalidation hooks neimplementuoti.** `/meistrai`,
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

  **Sutvarkyta 2026-05-28 (branch `fix/cache-invalidation-hooks`):** pridėtas
  `src/lib/cache-invalidation.ts` (centralizuoti helper'iai
  `revalidateProviderCaches` / `revalidateReviewCaches`). Prijungta:
  - `/api/tiekejas/profilis` PUT/PATCH/DELETE → `revalidateProviderCaches(userId)`
    (tag'ai `providers`, `providers-listing`, `home-data`, `provider:user:${id}`)
  - `/api/paskyra/profilis` PATCH → tas pats, bet tik jei rolė `PROVIDER`
    (vardas rodomas tiekėjų kortelėse)
  - `moderateEntity` (`admin-actions.ts`) → profile/review/story approval IR
    reject invaliduoja atitinkamas sekcijas (anksčiau tik `requests` ant approve)
  - New ServiceRequest jau buvo prijungtas (`/api/requests/route.ts:223`)
  Pastabos: NOTES nurodė `/api/paskyra/profilis`, bet listingo duomenys realiai
  keičiami per `/api/tiekejas/profilis` — prijungti abu. Naudoti broad tag'ai
  (`providers`/`reviews`/`stories`), nes jie yra ant VISŲ reliuojančių cache'ų;
  specifiniai `:user:` tik kur turim userId.

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

## Taksonomija / filtrai

- [ ] **2026-05-28 — `/meistrai` kategorijų filtras grąžina 0, kol Phase 5 nesujungs tiekėjų su curated taksonomija.**
  Provider listingo filtras (`src/lib/provider-filters.ts`) lygina curated
  taksonomijos slug'us (pvz. `pr-buitines-paslaugos--valymo-paslaugos`), o tiekėjai
  vis dar susieti su senais paprastais slug'ais (`valymo-paslaugos`). Todėl
  pasirinkus bet kurią kategoriją rezultatų nėra. Miestų filtras šios problemos
  neturi (paprastas teksto sutapimas). Miestų + kategorijų **daugiapasirinkimo UI
  jau veikia** ir parašytas teisingai prieš curated slug'us — kategorijų filtravimas
  „atsibus" pats, kai Phase 5 sumigruos provider↔category linkus į tą taksonomiją.
  Sąmoningas sprendimas (2026-05-28) nedaryti laikino slug-tilto, palikti Phase 5.
  Aptikta diegiant miestų/kategorijų daugiapasirinkimą.

  **PATIKSLINTA + ATIDĖTA 2026-05-28 (NESKUBU, ne blokeris):** ištirta giliau.
  Paprastai: kategorijų sąrašas perdarytas 3 kartus, senų niekas neištrynė →
  3 sistemos (`categories.externalSource`):
  - `paslaugurinka-taxonomy` (3255, service) — picker'io/filtro šaltinis
    (`getServiceCategoryGroups` → `src/lib/service-categories.ts`). FORMOS jau
    naudoja šitą — NAUJI pick'ai teisingi.
  - `curated` (svc-*, 140) — senas Phase 1/3 tier
  - `paslaugos.lt` (840) — originalus importas
  DB linkai (faktai 2026-05-28): `provider_profile_categories` = 49
  paslaugurinka-taxonomy (OK) + 21 curated + 27 paslaugos.lt-root (migruotini);
  `service_requests` categoryId = 7 + 30 + 13. T.y. tik SENI duomenys liko ant
  senų sistemų → **vienkartinė migracija, ne ongoing**.
  **Fix = konsoliduoti visus provider/request linkus į paslaugurinka-taxonomy:**
  mapping old(curated/paslaugos.lt)→new (per `CategoryAlias` / vardo atitikimą;
  unmapped rankiniu būdu — paslaugos.lt `root` coarse → flag); manual SQL į
  `prisma/manual-migrations/`, user aplikuoja per Supabase (NE auto-apply),
  idempotent, dedupe (`[providerProfileId,categoryId]` unique). Po to patikrinti
  `checkEligibility`/`category-matching`. Template'as: `scripts/backfill-provider-categories.js`,
  `backfill-request-categories.js`. Pilnas executor promptas paruoštas 2026-05-28
  sesijoj (per worktree).
  **Deploy KARTU su multi-select filtro WIP** (commit `e17e73e`, lokaliai ant main,
  NEpush'inta): filtras be migracijos = 0; migracija be filtro = sena UI.
  **NB:** tai NE epiko „Phase 5" (= drop Supplier* lentelės + sujungti profilio
  puslapius). Tai atskiras kategorijų-filtro fix.
  **Statusas: ATIDĖTA sąmoningai 2026-05-28** — pre-existing (ne šios dienos
  greičio darbo pasekmė), neskubu, grįžti šviežia galva.

---

## Monetizacija

- [x] **2026-05-29 — Papildomų kategorijų atrakinimas už kreditus (laikinas). ĮGYVENDINTA.**
  Idėja iškilo gretimame darbe (AI profilio kūrimas + leadų atitikimas pagal
  kategorijas). Kontekstas: nuo 2026-05-29 AI picker'is profiliui saugo TIK
  konkrečias po-kategorijas (ne šaknis), o leadų atitikimas
  (`src/lib/category-matching.ts` → `expandToMatchSet`) plečiasi medžiu. Dėl to
  platus matomumas atsiranda tik kai teikėjas turi DAUG kategorijų → natūralus
  taškas monetizacijai + anti-spam filtrui.

  **Modelis (sutarta 2026-05-29):**
  - **Bazė nemokama ir nuolatinė** — AI parinktos 1–4 sritys (arba riba, pvz. 3)
    NIEKADA negalioja laikinai. Kitaip teikėjai iškristų visai.
  - **Papildomos sritys virš bazės = mokamos kreditais** (ta pati esama valiuta,
    NE nauja mėnesinė prenumerata — sąmoningai, nes Phase 4 atsisakyta
    subscription'ų; žr. lead-unlock modelį).
  - **Laikinas galiojimas:** atrakini kategoriją X laikui (mėnesiui / keliems);
    pasibaigus — vieta toje kategorijoje TIK pasislepia (leadai nustoja eiti),
    profilis ir kategorija NEIŠTRINAMI; galima atrakinti iš naujo. Kainos
    pakopos pagal trukmę (1 mėn = X kreditų, keli mėn = pigiau už mėn).
  - **Įspėjimas prieš pasibaigiant** (notifikacija), kad teikėjas spėtų pratęsti.

  **Kodėl ne paslaugos.lt būdas:** jie ima „nuomos" mokestį už buvimą sąraše
  (kaina pagal kategoriją + miestą, žr. paslaugos.lt/duk) — mokì iš anksto
  nepriklausomai nuo rezultato. Mūsų pay-per-lead draugiškesnis; kreditinis
  laikinas atrakinimas išlaiko VIENĄ valiutą ir vengia atskiros billing
  infrastruktūros (failed payments / churn / „kodėl nuskaitėt").

  **Apimtis (kai darysim — NE today):** (1) schema: kategorijos atrakinimo
  įrašas su `expiresAt` ant `provider_profile_categories` arba atskira lentelė;
  (2) `expandToMatchSet`/listing/notifikacijų užklausos turi gerbti aktyvias-vs-
  pasibaigusias kategorijas; (3) profilio editor UI — kurios sritys bazinės /
  apmokėtos / pasibaigę; (4) kreditų nuskaitymas + pakopos; (5) expiry cron +
  įspėjimo notifikacija; (6) edge case'ai (kas su jau atrakintais leadais kai
  kategorija baigiasi). Liečia pinigų kelią + gyvą DB su tikrais klientais →
  daryti su atskira schema/PR'u ir peržiūra, ne greitai.

  **ĮGYVENDINTA 2026-05-29.** Kas padaryta:
  - Schema: `provider_profile_categories.expiresAt` (null=bazinė/nuolatinė,
    ateitis=apmokėta aktyvi, praeitis=pasibaigusi/paslėpta) + `credit_transactions.categoryId`
    + tipas `CATEGORY_UNLOCK`. Migracija: `apply_migration add_category_unlock_fields`.
  - Kainodara (client-safe): `src/lib/category-pricing.ts` — `FREE_CATEGORY_LIMIT=4`,
    `CREDITS_PER_CATEGORY_MONTH=2`, `MAX_CATEGORY_MONTHS=12`.
  - `unlockCategory()` (`src/lib/credits.ts`) — atomiškai nuskaito kreditus,
    extend'ina `expiresAt` (stack'ina ankstyvą pratęsimą), rašo ledger. Endpoint:
    `POST /api/tiekejas/profilis/categories/unlock`.
  - Lazy expiry (be cron'o): `activeCategoryFilter()` (`category-matching.ts`)
    pritaikytas leadų listinge (server+API), notifikacijose, eligibility (unlock/
    response/copilot), public direktorijoje, profilio puslapyje, similar-providers,
    StatsGrid match-count.
  - Free-limit enforcement: `syncFreeCategories()` (`src/lib/provider-categories.ts`)
    naudojamas PUT profilio + onboarding PATCH — NIEKADA netrina apmokėtų eilučių,
    nemokamas riboja iki limito. Editor UI (`/tiekejas/profilis`) rodo bazines vs
    apmokėtas su galiojimo data + atrakinimo/pratęsimo kontrolę + balansą.
  - Onboarding confirm picker irgi ribotas iki `FREE_CATEGORY_LIMIT`.

  **Likę follow-up'ai (NE blokeriai):**
  - [ ] **10 „tik šaknis" teikėjų** (daugiausia TEST/DEMO + Denas, Lukas, Ona,
    gerasoras) turi TIK depth-0 kategorijas — sąmoningai palikti per valymą
    (`20260529_strip_root_categories_from_providers.sql`), kad netaptų tušti.
    Reikia priskirti realias po-kategorijas (AI re-categorize ar rankiniu būdu).
  - [ ] **Expiry įspėjimo notifikacija** prieš pasibaigiant (pvz. likus 3 d.) —
    reikėtų cron'o; korektiškumui nebūtina (matching tikrina `expiresAt` lazily),
    tik UX pratęsimui.

---

## Telegram botas (balso/teksto užklausos)

- [ ] **2026-05-29 — Balso transkripcijos formatas (OGG) nepatikrintas gyvai.**
  Telegram balso žinutės yra `audio/ogg` (Opus). `transcribeAudio()` dabar
  priima `format` param'ą (`src/lib/ai-transcribe.ts`), botas perduoda `"ogg"`
  (`conversation.ts` → `mimeToFormat`). NEAIŠKU, ar OpenRouter `input_audio`
  priima `format: "ogg"` — web naudoja `"wav"`. PIRMAS dalykas, kurį reikia
  patikrinti per gyvą botą: įrašyti balso žinutę ir pažiūrėti, ar transkripcija
  teisinga. Jei OpenRouter atmeta OGG — reiks konvertuoti į WAV (ffmpeg, sunku
  serverless) arba rasti palaikomą formatą.

- [ ] **2026-05-29 — Rate limit fail-open + per-naudotojo riba.**
  Botas naudoja `RATE_LIMITS.aiImprove` (15/val) per `telegram:<userId>`.
  Be Upstash (prod be `UPSTASH_*`) — per-instance memory, neefektyvu serverless.
  Botas yra neautentikuotas įėjimo taškas → įsitikinti, kad Upstash sukonfigūruota
  prod'e, kitaip galima AI kaštų abuse.

- [x] **2026-05-29 — `db:push` (telegram_sessions).** **Atlikta / nereikėjo
  2026-05-30:** patikrinta gyva DB — `telegram_sessions` lentelė jau egzistuoja
  ir struktūra tiksliai atitinka `TelegramSession` Prisma modelį (telegramUserId
  bigint PK, chatId, userId, state default 'idle', draft jsonb, phone, timestamps).
  Tas pats su kitais šakos schemos pakeitimais (`story_views`, `story_reactions`,
  `ai_touchpoint_configs`, `provider_profile_categories.expiresAt`,
  `service_requests.source`, `credit_transactions.categoryId`) — visi jau DB.
  `db:push` paleisti nereikėjo.

- [x] **2026-05-29 — Webhook neregistruotas.** **Atlikta 2026-05-30:** webhook
  registruotas į `https://www.paslaugurinka.lt/api/telegram/webhook` (www, ne apex
  — Telegram neseka 307 redirect'ų). `getWebhookInfo`: pending_update_count 0,
  jokios last_error, allowed_updates [message, callback_query]. Verifikuota
  end-to-end prieš prod: blogas secret → 401, teisingas → 200 (prod env
  `TELEGRAM_WEBHOOK_SECRET` sutampa su registruotu). `TELEGRAM_BOT_TOKEN` +
  `TELEGRAM_WEBHOOK_SECRET` patvirtinti production env. Registracija: prod merge
  (`feat/ai-openrouter-client` → main) deploy'intas, tada `pnpm telegram:set-webhook https://www.paslaugurinka.lt`.

- [x] **2026-05-30 — Admin matomumas: `/admin/telegram`.** Naujas puslapis +
  `GET /api/admin/telegram` (admin-gated kaip kiti `/api/admin/*`): konfig. sveikata
  (bot token, webhook secret, @username per `getBotInfo`), webhook būsena per
  `getWebhookInfo` (registruotas URL vs tikėtasi, laukiantys update'ai, paskutinė
  klaida), pokalbių statistika iš `telegram_sessions` (viso / susieta / aktyvūs
  juodraščiai, būsenų skirstinys, 25 naujausi) ir per Telegram paskelbti skelbimai
  (`service_requests.source="telegram"`: viso / 30 d. / 15 naujausių su moderacijos
  būsena). Pridėti `getWebhookInfo`/`getBotInfo` į `telegram/api.ts`; nav punktas
  layout'e. Live Telegram kvietimai try/catch — neparkrenta jei API nepasiekiamas.

- [x] **2026-05-30 — Admin valdymas (write actions) `/admin/telegram`.** Pridėtas
  `POST /api/admin/telegram` su 4 veiksmais: `set_webhook`/`delete_webhook`
  (setWebhook/deleteWebhook į `telegram/api.ts`, registruoja į `expectedWebhookUrl`
  = NEXTAUTH_URL/api/telegram/webhook), `toggle_bot` (kill switch — naujas
  `PlatformSettings.telegramBotEnabled` Boolean default true; webhook tikrina ir
  tyliai numeta update'us kai false), `reset_session` (state→idle, draft→DbNull) ir
  `send_message` (sendMessage konkrečiai sesijai pagal chatId). UI: kill-switch
  kortelė, webhook regist./šalinimo mygtukai, per-eilutės reset + žinutės mygtukai.
  **DB:** reikia pritaikyti `prisma/manual-migrations/add-telegram-bot-enabled.sql`
  (arba `db:push`) PROD DB — kol stulpelio nėra, `toggle_bot`/GET upsert mes klaidą.

- [ ] **Liko (Telegram):** per-chat_id rate-limit webhook lygmenyje (dabar throttle
  tik AI/foto per `from.id` conversation'e; webhook'as pats neturi atskiro limito).

- [ ] **2026-05-29 — Vienetiniai testai be runner'io.** `pnpm test:telegram`
  paleidžia `conversation.ts` state machine testus per ts-node (projekte nėra
  jest/vitest). Jei ateity dėsim test runner'į — perkelti čia.

- [ ] **2026-05-29 — Story peržiūrų/reakcijų valymas.** Story po 24 val. tik
  paslepiamos (`expiresAt`), bet neištrinamos, todėl `story_views` ir
  `story_reactions` eilutės kaupiasi neribotai. Kai story ištrinama — kaskaduoja
  (onDelete: Cascade), bet pasibaigusios lieka. Vertėtų cron'ą (pvz. prie
  `cleanup-pending-requests`), kuris prune'ina views/reactions, kai susijusi
  story pasibaigusi senesnė nei N dienų.

---

## SEO architektūros planas — „idealūs nauji puslapiai" (2026-05-30)

**Tikslas:** kiekvienas naujai sugeneruotas puslapis (tiekėjo profilis, kategorijos
puslapis, skelbimas, SEO turinys) turi būti SEO-teisingas *by construction* — ne
todėl, kad kažkas patikrino, o todėl, kad šablonas negali sugeneruoti blogo.

### Kontekstas — kodėl dabar
Sitemap pataisius (`&` → `&amp;`) Semrush pagaliau nuskenavo 100 psl. (vietoj 60)
ir atsivėrė antras klaidų sluoksnis: faceted katalogo URL'ai (`/meistrai?category=*`)
su identišku title (#6 dublikatai 23→42), thin content (#117: 37), nevalidi
LocalBusiness schema (35). Šitie ne regresija — tik dabar matomi, nes crawler'is
prasiskverbė giliau. Bazinis auditas vis dar `jsRendering: DISABLED` (įjungti
Semrush projekte prieš kitą rerun, kad turinio signalai būtų teisingi).

### Pamatinis sprendimas — indeksuojama taksonomija
Google oficialiai: `rel=canonical` faceted URL'ams yra „less effective long term"
ir gali būti ignoruojamas → **canonical-į-bazinį NĖRA pagrindinė strategija.**
Teisinga — **slenkstinė (threshold) indeksacija**:

| URL tipas | Sprendimas |
|---|---|
| `/meistrai` (bazinis) | index, self-canonical |
| `/meistrai?category=X` (tik kategorija) | dinaminis + index (reali paklausa, kategorijų dešimtys) |
| kategorija × miestas | **slenkstis**: ≥3–5 tiekėjų IR ≥300 žodžių → dinaminis+index; kitaip `noindex` + NE į sitemap |
| `?welcome=`, `?inquiry=`, sort, pagination | visada `noindex` / robots.txt block |
| tiekėjo profilis | index tik jei praėjo „brandos vartus" (žr. žemiau) |

> Strateginis klausimas spręsti: dabartiniai combo'ai sitemap'e veda į
> `/uzklausos?...` (skelbimus = trumpalaikiai). SEO prasme patvaresnis turtas yra
> `/meistrai?category=...` (tiekėjų kategorijos). Greičiausiai indeksuoti reikia
> pastaruosius, ne skelbimų sąrašus.

### „Brandos vartai" (kad nebūtų thin content)
Puslapis indeksuojamas tik jei: **≥300 prasmingų žodžių, ≥3 unikalūs duomenų
taškai, validi schema, self-canonical, vidinės nuorodos.** Žemiau — `noindex` +
neįtraukiam į sitemap. Įvykdo barjerą → automatiškai įsijungia.

### Research sprendimai (2026-05-30) — užfiksuota prieš implementaciją
- **Q1 — kuri taksonomija = SEO turtas?** → **`/meistrai?category` (+miestas).**
  `/uzklausos` combos → `noindex` (transient). Pagrindas: marketplace SEO
  playbook'ai — kategorijų puslapiai gaudo head-term paklausą ir yra STABILŪS;
  skelbimai trumpalaikiai → turinys nyksta → thin/flip-flop. Crawl budget'as
  neturi būti eikvojamas nykstančiam turiniui. (journeyh.io, origami-marketplace,
  Search Engine Land.)
- **Q2 — sub-slenkstis?** → **`noindex` + 200 + histerezė.** NE redirect/410
  (puslapis turi realią vartotojo vertę, ne permanentinis). Histerezė
  (`enableAt=3`, `disableBelow=2`) prieš index⇄noindex flip-flop, kurį Google
  baudžia. (venue.cloud, goinflow.)

### Build planas (eiliškumas — efektas mažėjančia tvarka)
1. [ ] Užfiksuoti indeksuojamą taksonomiją (lentelė viršuje) — pamatas.
2. [x] **Centrinis SEO kontraktas — `src/lib/seo/page-seo.ts`** (`buildPageSeo`,
       diskriminuojama `SeoInput` unija). Prijungti route'ai: `/meistrai/[slug]`,
       `/meistrai` (+`?category`/`+location` dinamiškai), `/uzklausos` (+combos).
       Garantuoja: netuščias+unikalus title, description (clamp 157), canonical,
       eksplicitiškas `robots`, OG/twitter. Verdiktas IR metadata gimsta kartu.
3. [x] **Indeksavimo vartai — `src/lib/seo/index-gate.ts`** (`passesIndexGate` su
       histerezė, `UTILITY_PARAMS`). `/uzklausos` combos → `noindex`.
       `/meistrai?category` → `noindex` KOL nėra category-specific server turinio
       (`wordCount=0` šią sesiją); įsijungs su step 5. Nuima dublikatus #6/#15 ir
       thin-content #117 (jų šaltinis buvo `/uzklausos?...` sitemap combos).
4. [x] **Sitemap** = statiniai + profiliai + vartus praėję kategorijų URL
       (`/meistrai?category=`), filtruojami per tą patį `buildCategoryView` +
       `buildPageSeo` verdiktą. `/uzklausos` combos visam laikui `noindex` →
       niekada sitemap'e. City combos kol kas neįtraukiami (category-only =
       stabiliausias turtas).
5. [x] **Dinaminis kategorijų turinys** — `src/lib/seo/category-content.ts`
       (deterministinis prozos builder'is) + `category-view.ts` (bendras
       deriveris puslapiui IR sitemap'ui). `/meistrai?category` dabar turi
       unikalų H1 + ~220–270 žodžių category-specific server turinį → praeina
       vartus su ≥3 tiekėjų ir įsijungia index automatiškai.
       **`minWords` 300→200**: lietuvių k. kompaktiškesnė + `wordCount`
       neįskaito tiekėjų kortelių (papildomas turinys); pirminis thinness guard
       lieka ≥3 tiekėjai.

6. [x] **LocalBusiness schema** — nevalidi (be `image`) nebeemituojama visai
       (invalid blogiau nei jokia). `buildLocalBusinessSchema` grąžina `null`,
       kai nėra `image`; render guard praleidžia bloką. Breadcrumb/Review lieka.
       - [ ] **Backfill (kažkada):** profiliai be `image` neturi LocalBusiness
         schemos → praranda rich-result šansą. Vertėtų paskatinti/užpildyti hero
         nuotraukas (arba generuoti placeholder OG vaizdą) ir tada schema
         įsijungs automatiškai. Galimai pridėti `telephone`/`streetAddress`
         pilnesnei schemai, jei turėsim tuos duomenis.

7. [x] **CI SEO gate** — `scripts/seo-check.ts` (`pnpm seo:check [baseUrl]`).
       Crawl'ina po 1 URL/route tipą (iš sitemap'o atranda profilio + kategorijos
       pavyzdžius) ir tikrina: 1×`<title>` netuščias+unikalus, `description`,
       `canonical`, 1×`<h1>`, JSON-LD parse+`@context`; ir kad sitemap URL nėra
       `noindex`. Exit 1 → tinka CI / post-deploy. Default base = prod www.
       - Paleidus prieš prod (dar be šio deploy) lieka 3 canonical „failai"
         (`/`, `/meistrai`, `/uzklausos`) — būtent tai, ką šis deploy ištaiso;
         po deploy gate turi būti žalias. Home gavo self-canonical.

### SEO epopėja — BAIGTA (2–7). Liko tik backfill follow-up'ai
- LocalBusiness `image` backfill (žr. step 6 pažymą).
- Periodinis prod `pnpm seo:check` (pvz. cron po deploy).
5. [ ] Dinaminiai title/description/turinys kategorijų puslapiams
       (tiekėjų sk., top tiekėjai, kategorijos aprašas — unikalumui).
6. [ ] LocalBusiness schema: 35 nevalidūs — privalomi laukai (address/image)
       arba neįdedam schemos visai (nevalidi blogiau nei jokia).
7. [ ] CI SEO gate (po 1 URL/tipą: title yra+unikalus, 1×H1, description,
       canonical, JSON-LD validi) + periodinis prod crawl naujiems URL.

### Šios sesijos pataisos (jau prod, baseline kitam palyginimui)
sitemap INVALID→HAVE_HEALTHY; missing H1 24→1; duplicate content 23→11;
profilių schema 0→ (LocalBusiness 22 / Review 49 / Breadcrumb 22 validūs);
slug nuorodos vietoj cuid (commit'ai `87b643f`, `aed95d3` ant `main`).

### Šaltiniai
- Google: developers.google.com/crawling/docs/faceted-navigation
- Search Engine Land — faceted navigation guide
- journeyh.io — Marketplace SEO Playbook 2026
- getpassionfruit.com — Programmatic SEO Without Traffic Loss (2025)

## Provider profile gating (2026-05-30)
- "Tapti meistru" nebekuria tuščio ProviderProfile ir nebeflipina rolės — rolė PROVIDER + starter kreditai dabar suteikiami tik realiai sukūrus profilį (ai-generate / profile-complete create šakoje). Route /api/tiekejas/tapti pašalinta.
- Dashboard /tiekejas rodo NoProviderProfile, kai nėra profilio ARBA profilis tuščias (be description ir be enrichedAt) — laikina apsauga seniems prod klientams su tuščiomis eilutėmis.
- TODO (DB cleanup): vienkartinis skriptas išvalyti senas tuščias ProviderProfile eilutes (description IS NULL AND enrichedAt IS NULL AND images = '{}') + grąžinti tuos userius į role=CLIENT, jei jie nieko nesukūrė. Atsargiai — realūs duomenys.

## Routing v4.1 + golden eval (2026-06-11)
- `pnpm test:routing-all` — visa routing testų grandinė (7 rinkiniai, įsk. golden eval per 300 labeled).
- Golden eval likutis (5 harmful drops, bound ≤5 `scripts/routing-eval-golden.ts`): visi už teksto įrodymo ribų
  (2× įrodymas tik prieduose: 3601992, 3409111; 3× semantinė inferencija "smulkus darbas"/"fasado gretimybė":
  4041708, 2762303, 4042312). Tai Category Intelligence review-signalo darbas — kai bus TS portas, pajungti kaip
  review prioritetą, NE kaip selektorių.
- `reikia_kelių_specialistų` tag'as: v4 emituoja mechaniškai (≥2 kategorijos), žmogus — tik tikriems multi-trade
  projektams (only-v4 223 vs both 62). Jei tag'ą naudosim UI/notifikacijoms — peržiūrėti semantiką.
- Recall lubos: 89 gold label'iai iš golden-300 iš viso nėra tarp kandidatų — v4 Phase 1 tik filtruoja, nepri-
  deda. Tai Phase 2 (name→id mapping jau paruoštas taxonomy-map.ts) scope'as.

## Supabase advisors + Speed Insights (2026-06-11)
- Security advisors 38→0: RLS įjungtas telegram_login_tokens / routing_decision_logs / webhook_events;
  visoms server-only lentelėms pridėta explicit deny policy `server_only_no_client_access`
  (restrictive, anon+authenticated, false) — elgsenos nekeičia, Prisma (owner) RLS apeina.
- SVARBU: nauja lentelė schema'oje (pvz. routing_review_items šioje šakoje) po `db push` gaus
  RLS-disabled ERROR alertą — po push paleisti: `alter table ... enable row level security;`
  + tą pačią deny policy. Realtime lentelėms (messages/notifications/responses/direct_inquiries)
  deny policy NEdėti — jos turi tikras SELECT policies.
- Performance: 12 FK indeksų sukurta (Prisma vardais, @@index suvesta į schema.prisma).
- Liko ~37 "unused index" INFO — advisory; dalis nauji (ką tik sukurti), dalis naujų feature'ų.
  Peržiūrėti po ~4 sav. realios apkrovos; kandidatas drop'ui: request_views_requestId_idx
  (dubliuoja @@unique([requestId, providerId]) leading stulpelį).
- Perf po Semrush CWV audito (0% Good): supabase-js -> dynamic import (tik realtime
  vartotojams), gtag -> lazyOnload, Lora preload:false, Inter display:optional
  (LCP fiksavosi font-swap momentu), /registruotis CLS 0.208 -> 0 (Suspense be
  fallback). Lighthouse devtools-throttled: home 98/100, LCP 2.2s. NEGRAZINTI
  static supabase-js importu i client komponentus - tai +60KB visiems puslapiams.

## Taksonomijos dedup (2026-06-27) — STAGE 1 + STAGE 2 padaryta

- [x] **Stage 1 — 712 „lengvu" dublikatu grupiu sulieta** (prod, per MCP).
      Migracija: `prisma/manual-migrations/20260627_dedup_easy_category_groups.sql`.
      Aktyvios service kategorijos 3255 -> 2098; dublikatu kopijos 1313 -> 156;
      grupes 820 -> 108; 0 orphan'u; 7/9 realiu nuorodu perkelta. Validacija
      `pnpm test:routing-all` PASS (golden eval invariantai laikosi, harmful
      drops 5/<=5). Backup'ai prod'e: `_backup_categories_20260627`,
      `_backup_dedup_refs_20260627`, map: `_dedup_map_easy`.
- [x] **Stage 2 — 108 „sunkios" grupes (156 kopijos) sulieta** (prod, per MCP,
      2026-06-27). Migracija: `prisma/manual-migrations/20260627_dedup_hard_category_groups.sql`.
      Vienas set-based pass: global map copy->canon (taisykle + 7 override'ai),
      tad „giliausi-pirma" reparenting susitraukia i 1 UPDATE (map rodo tiesiai i
      isliekancius). Repoint 3 nuorodos (visos provider_profile_categories; 2 —
      tiekejas jau turi kanonine -> delete dublio, 1 — Pagalbiniai darbininkai
      perkelta i Statybos kanonine) + reparent 292 vaiku + deactivate 156 kopiju.
      Aktyvios service kat. 2098 -> 1942 (= unikalus vardai); 0 dublikatu grupiu;
      0 orphan'u. Validacija `pnpm test:routing-all` PASS (harmful drops 5/<=5).
      Backup'ai prod'e: `_backup_categories_dedup2_20260627`,
      `_backup_dedup2_ppc_20260627` (rollback = 1 UPDATE is backup). Override'ai
      (patvirtinti): Kompiuteriu remontas / Interneto svetainiu kurimas / IT
      specialistai -> Internetas, IT; Grafikos dizaineriai -> Reklama; Pagalbiniai
      darbininkai -> Statybos; Dietologai -> Sveikata; Stiklo konstrukcijos -> Statybos.
- [ ] **Alias'ai senu slug'u** (1313) atideti kartu — neaisku, ar routingas
      naudoja `category_aliases` ar lentele `l`; issiaiskinti pries iterpiant.
      Matchingui NEREIKIA (nuorodos perkeltos fiziskai); tik senu `?category=`
      URL'u testumui.
