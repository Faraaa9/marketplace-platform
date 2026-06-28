# Phase 3 — produkcinis dizainas (Stage 4): MULTI-LABEL

> Sukurta 2026-06-28, perrašyta po multi-label reframe + matavimų. DIZAINAS, ne
> implementacija. Prielaidos patikrintos (Supabase `vector` 0.8.0 prieinama;
> OpenRouter raktas DARO embeddings; matavimai žemiau).

---

## 0. Esminis reframe (KODĖL šis dizainas kitoks)

Ankstesnė dizaino versija (ir spike) matavo **single-label precision@1** —
„kuri VIENA kategorija tinka visam tekstui". Tai **ne mūsų problema.** Reali
užklausa „Sienų dažymas, plytelių klojimas ir kriauklės" turi **3 atskirus
darbus**, kiekvienam reikia savos kategorijos. Single-label pipeline grąžina 1
kategoriją N-darbų užklausai → N−1 darbų gauna NIEKO.

**Teisinga architektūra: skaidyti į darbus → kategorizuoti KIEKVIENĄ darbą.**

### Matuota (2026-06-28, 36 užkl. / 83 darbų ranka-anotuotas multi-label rinkinys)
| Žingsnis | Skaičius |
|---|---|
| **Segmentacija** (LLM išskaido darbus) | **93%** darbų pagauta, ratio 1.05 (be per-skaidymo) |
| **Per-job dense** recall@3 / @5 | **66–72%** / **72–75%** |
| **Visi darbai teisingi** @3 / @5 | ~**42–50%** / ~**56%** |
| Embedding modelis | `text-embedding-3-large` (per TURIMĄ OpenRouter raktą) |
| Segmentacijos modelis | `gemini-2.5-flash` ≈ `flash-lite` (pigus tinka) |

**Pirminis sėkmės matas (nes UX = C, vartotojas patvirtina — §4): per-job
recall@5 ~75%** — ar teisinga kategorija MATOMA pasiūlyme, kad vartotojas galėtų
ją tapšti. NE „visi darbai auto-teisingi @3" (tai antrinis — patvirtinimas dengia
spragą). → §7.

Caveat'ai (sąžiningai): rinkinys mažas ir ranka-sukurtas; vienas gold/darbui yra
GRIEŽTA (daug „miss'ų" — priimtini sibling/parent), tad tikras recall aukštesnis.
Leksinė fuzija (apytiksle replika) pakenkė — neapibrėžta; rerank padeda coverage
bet lėtas (CPU). → §6.

---

## 1. Architektūra ir srautas

```
raw užklausos tekstas
      │
      ▼
[1] SEGMENTACIJA (LLM)  ── įsukta į esamą ai-improve iškvietimą (0 papild. latency)
      │   "Sienų dažymas, plytelių klojimas ir kriauklės"
      │   → ["sienų dažymas", "plytelių klojimas", "kriauklės keitimas"]
      ▼
[2] PER-JOB DENSE  (lygiagrečiai kiekvienam darbui)
      │   embed(darbas, 3-large) → pgvector top-K kategorijų
      ▼
[3] SURINKIMAS: kiekvienam darbui top-1..N kategorija → dedupe → chip'ai
      │   (UX: sugrupuota pagal darbą arba bendras dedupe rinkinys)
      ▼
   grąžinti kategorijų rinkinį
```

**Fallback (privalomas):** jei segmentacija ar embed/pgvector lūžta/timeout'ina →
grįžti į DABARTINĮ elgesį (suggestCategories vienas chip'as ant viso teksto).
Vartotojas niekada nelieka be pasiūlymo.

**Esminis pranašumas prieš dabartinę sistemą:** dabar N-darbų užklausa gauna 1
kategoriją; po šito — kiekvienas darbas gauna savo. Tai kokybinis šuolis, ne
procentinis.

---

## 2. [1] Segmentacija

- **Kur:** ai-improve jau daro LLM iškvietimą (`improveDescription`, grąžina
  improvedDescription/title/...). Pridėti `jobs: string[]` lauką į tą PATĮ
  iškvietimą → **jokios papildomos latency ar kaštų** (tik keli output tokenai).
  (Atsk. iškvietimas — atsarginis variantas, jei norisi izoliuoti.)
- **Modelis:** pigus pakanka — `gemini-2.5-flash-lite` (~$0.0000001/M) ≈ `flash`
  matavimuose. LT tinka.
- **Prompt:** „išskaidyk į atskirus darbus, numanomus irgi (pvz. 'pilna vonios
  renovacija' → griovimas + plytelės + santechnika), grąžink JSON masyvą".
- **Matuota:** 93% darbų teisingai išskaidyta, ratio 1.05 (beveik nėra
  per-skaidymo). Tai stipriausias grandinės žingsnis.
- **Invariantas:** segmentacija grąžina LAISVO teksto frazes (ne slug'us) —
  kategorizacija (žemiau) jas mapina į taksonomiją.

---

## 3. [2] Per-job dense kategorizacija

- **Modelis:** `openai/text-embedding-3-large` (3072d) per **TURIMĄ
  `OPENROUTER_API_KEY`** — OpenRouter palaiko OpenAI embeddings (patikrinta, HTTP
  200). **Dizaino „centrinis nežinomasis" (reikia naujo rakto/infra) DINGO.**
  Matuota: 39.8% single-label p@1 (lenkė net lokalų e5-large); multi-label per-job
  recall@3 66–72%.
- **Offline precompute:** ~1916 kategorijų (`depth>0`) tekstai (`name. aliases.
  breadcrumb`) embed'inami 3-large, laikomi pgvector (§5). Vienkartinis backfill +
  re-embed keičiant taksonomiją.
- **Runtime:** kiekvieno darbo frazė embed'inama (galima 1 BATCH iškvietimas
  visiems darbams = 1 round-trip), pgvector top-K (cosine) kiekvienam darbui.
- **K:** top-3..5 per darbą (matavimas: recall@3 66–72%, @5 72–75%).
- **Invariantas:** kandidatai TIK iš pgvector lentelės (realios taksonomijos) —
  niekada neišgalvojam slug.

---

## 4. [3] Surinkimas + UX — SPRENDIMAS: C (siūlyti, vartotojas patvirtina)

**Priimta: C — siūlyti, vartotojas patvirtina. NE auto-priskyrimas, NE
auto-priskyrimas+redagavimas.** Sistema NIEKADA pati neuždeda aktyvaus chip'o.

Konkrečiai:
- Po segmentacijos kiekvienas darbas rodomas kaip **antraštė**, po juo **3–5
  pasiūlyti (pilki, neaktyvūs) kategorijų chip'ai** (per-job dense top-K).
- Vartotojas **tapši tuos, kurie tinka** → jie tampa aktyvūs (priskirti).
- **„+ dar viena"** lieka spragoms (jei nė vienas pasiūlymas netinka).
- Sistema niekada pati neaktyvina chip'o — visada vartotojo veiksmas.

Kodėl C: vartotojo patvirtinimas **dengia coverage spragą** (~50% „visi darbai
auto-teisingi" tampa nebe blokeriu — vartotojas mato pasiūlymus ir pasirenka).
Tai leidžia paleisti be rerank/fuzijos (§6).

### Patvirtinimų logging (PRIVALOMA nuo dienos 1, ne nice-to-have)
Kiekvienas „pasiūlyta X → vartotojas priėmė / atmetė / pakeitė į Y" SAUGOMAS.
Tai **treniravimo duomenys** ateities auto-priskyrimui (variantas A). Lentelė pvz.:
```sql
create table category_suggestion_event (
  id           bigserial primary key,
  request_id   text,                 -- jei jau sukurta; arba draft id
  job_phrase   text not null,        -- segmentuotas darbas
  suggested_category_id text,        -- pasiūlyta kategorija
  suggested_rank int,                -- pozicija pasiūlyme (1..5)
  action       text not null,        -- 'accepted' | 'rejected' | 'added_manual'
  chosen_category_id text,           -- ką galiausiai pasirinko (jei pakeitė/pridėjo)
  seg_model    text, emb_model text, -- audit
  created_at   timestamptz not null default now()
);
```
Be šito launch'inti negalima — duomenys kaupiami nuo pirmos dienos, kad vėliau
būtų iš ko mokyti A (auto-priskyrimą).

### UI tankio patikra (3–5 pasiūlymai × 3–4 darbai)
3–4 darbai × 3–5 chip'ai = 9–20 pilkų chip'ų → gali paskęsti. **Limitas:**
- Darbai dėliojami **vertikaliai**, kiekvienas su aiškia antrašte.
- Per darbą **matomi top-3** chip'ai; likę (4–5) po **„daugiau"** nuoroda.
- Jei darbų >3 — apsvarstyti darbų accordion (sutraukti, išskleidžiami).
Tikslas: ekranas lieka skenuojamas, ne chip'ų siena.

---

## 5. pgvector setup (SQL)

`vector` 0.8.0 prieinama (dar neįjungta), palaiko HNSW. **Dimensija = 3072**
(text-embedding-3-large).

```sql
create extension if not exists vector;

create table category_embedding (
  category_id text primary key references "Category"(id) on delete cascade,
  embedding   vector(3072) not null,
  model       text not null,            -- saugiklis: runtime modelis privalo sutapti
  updated_at  timestamptz not null default now()
);

-- HNSW (paprasčiau nei IVFFlat, puiku ~2k eilučių), cosine
create index on category_embedding using hnsw (embedding vector_cosine_ops);
```
Runtime per darbą: `select category_id from category_embedding order by embedding <=> $1 limit 5;`
(Prisma `$queryRaw`; $1 = darbo vektorius.)

> SVARBU: 3072d viršija pgvector HNSW/ivfflat indekso ribą (2000d `vector`).
> Sprendimai (pasirinkti backfill metu): (a) `text-embedding-3-large` su
> `dimensions: 1536` param (OpenAI palaiko dimensijų mažinimą — RE-VALIDATE ant
> multi-label golden, kad recall nenukristų), arba (b) `halfvec(3072)` +
> `halfvec_cosine_ops` (pgvector 0.7+ palaiko iki 4096d half-precision indeksą).
> Rekomendacija: pradėti nuo (b) halfvec (laiko pilną tikslumą), (a) jei latency/
> dydis spaus.

---

## 6. Atidėti svertai — NE branduolyje, NE launch blokeriai

Kadangi UX = C (vartotojas patvirtina, §4), patvirtinimas dengia coverage spragą —
tad nei rerank, nei fuzija nėra launch'o sąlyga. Branduolys = segmentacija +
per-job dense. Svertai — tik jei matavimai parodys, kad verta.

- **Rerank (cross-encoder):** padeda „visi darbai" coverage (39%→50%@3), bet
  ~1.8s/darbui ant CPU → runtime NEtinka. **Vartotojo patvirtinimas jau dengia šią
  spragą, tad rerank API NĖRA launch blokeris.** NEįtraukti į branduolį; jei kada —
  rerank API (Cohere/Jina), flag-gated, neprivaloma.
- **Leksinė fuzija (RRF):** apytiksle Python replika PAKENKĖ per-job recall
  (66%→59% dense-only). Atidėta. **Veiksmas:** pajungti TIKRĄ TS leksinį per darbą
  TIK SHADOW režime (loginti, nerodyti), pamatuoti ant multi-label golden; į
  branduolį kelti tik jei aiškiai kelia recall@5. NE branduolyje pradžiai.

---

## 7. Matavimas (gate'ai — TEISINGOS metrikos)

**NE precision@1. NE „visi darbai auto-teisingi @3".** Kadangi UX = C (siūlyti,
vartotojas patvirtina), sėkmė = ar teisinga kategorija MATOMA pasiūlyme, kad
vartotojas galėtų ją tapšti.

- **PIRMINIS matas = per-job recall@5** (~75% baseline) — ar teisinga kategorija
  yra tarp 5 pasiūlytų kiekvienam darbui. **Tai launch gate.** Taikinys ≥75%.
- **Segmentacijos accuracy:** % darbų teisingai išskaidyta (taikinys ≥90%; baseline 93%).
- Antriniai (stebėti, ne gate): per-job recall@3 (66/72% kontekstas), visi-darbai-
  covered@5 (~56% — informacinis, NE blokeris, nes vartotojas patvirtina).
- Multi-label golden rinkinys: praplėsti iki ~80–100 realių multi-darbo užklausų;
  keli priimtini gold/darbui (sumažina griežtumą).
- Shadow ant realaus srauto prieš on; po launch — patvirtinimų logging (§4) duoda
  TIKRĄ accept-rate metriką (geriau nei golden).

---

## 8. Rollout

1. Migracija: `create extension vector` + `category_embedding` (+dim sprendimas §5).
2. Backfill: embed visas kategorijas 3-large (`scripts/backfill-category-embeddings.ts`).
3. Segmentacija: pridėti `jobs[]` į ai-improve prompt (versijuoti).
4. Per-job dense: naujas modulis, fallback į esamą single-chip.
5. Offline gate: multi-label golden (§7).
6. Shadow: `CATEGORY_MULTILABEL_SHADOW=1` — skaičiuoja + loginа, nerodo; stebėti latency + coverage.
7. On (flag): `CATEGORY_MULTILABEL_ENABLED=1`. Grįžtama (flag off → dabartinis elgesys).

---

## 9. Forkai founder'iui

**IŠSPRĘSTA:** UX = C (siūlyti pilkus 3–5 chip'us per darbą, vartotojas
patvirtina; sugrupuota pagal darbą; sistema niekada neauto-priskiria). §4.

Liko spręsti:
1. **Embedding dimensija** (§5): halfvec 3072 (pilnas tikslumas) vs sumažintas
   1536 (re-validate) — sprendžiam backfill metu pagal pgvector indekso ribą.
2. **Segmentacija atskirai vs įsukta į ai-improve** — įsukta (0 latency)
   rekomenduojama; atskira jei norisi izoliacijos/cache.

---

## 10. Rizikos

- **„Visi darbai" coverage ~50%** — NEBĖRA blokeris: UX = C (vartotojas mato 3–5
  pasiūlymus per darbą ir patvirtina; „+ dar viena" spragoms). Pirminis matas =
  recall@5 (~75%), ne auto-coverage.
- **Segmentacija per-skaido / sulieja** — matuota gerai (ratio 1.05), bet stebėti
  shadow.
- **3072d pgvector indekso riba** (§5) — spręsti backfill metu (halfvec/dimensijos).
- **Modelio drift** (runtime ≠ precompute) — `category_embedding.model` + startup check.
- **Latency** — segmentacija įsukta (0), per-job embed batch (1 round-trip ~200ms)
  + pgvector ~ms; timeout + fallback.
- **Annotation griežtumas** golden rinkinyje — praplėsti su keliais gold/darbui (§7).

---

## Priedas — kas pasikeitė nuo single-label versijos
- Metrika: precision@1 → per-job recall + visi-darbai-covered (precision@1 matavo ne tą).
- Pridėtas segmentacijos žingsnis (LLM, įsuktas į ai-improve, ~free).
- Dense leidžiamas PER DARBĄ, ne ant viso stringo.
- Embedding raktas: NEREIKIA naujo — OpenRouter daro OpenAI embeddings (3-large 3072d).
- Leksinė fuzija/rerank — atidėti (matuota: fuzija neaiški, rerank lėtas).
