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
[2] PER-JOB DENSE RETRIEVAL
      │   embed(darbas, 1536) → pgvector top-15..20 kandidatų/darbui (recall)
      ▼
[2b] LLM-RERANK (1 iškvietimas visiems darbams)
      │   iš kandidatų parenka 1-2 LOGIŠKAI tinkančias/darbui (precision;
      │   taiso "montavimas"-tipo embedding triukšmą)
      ▼
[3] SURINKIMAS: per-darbo 1-2 pasiūlymai → pilki chip'ai (UX=C, §4)
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

## 3. [2]+[2b] retrieve-then-LLM-rerank (produkcinis kategorizacijos pipeline)

Embedding-only gaudo žodžių panašumą, ne logiką („kondicionieriaus montavimas" →
durų/langų montavimas, nes „montavimas"). Sprendimas: **plati dense paieška
(recall) → LLM parenka 1-2 logiškas (precision).** Kodas: `src/lib/category-dense.ts`
+ `src/lib/category-rerank.ts`.

**[2] Dense retrieval (recall):**
- Modelis `openai/text-embedding-3-large` **@ dimensions:1536** (test-confirmed:
  recall@5 73.5% vs 3072 74.7% — 1536 telpa į standartinį HNSW indeksą) per
  **TURIMĄ `OPENROUTER_API_KEY`** (OpenRouter daro OpenAI embeddings — naujo rakto/
  infra NEREIKIA).
- Runtime: kiekvieno darbo frazė embed'inama (1 batch iškvietimas visiems darbams),
  pgvector cosine **top-15..20 kandidatų/darbui** (platus pool — svarbu recall@20).
- **Backfill teksto receptas (matuota):** `name + breadcrumb + aliases + 3-5 LLM
  tipiniai darbai/sinonimai`. recall@20: vardai-only 72.3% → **+tipiniai darbai
  74.7%**. breadcrumb+aliases NEUTRALŪS (net kiek kenkia — atskiedžia leaf vektorių;
  breadcrumb laikom tik bendravardžiams atskirti). Tipiniai darbai = vienintelis
  recall svertas (kuklus +2.4pp; lubos ~75%@20 — žodyno spraga). `scripts/
  backfill-category-embeddings.ts`.

**[2b] LLM rerank (precision):**
- 1 iškvietimas VISIEMS darbams: iš kiekvieno darbo top-15..20 kandidatų LLM
  (`gemini-2.5-flash`) parenka 1-2 logiškai tinkančias (griežtas JSON, „prasmė, ne
  žodžiai"). Fallback → dense top-2 jei LLM lūžta.
- **Matuota (multi-label golden, 83 darbai):** LLM gold-tarp-1-2 = **67.5%** vs
  dense recall@2 54.2% (**+13pp** tame pačiame selektyvume), ≈ dense recall@5 (65%)
  bet su 1-2 ŠVARIAIS, ne 5. Lubos = retrieval recall@20 (74.7%); LLM atgauna 90%+.
  Win = švara/precision (triukšmas ištaisytas), ne raw recall.

**Invariantas:** LLM picks privalo būti tarp paduotų kandidatų; ne-atitikmenys
metami. Kandidatai TIK iš pgvector (realios taksonomijos) — niekada neišgalvojam slug.

**Latency pasekmė:** kelyje 2 LLM iškvietimai — segmentacija (įsukta į ai-improve,
~free) + 1 rerank iškvietimas + 1 embed batch + pgvector. Rerank pakeičia
nenaudingą Gemini rerank'ą (§6), tad neto gali būti panašiai.

---

## 4. [3] Surinkimas + UX — SPRENDIMAS: C (siūlyti, vartotojas patvirtina)

**Priimta: C — siūlyti, vartotojas patvirtina. NE auto-priskyrimas, NE
auto-priskyrimas+redagavimas.** Sistema NIEKADA pati neuždeda aktyvaus chip'o.

Konkrečiai:
- Po segmentacijos kiekvienas darbas rodomas kaip **antraštė**, po juo **1–2
  LLM-parinkti (pilki, neaktyvūs) logiški chip'ai** (iš §3 rerank); **„daugiau"**
  atskleidžia platesnius dense kandidatus (fallback, jei 1-2 netinka).
- Vartotojas **tapši tuos, kurie tinka** → jie tampa aktyvūs (priskirti).
- **„+ dar viena"** lieka spragoms (jei nė vienas pasiūlymas netinka).
- Sistema niekada pati neaktyvina chip'o — visada vartotojo veiksmas.
- (Demo `feat/multilabel-phase0-demo` rodo tai gyvai — švarūs 1-2/darbui.)

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

### UI tankio patikra (su LLM rerank — jau švaru)
LLM rerank duoda **1-2/darbui**, ne 5 → tankis nebėra problema (demo patvirtino).
- Darbai dėliojami **vertikaliai**, kiekvienas su aiškia antrašte.
- Per darbą **1-2 pilki** chip'ai; platesni dense kandidatai po **„daugiau"**.
- Jei darbų >3 — accordion (sutraukti) jei reikės.

---

## 5. pgvector setup (SQL)

`vector` 0.8.0 prieinama (dar neįjungta). **Dimensija = 1536** (SPRENDIMAS,
test-confirmed: recall@5 73.5% @1536 vs 74.7% @3072 — ~1pp; 1536 telpa į
**standartinį HNSW** indeksą, jokio halfvec). Pilnas SQL + logging lentelė:
`docs/ai-routing/phase3-impl/migration.sql`. **DAR NEįvykdyta** — laukia DB
sprendimo (prod aditYVi vs Supabase branch).

```sql
create extension if not exists vector;
create table category_embedding (
  category_id  text primary key references "Category"(id) on delete cascade,
  embedding    vector(1536) not null,
  model        text not null,        -- runtime modelis privalo sutapti (drift saugiklis)
  text_version text not null,        -- enriched-v1 (recepto versija)
  updated_at   timestamptz not null default now()
);
create index on category_embedding using hnsw (embedding vector_cosine_ops);
```
Runtime per darbą (`src/lib/category-dense.ts`): `... order by embedding <=> $1::vector limit 15` (Prisma `$queryRaw`).

---

## 6. Atidėti svertai — NE branduolyje, NE launch blokeriai

> Patikslinimas: **LLM-rerank (kategorijų SELEKCIJA, §3 [2b]) YRA branduolyje** —
> tai ne cross-encoder. Žemiau atidėti yra (a) cross-encoder reranker ir (b)
> leksinė fuzija. Branduolys = segmentacija + dense retrieval + LLM-rerank.

- **Cross-encoder reranker (jina/bge):** padeda „visi darbai" coverage (39%→50%@3),
  bet ~1.8s/darbui ant CPU → runtime NEtinka. Be to LLM-rerank (§3) jau dengia
  precision. **NEįtraukti** į branduolį.
- **Leksinė fuzija (RRF):** apytiksle Python replika PAKENKĖ per-job recall
  (66%→59% dense-only). Atidėta. **Veiksmas:** pajungti TIKRĄ TS leksinį per darbą
  TIK SHADOW režime (loginti, nerodyti), pamatuoti ant multi-label golden; į
  branduolį kelti tik jei aiškiai kelia recall@5. NE branduolyje pradžiai.

---

## 7. Matavimas (gate'ai — TEISINGOS metrikos)

**NE precision@1. NE „visi darbai auto-teisingi @3".** Kadangi UX = C (siūlyti,
vartotojas patvirtina), sėkmė = ar teisinga kategorija MATOMA pasiūlyme, kad
vartotojas galėtų ją tapšti.

- **Retrieval recall@20** (kandidatų pool LLM'ui) — **74.7%** (enriched receptas).
  Tai lubos; gate ≥72%.
- **Pipeline matas = gold tarp LLM-parinktų 1-2/darbui** — **67.5%** (matuota).
  Launch gate ≥65%. (Tikras recall aukštesnis — anotacija griežta, sibling/parent.)
- **Segmentacijos accuracy:** % darbų teisingai išskaidyta (≥90%; baseline 93%).
- Antriniai (stebėti): per-job recall@5 (~75% kontekstas), visi-darbai (informacinis,
  NE blokeris — vartotojas patvirtina).
- Multi-label golden rinkinys: praplėsti iki ~80–100 realių multi-darbo užklausų;
  keli priimtini gold/darbui (sumažina griežtumą).
- Shadow ant realaus srauto prieš on; po launch — patvirtinimų logging (§4) duoda
  TIKRĄ accept-rate metriką (geriau nei golden).

---

## 8. Rollout

PHASE A scaffolding (parašyta, NEįvykdyta — laukia DB sprendimo):
`docs/ai-routing/phase3-impl/migration.sql`, `scripts/backfill-category-embeddings.ts`,
`src/lib/category-dense.ts`, `src/lib/category-rerank.ts`. Gate skaičiai jau turimi
offline (§7). Tolesni žingsniai:
1. Migracija: `migration.sql` (prod aditYVi ARBA Supabase branch — sprendimas).
2. Backfill: enriched tekstas 1536 (`scripts/backfill-category-embeddings.ts`).
3. (STOP buvo čia) Segmentacija: pridėti `jobs[]` į ai-improve prompt (versijuoti).
4. Per-job dense+rerank: prijungti `category-dense` + `category-rerank`, fallback į single-chip.
5. Offline gate patvirtinimas per realų pgvector: multi-label golden (§7).
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
