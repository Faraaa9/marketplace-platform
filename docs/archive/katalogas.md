# Importuotas katalogas — archyvas

**Statusas:** Išjungta 2026-05-26
**Kodėl:** Scrape'inta duomenų kokybė per žema (mažos nuotraukos, trūksta info), CTA ant `/meistrai` nepateisino vietos. Vartotojo srautas vis tiek labiau remiasi į user-driven user request kūrimą, ne į katalogo naršymą.

> Susijusios istorinės dokumentacijos:
> - [`claim-planas-marketplace-architektura.md`](claim-planas-marketplace-architektura.md) — pilnas pradinis architektūros planas (872 eilutės)
> - [`CLAIM_V1_TESTING.md`](CLAIM_V1_TESTING.md) — claim flow manual test scenarijai (113 eilutės)

---

## TL;DR

Visa kataloko infrastruktūra **lieka kode ir DB**, bet visi user-facing puslapiai → `notFound()` (404), visi API → `{ status: 404 }`. Atgaivinimui pakanka `git revert` arba 16 failų rankinio atstatymo.

**Vienintelė išimtis:** scrape'inta **kategorijų taksonomija** (`Category` + `CategoryAlias`) lieka **gyva** — ji yra pagrindinis visos platformos taksonomijos šaltinis (Taxonomy Unification Epic, Phases 1-4).

---

## Architektūra (data flow)

```
                       ┌──────────────────────┐
                       │   paslaugos.lt       │
                       │   (3rd-party site)   │
                       └──────────┬───────────┘
                                  │
                                  │ paslaugos-crawler
                                  │ (atskiras Node įrankis,
                                  │  ne šiame repo)
                                  ▼
                       ┌──────────────────────┐
                       │ SupplierSource       │
                       │ Snapshot             │ ◀── istorinis scrape audit'as
                       └──────────┬───────────┘
                                  │
                                  ▼
                       ┌──────────────────────┐
                       │  SupplierRecord      │
                       │  status:             │
                       │   - unclaimed        │
                       │   - claimed          │
                       │   - rejected         │
                       └──┬─────────────┬─────┘
                          │             │
                          ▼             ▼
              ┌──────────────────┐  ┌──────────────────┐
              │SupplierCategory  │  │  ClaimRequest    │
              │     Link         │  │  (perimimo       │
              └────────┬─────────┘  │   prašymai)      │
                       │            └──────────────────┘
                       ▼
              ┌──────────────────┐
              │    Category      │  ◀── LIVE: pagrindinė
              │  (taksonomija)   │      platformos taksonomija
              └──────────────────┘
```

### Tiesioginiai vartotojų sąlyčio taškai (visi išjungti)

| Maršrutas | Paskirtis |
|---|---|
| `/meistrai/katalogas` | Importuotų tiekėjų sąrašas (filtruojamas) |
| `/meistrai/katalogas/[slug]` | Vieno tiekėjo detalė + „Tai jūsų įmonė?" CTA |
| `/claim/[slug]` | Forma claim'inimo prašymui (email arba rankinis) |
| `/claim/verify` | Email patvirtinimo landing'as |
| `/tiekejas/katalogas/[slug]/redaguoti` | Claim'inęs tiekėjas redaguoja perimtą profilį |

---

## Claim flow (sequence)

```
   User              /claim/[slug]      /api/claims          Email           /api/claims/verify    /api/admin/claims/[id]/approve
    │                      │                  │                 │                     │                          │
    │ click "Perimti" ────▶│                  │                 │                     │                          │
    │                      │                  │                 │                     │                          │
    │                      │  ClaimForm     ──┼─▶ create token ─┼─▶ send email ──────▶│                          │
    │                      │  POST            │                 │                     │                          │
    │                      │                  │                 │                     │                          │
    │  ────────────────  PATH A: EMAIL VERIFY  ──────────────── │                     │                          │
    │                      │                  │                 │ user clicks link    │                          │
    │                      │                  │                 │                     │ verify token             │
    │                      │                  │                 │                     │ markAsVerified           │
    │                      │                  │                 │                     │ AUTO-approve             │
    │                      │                  │                 │                     │   ⇣                      │
    │                      │                  │                 │                     │ create User              │
    │                      │                  │                 │                     │ + ProviderProfile        │
    │                      │                  │                 │                     │ + transfer Supplier      │
    │                      │                  │                 │                     │   Record data            │
    │                      │                  │                 │                     │                          │
    │  ────────────────  PATH B: MANUAL REVIEW ──────────────────────────────────────────────────────────────────│
    │                      │                  │                 │                     │           admin reviews ─│
    │                      │                  │                 │                     │           → approve     ▶│
    │                      │                  │                 │                     │              (or reject) │
    │                      │                  │                 │                     │                          │
    │                      │                  │                 │                     │ create User              │
    │                      │                  │                 │                     │ + ProviderProfile etc.   │
```

**Pastaba:** rejected claim'as palieka `SupplierRecord` `unclaimed` būsenoje. Tas pats supplier'is gali būti claim'inamas dar kartą kito asmens.

**Cron:** `/api/internal/claims/expire` (POST) — periodiškai expir'ina nepatvirtintus claim'us po jų `expiresAt` (default ~72h). Buvo iškviečiamas Vercel Cron'u (jei `vercel.json` ar `cron` config dar yra — pasitikrinti).

---

## Failų inventorius

### Lieka GYVAS (taksonomija — neliesti)

| Failas | Eil. | Paskirtis |
|---|---:|---|
| `src/lib/imported/category-repository.ts` | 192 | Category lookup'ai DB lygiu |
| `src/lib/imported/category-service.ts` | 140 | Category public API (stats, by-slug, children) |
| `src/app/api/categories/route.ts` | — | HTTP endpoint, naudojamas user request kūrime ir naršyme |
| `Category`, `CategoryAlias` (Prisma) | — | Lentelės su `externalSource="paslaugurinka-taxonomy"` |

### Užšaldyti kaip dead code (nešaukiami, bet kodas lieka)

| Failas | Eil. | Naujas turinys |
|---|---:|---|
| `src/lib/imported/supplier-repository.ts` | 103 | Nepakeistas — niekas nešaukia |
| `src/lib/imported/supplier-service.ts` | 153 | Nepakeistas — niekas nešaukia |
| `src/lib/imported/supplier-update.ts` | 46 | Nepakeistas |
| `src/lib/imported/supplier-access.ts` | 89 | Nepakeistas. `attachIdentityToUserByEmail()` jau seniai no-op stub'as; `auth.ts` ją tebevadina (saugu) |
| `src/lib/imported/claim-repository.ts` | 346 | Nepakeistas |
| `src/lib/imported/claim-service.ts` | 299 | Nepakeistas |
| `src/lib/imported/token.ts` | 28 | Nepakeistas |
| `src/app/meistrai/katalogas/page.tsx` | — | **Stub'as:** `notFound()` |
| `src/app/meistrai/katalogas/[slug]/page.tsx` | — | **Stub'as:** `notFound()` |
| `src/app/tiekejas/katalogas/page.tsx` | — | **Stub'as:** `notFound()` |
| `src/app/tiekejas/katalogas/[slug]/redaguoti/page.tsx` | — | **Stub'as:** `notFound()` |
| `src/app/claim/[slug]/page.tsx` | — | **Stub'as:** `notFound()` |
| `src/app/claim/[slug]/ClaimForm.tsx` | — | Nepakeistas — orphan komponentas |
| `src/app/claim/verify/page.tsx` | — | **Stub'as:** `notFound()` |
| `src/app/claim/verify/ClaimAccountStep.tsx` | — | Nepakeistas — orphan komponentas |
| `src/app/api/suppliers/route.ts` | — | **Stub'as:** GET → 404 |
| `src/app/api/suppliers/[slug]/route.ts` | — | **Stub'as:** GET, PUT → 404 |
| `src/app/api/claims/route.ts` | — | **Stub'as:** GET, POST → 404 |
| `src/app/api/claims/setup-account/route.ts` | — | **Stub'as:** POST → 404 |
| `src/app/api/claims/verify/route.ts` | — | **Stub'as:** GET, POST → 404 |
| `src/app/api/admin/claims/[id]/approve/route.ts` | — | **Stub'as:** POST → 404 |
| `src/app/api/admin/claims/[id]/reject/route.ts` | — | **Stub'as:** POST → 404 |
| `src/app/api/internal/claims/[id]/approve/route.ts` | — | **Stub'as:** POST → 404 |
| `src/app/api/internal/claims/[id]/reject/route.ts` | — | **Stub'as:** POST → 404 |
| `src/app/api/internal/claims/expire/route.ts` | — | **Stub'as:** POST → 404 |

### Modifikuoti (banner / sitemap)

| Failas | Pakeitimas |
|---|---|
| `src/app/meistrai/page.tsx` | Pašalintas „Importuotas katalogas" banner blokas + `Database` lucide importas |
| `src/app/sitemap.ts` | Pašalintas `/meistrai/katalogas` static entry, `supplierSlugs` DB query, `supplierEntries` blokas |

### DB schema (visi lieka — 0 SQL pakeitimų)

| Modelis | Naudojimas |
|---|---|
| `SupplierRecord` | Frozen — duomenys lieka, niekas nešaukia |
| `SupplierCategoryLink` | Frozen |
| `SupplierSourceSnapshot` | Frozen |
| `SupplierIdentity` | Frozen |
| `ClaimRequest` | Frozen |
| `ProviderProfile.sourceType` (`self_created`\|`imported`) | Live, bet visi nauji = `self_created` |
| `ProviderProfile.externalSource`, `externalSourceUrl` | Live, bet niekur nenustatomi naujai |
| `ModerationLog` | Live (naudojama ne tik claim'ams) |

---

## Atgaivinimo playbook

### Greitas kelias (rekomenduoju)

```bash
git log --oneline --all -S "Catalog feature disabled 2026-05-26" | head -1
git revert <commit-hash>
```

Tai atstato visus 16+ failų pakeitimus vienu commit'u. Po revert'o:

1. **Pasitikrinti scrape'o aktualumą** — `SupplierRecord.updatedAt` reikšmės bus senos. Jei reikia naujesnių duomenų, paleisti `paslaugos-crawler` (atskiras Node įrankis, ne šiame repo).
2. **Pasitikrinti DB schema'ą** — ar po išjungimo periodo nebuvo schema migracijų, kurios paveiktų `SupplierRecord`/`ClaimRequest`. Jei buvo — patobulinti repository sluoksnį.
3. **Cron'o atstatymas** — patikrinti `vercel.json` ar yra `crons` entry'as `/api/internal/claims/expire`. Jei ne — pridėti.
4. **Manual smoke test'as** — vykdyti scenarijus iš [`CLAIM_V1_TESTING.md`](CLAIM_V1_TESTING.md).

### Rankinis kelias (jei revert'as susijaukia su nekonfliktuojančiais pakeitimais)

1. Atstatyti pages iš git history:
   ```bash
   git show <pre-disable-commit>:src/app/meistrai/katalogas/page.tsx > src/app/meistrai/katalogas/page.tsx
   # pakartoti su kitomis 5 page.tsx'omis
   ```
2. Atstatyti API routes (10 failų — analogiškai)
3. Atstatyti banner ant `src/app/meistrai/page.tsx`:
   - Re-import `Database` iš `lucide-react`
   - Įdėti banner bloką po `ProvidersExperience` komponento, prieš „Bottom CTA"
4. Atstatyti `src/app/sitemap.ts`:
   - `staticEntries` array'uje pridėti `/meistrai/katalogas`
   - `Promise.all` įdėti `supplierSlugs` query'į
   - Sukurti `supplierEntries` mapping'ą + pridėti į `all` array

---

## Kas turėtų pasikeisti prieš v2 atgaivinimą

Pagrindinės priežastys, kodėl išjungta:

1. **Scrape kokybė** — `heroImageUrl` ir `galleryUrls` buvo per maži (originalai iš paslaugos.lt thumbnail dydžio). v2 reikalavimas: full-resolution image scrape arba enrichment per Google Places / VAT registry.
2. **Duomenų pilnumas** — daug įrašų be `phonePublic`, `emailPublic`, miestelio. v2 reikalavimas: minimum-field gating prieš įtraukimą į katalogą.
3. **Vartotojo intent'as** — `/meistrai/katalogas` lankytojų buvo mažai (banner CTR žemas). v2 reikalavimas: testuoti link'avimą iš kategorijų puslapių, kur user'is jau ieško tiekėjo.
4. **Claim flow konversija** — niekas neperėjo testavimo metu (vienintelį testą atliko pats founder'is). v2 reikalavimas: outbound email kampanija scrap'intiems tiekėjams + onboarding asistentas.

---

## „Kas nepalikta" patikrinimas

Šie dalykai **NEBELIKO** ir nereikalingi atgaivinimui:
- Frontend CTA arba navigation link'ai į `/meistrai/katalogas` — neegzistuoja
- Banner sitemap'e — neegzistuoja
- Cron'o trigger'is `claims/expire` — gali būti palikęs `vercel.json` (pasitikrinti)
- Email šablonai claim verify — gali būti palikę `emails/` direktorijoje (frozen, OK)

Visi „palikta funkcionalumas" yra **kodo lygyje**, ne user-facing.
