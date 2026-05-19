# Claim planas: AI-first claimable marketplace architektūra

## Esmė

Modelio esmė:
- viešai matomas paslaugų tiekėjų sluoksnis
- nepatvirtinti profiliai
- claim mechanizmas
- po claim tiekėjas gauna pilną AI puslapį, inbox, leadus, mini CRM
- klientas ateina ne „žiūrėti katalogo“, o greitai gauti tinkamą pasiūlymą

Ši architektūra sukurta taip, kad nuo pirmos dienos būtų galima:
- surinkti viešus įrašus
- generuoti landingus
- leisti claiminti
- priimti užklausas
- siųsti užklausas tiekėjams
- matuoti konversiją
- vėliau lengvai pridėti AI sluoksnį ir premium funkcijas

---

## 1. Produkto branduolys

Sistemą reikėtų dalinti į 6 branduolinius modulius.

### A. Public Directory
Viešų profilių sluoksnis.

Kas ten gyvena:
- paslaugų kategorijos
- paslaugų tiekėjų įrašai
- miestai / aptarnavimo zonos
- SEO landing page’ai
- nepatvirtinto / patvirtinto profilio būsena

### B. Claim Engine
Profilio perėmimo / patvirtinimo mechanizmas.

Kas ten gyvena:
- claim tokenai
- verifikacijos metodai
- ownership status
- audit trail

### C. Lead Engine
Kliento užklausos surinkimas ir nukreipimas.

Kas ten gyvena:
- brief formos
- AI brief normalizavimas
- lead scoring
- routing taisyklės
- supplier matching

### D. Supplier Workspace
Claiminęs tiekėjas gauna savo mini valdymo centrą.

Kas ten gyvena:
- inbox
- leadai
- pasiūlymų ruošiniai
- AI atsakymų generatorius
- darbo valandos / zona / paslaugos
- mini analytics

### E. Content / AI Engine
Generuoja ir prižiūri viešą turinį.

Kas ten gyvena:
- neutral summaries
- landing page sekcijos
- FAQ
- regioniniai puslapiai
- pasiūlymų juodraščiai
- SEO tekstų generatorius

### F. Trust / Compliance Layer
Kad visa sistema nesprogtų nuo claim, spam ir ginčų.

Kas ten gyvena:
- audit log
- moderation
- abuse detection
- duplicate merge
- takedown / dispute flow
- source provenance

---

## 2. Vartotojų tipai

Sistemoje bus 4 pagrindiniai actor’iai.

### 1. Visitor / Buyer
Žmogus, kuris ieško paslaugos.

Jam reikia:
- greitai aprašyti poreikį
- pamatyti tinkamus tiekėjus
- gauti 1–3 normalius pasiūlymus
- turėti pasitikėjimo ženklus

### 2. Unclaimed Supplier
Tiekėjas, kuris dar neperėmė profilio.

Jis turi:
- ribotą viešą profilį
- claim CTA
- jokio pilno dashboardo

### 3. Claimed Supplier
Pilnai aktyvus tiekėjas.

Jis turi:
- profilio valdymą
- lead inbox
- AI tools
- konversijų statistiką
- premium opcijas

### 4. Admin / Operations
Vidinis operatorius.

Jam reikia:
- matyti claim ginčus
- tvirtinti red flag atvejus
- jungti / skaidyti dublikatus
- valdyti kategorijas
- prižiūrėti SEO landingus
- stebėti kokybę

---

## 3. Aukšto lygio duomenų modelis

Čia yra tikras branduolys. Jei šitą teisingai pasidarysi, paskui viskas augs normaliai.

### `categories`
```ts
id
name
slug
parent_id
root_id
depth
is_active
sort_order
```

### `locations`
```ts
id
name
slug
type // city, district, region
parent_id
```

### `supplier_records`
Tai viešas tiekėjo įrašas, nepriklausomai nuo claim statuso.

```ts
id
display_name
slug
status // unclaimed, claimed, suspended, hidden
source_type // imported, self_created, merged
canonical_source_url
short_summary
description
phone_public
email_public
website_url
logo_url
cover_image_url
is_verified
claim_status // none, pending, claimed, disputed
created_at
updated_at
```

### `supplier_identities`
Kas iš tikro valdo profilį.

```ts
id
supplier_record_id
user_id
ownership_status // owner, manager, pending, rejected
verification_method // email_domain, otp, dns, document, manual
verified_at
```

### `supplier_category_links`
```ts
id
supplier_record_id
category_id
is_primary
confidence_score
```

### `supplier_location_links`
```ts
id
supplier_record_id
location_id
coverage_type // based_in, serves, remote
```

### `supplier_source_snapshots`
Čia labai svarbu claimable modeliui.

```ts
id
supplier_record_id
source_name
source_url
raw_title
raw_text
raw_metadata_json
captured_at
hash
```

Tai leidžia:
- žinoti iš kur atsirado įrašas
- atsekti pakeitimus
- turėti audit trail
- saugiai regeneruoti AI tekstus

### `claim_requests`
```ts
id
supplier_record_id
requested_by_email
requested_by_user_id
verification_method
status // pending, approved, rejected, expired
token_hash
expires_at
submitted_evidence_json
review_notes
```

### `buyer_requests`
```ts
id
buyer_name
buyer_email
buyer_phone
category_id
location_id
title
description
budget_min
budget_max
urgency
status // new, matched, closed, spam
source_page_url
normalized_brief_json
created_at
```

### `request_matches`
Ryšys tarp užklausos ir tiekėjų.

```ts
id
buyer_request_id
supplier_record_id
match_score
status // queued, sent, viewed, replied, accepted, rejected
sent_at
viewed_at
replied_at
```

### `supplier_messages`
```ts
id
buyer_request_id
supplier_record_id
direction // inbound, outbound, system
channel // dashboard, email, sms, phone_note
body
ai_generated
created_at
```

### `supplier_profiles`
Pilnas profilis po claim.

```ts
id
supplier_record_id
headline
about_text
services_text
faq_json
portfolio_json
pricing_json
business_hours_json
response_time_stats_json
```

### `reviews`
Tik jei vėliau kursi savo review sistemą.

```ts
id
supplier_record_id
buyer_request_id
rating
review_text
status
created_at
```

### `audit_logs`
```ts
id
actor_user_id
entity_type
entity_id
action
before_json
after_json
created_at
```

---

## 4. Sistemos architektūra per servisus

Jei statyčiau normaliai, daryčiau taip:

### Frontend
- Next.js
- App Router
- SSR/ISR viešiems SEO puslapiams
- dashboardas claimintiems tiekėjams
- atskiras admin panel

### Backend API
- NestJS arba tvirtas Next.js API + workers
- auth
- claim
- supplier
- category
- request
- messaging
- ai generation
- moderation

### Database
- Postgres
- pilnai normalizuoti ryšiai
- trigram search
- full-text search
- materialized views paieškai jei reikės

### Queue / Workers
- BullMQ / Redis
- jobai:
  - crawl/import
  - AI summary generation
  - claim email send
  - lead routing
  - notification delivery
  - duplicate detection
  - SEO page regeneration

### Object Storage
- S3 / MinIO
- logo
- cover
- claim docs
- AI generated assets

### Search Layer
Pradžiai gali užtekti Postgres.
Vėliau:
- Meilisearch arba Typesense
- paieškai pagal:
  - kategoriją
  - miestą
  - vardą
  - paslaugos tipą

---

## 5. Puslapiai ir produkto paviršius

### Vieši puslapiai

#### `/paslauga/[category]/[city]`
Pvz:
- `/elektrikai/vilnius`
- `/santechnikai/kaunas`

Rodo:
- tiekėjų sąrašą
- AI suformuotą landing intro
- brief formą
- FAQ
- claim CTA jei nepatvirtinti profiliai

#### `/supplier/[slug]`
Viešas tiekėjo profilis.

Jei neclaimintas:
- bazinis profilis
- neutral summary
- service/location info
- „Šis profilis nepatvirtintas“
- „Esate šio verslo atstovas? Claim“

Jei claimintas:
- pilnas profilis
- AI landing style sekcijos
- portfolio
- quote CTA
- verified badge

#### `/claim/[token]`
Claim flow puslapis.

#### `/request/new`
Universalus brief assistant.

---

## 6. Claim flow architektūra

Čia produkto širdis.

### Claim flow
1. User spaudžia „Claim profile“
2. Pasirenka verifikacijos būdą
3. Sistema sukuria `claim_request`
4. Siunčiam tokeną / rodom instrukciją
5. Verifikacija pavyksta
6. `supplier_identity` sukuriamas
7. `supplier_record.claim_status = claimed`
8. User nukreipiamas į onboarding wizard

### Verification methods
Eiliškumas pagal praktiškumą:

#### Lightweight
- email confirmation
- phone OTP

#### Stronger
- domain email
- DNS TXT
- file upload į website root

#### Manual fallback
- įmonės dokumentas
- admin review

### Onboarding po claim
Vedlys:
1. patvirtink pavadinimą
2. patvirtink kategorijas
3. patvirtink aptarnavimo vietas
4. pridėk kontaktus
5. sugeneruok AI puslapį
6. aktyvuok lead notifications

---

## 7. AI sluoksnis

AI čia neturi būti „dekoracija“. Jis turi didinti:
- indeksuojamą turinį
- claim conversion
- lead response speed
- tiekėjo close rate

### AI naudojimo vietos

#### 1. Neutral public summaries
Tik neclaimintiems:
- trumpi
- faktiniai
- nekopijuojantys tekstų
- be išgalvotų pažadų

#### 2. Claimed profile rewrite
Kai tiekėjas claimina:
- iš jo pateiktų duomenų sugeneruojamas:
  - headline
  - about
  - paslaugų blokai
  - DUK
  - „kodėl rinktis mus“

#### 3. Buyer brief normalization
Kliento laisvas tekstas paverčiamas į struktūrą:
- category
- subcategory
- urgency
- location
- budget
- constraints

#### 4. Supplier reply assistant
Iš brief’o generuoja:
- trumpą atsakymą
- kainos intervalą
- follow-up klausimus
- profesionalų toną

#### 5. SEO page generation
Generuoja:
- intro tekstus
- local FAQs
- category guides
- comparison pages

Svarbu: AI turinį laikyti kaip generated drafts, ne kaip nesekamą magiją.

---

## 8. Matching / routing variklis

Marketplace be matchingo bus šūdas.

### Matching score
`match_score =`
- kategorijos tikslumas
- subkategorijos tikslumas
- miestas / zona
- response speed istorija
- claim status
- verified status
- užimtumas
- lead acceptance rate
- kainos diapazono fit

### Routing strategijos
Pradžiai:
- 3–5 tiekėjams max
- ne visiems 50
- first response wins arba best-fit rotation

### Supplier quality score
Laikyčiau tokius signalus:
- kiek greitai atrašo
- kiek kartų peržiūri leadą
- kiek claim’intas/pilnas profilis
- kiek kartų ignoravo
- kiek kartų spamino

Tai vėliau taps moat’u.

---

## 9. Moderation / abuse / dispute

Claimable modelis be šito pavirs cirku.

### Reikia turėti:

#### Duplicate detection
Jei tas pats tiekėjas importuotas 3 kartus:
- merge queue
- canonical record
- alias slugs

#### Dispute flow
Jei du žmonės sako „čia mano profilis“:
- claim status = disputed
- profilis laikinai ribojamas
- admin review

#### Takedown
Jei tiekėjas nenori būti rodomas:
- hide public
- retain internal audit
- block reimport tam tikram laikui

#### Content provenance
Prie kiekvieno AI profilio laukai:
- source snapshot
- generated version
- approved by owner

---

## 10. MVP architektūra

Jei daryčiau MVP greitai, scope būtų toks:

### MVP v1
- categories
- supplier_records
- public profile pages
- claim flow
- basic dashboard
- buyer request form
- request matching
- email notifications
- AI summary
- simple admin

### Ne į MVP
- full reviews system
- advanced billing
- phone call tracking
- multichannel inbox
- mobile app
- complex analytics
- marketplace payments

---

## 11. Techninė schema per modulius

### Backend moduliai

#### `auth`
- sign in
- magic link
- session
- roles

#### `suppliers`
- list/create/update supplier record
- public profile fetch
- merge duplicates

#### `claims`
- create claim request
- verify claim
- dispute claim

#### `categories`
- tree
- slug resolver
- SEO category metadata

#### `locations`
- city/region graph

#### `requests`
- buyer brief intake
- normalize
- match
- distribute

#### `messages`
- supplier responses
- AI drafts

#### `ai`
- summary generation
- profile generation
- FAQ generation
- brief structuring

#### `admin`
- moderation
- disputes
- imports
- takedowns
- analytics

#### `imports`
- crawler ingest
- source snapshots
- dedupe jobs

---

## 12. Reali duomenų eiga

### A. Import flow
1. crawler paima viešą įrašą
2. sukuria `supplier_record`
3. išsaugo `supplier_source_snapshot`
4. AI sugeneruoja trumpą summary
5. puslapis publishinamas kaip unclaimed

### B. Claim flow
1. user atsidaro profilį
2. spaudžia claim
3. verifikuoja ownership
4. gauna dashboard
5. peržiūri ir pataiso info
6. AI sugeneruoja pilną public page
7. profilis tampa claimed

### C. Buyer request flow
1. klientas užpildo brief
2. AI suvienodina briefą
3. matching engine atrenka tiekėjus
4. request siunčiamas į supplier inbox / email
5. tiekėjas atsako
6. klientas pasirenka

---

## 13. SEO architektūra

Kad rinka tave pamatytų, reikia ne tik katalogo, o landing engine.

### Puslapių tipai
- category root
- category + city
- supplier profile
- category FAQ
- comparison page
- guides

### Renderinimas
- ISR / cached SSR
- canonical tags
- noindex neclaimintiems low-quality puslapiams jei reikia
- structured data:
  - LocalBusiness / Service
  - FAQ
  - BreadcrumbList

---

## 14. Monetizacijos architektūra

Kad architektūra palaikytų monetizaciją nuo pradžių, reikia tokių entity.

### `plans`
```ts
id
name
monthly_price
features_json
```

### `subscriptions`
```ts
id
supplier_record_id
plan_id
status
started_at
ends_at
```

### `lead_billing_events`
```ts
id
supplier_record_id
buyer_request_id
event_type // lead_sent, lead_opened, lead_accepted
amount
status
```

Tuomet galėsi junginėti modelius:
- subscription
- featured listing
- pay per lead
- success fee lite

---

## 15. Kaip statyčiau techniškai

### Pradinis stack
- Next.js frontend
- NestJS backend
- Postgres
- Prisma
- Redis + BullMQ
- S3/MinIO
- Postmark/Resend email
- OpenAI AI sluoksniui

### Kodėl taip
- greitas vystymas
- aiškus separation tarp public fronto ir core logic
- workeriai gali sukti AI, crawl, matching
- lengva vėliau skaidyti į microservices jei reikės

---

## 16. Minimalus DB ryšių piešinys galvoje

```text
Category ─┬─< SupplierCategoryLink >─ SupplierRecord ──< SupplierProfile
          │                               │
Location ─┴─< SupplierLocationLink >──────┤
                                          ├─< SupplierSourceSnapshot
                                          ├─< ClaimRequest
                                          ├─< SupplierIdentity
                                          ├─< RequestMatch >─ BuyerRequest
                                          └─< SupplierMessage
```

---

## 17. Kur bus tikras pranašumas

Ne kataloge.

Pranašumas atsiras čia:
- claim UX greitesnis nei visur kitur
- AI padeda tiekėjui atrodyti geriau per 10 min
- AI padeda klientui geriau suformuluoti poreikį
- matching geresnis nei „visi gauna viską“
- response-time + conversion analytics duoda tiekėjui pinigų

Tai yra reali architektūrinė kryptis.

---

## 18. Kaip skirstyčiau epikus

### EPIC 1 — Catalog Core
categories, locations, supplier_records, public pages

### EPIC 2 — Claim Engine
claim requests, verification, ownership, onboarding

### EPIC 3 — Buyer Request Engine
forms, normalization, matching, notifications

### EPIC 4 — Supplier Workspace
dashboard, profile edit, inbox, AI replies

### EPIC 5 — Import + Provenance
crawler ingest, snapshots, dedupe, moderation

### EPIC 6 — AI Content Layer
summary, profile rewrite, FAQ, SEO pages

### EPIC 7 — Monetization
plans, subscriptions, lead billing

---

## 19. Rekomenduojamas startinis rollout

### Faza 1
Tik viena šaka:
- `Statybos, apdaila`

Ir joje tik 3–5 subvertikalės:
- elektrikai
- santechnikai
- vidaus apdaila
- griovimo darbai
- trinkelės / aplinka

### Faza 2
Claim + dashboard + lead routing

### Faza 3
AI full profile generation

### Faza 4
Regioniniai landingai + scale

---

## 20. Galutinis produkto apibrėžimas viena eilute

**Claimable service marketplace su AI-generated public pages, lead routing ir supplier CRM sluoksniu.**
