# Phase 3 dense — produkcinis dizainas (Stage 4)

> Sukurta 2026-06-28. DIZAINAS, ne implementacija. Tęsia `phase3-dense-plan.md`
> ir spike rezultatus `phase3-spike/`. Prielaidos patikrintos prieš Supabase
> (`vector` 0.8.0 prieinama, dar neįjungta).

---

## 0. Santrauka ir rekomendacija (TL;DR founder'iui)

Spike įrodė: dense paieška pakelia kategorijos parinkimą nuo ~24.8% iki ~37.4%
(precision@1, golden_300). Dabar reikia tai iškelti į gyvą sistemą.

**Rekomenduojamas pjūvis (paprastai):**
1. Kategorijų „prasmės pirštų atspaudus" (embeddings) suskaičiuojam **offline,
   vieną kartą**, ir laikom Supabase `pgvector` stulpelyje (1942 eilutės — labai
   mažai).
2. Kai vartotojas rašo užklausą, **vieną kartą** paverčiam jo tekstą tokiu pat
   atspaudu (runtime embed per **embedding API**), ir Supabase per milisekundes
   randa artimiausias kategorijas.
3. Šitą dense kandidatų sąrašą **sulieJam su esamu žodžių-matcheriu** (RRF) — abu
   papildo vienas kitą; jokio naujo „re-ranker'io", jokio išgalvoto slug.
4. Jei embed/paieška kada nors lūžta ar vėluoja — **automatinis grįžimas į
   dabartinį žodžių matcherį** (vartotojas niekada nepamato gedimo).

**Centrinis sprendimas (vienintelis tikras forkas):** kuo embed'inti runtime?
Trumpai — **embedding API** (jokio serverio priežiūros), o ne savo modelio
serveris. Detalės ir alternatyvos žemiau (§2). Vienas mokestis: kadangi spike
matavo `e5-large` lokaliai, prieš įjungiant reikės **pakartoti golden_300 testą
su pasirinktu API modeliu** (turi pasiekti ~37%+) — pigu, kelios minutės.

**Latency/kaštai:** runtime embed ~150-300ms + pgvector ~10ms. Tai gali net
PAGREITINTI srautą — nes pakeičiam šiandien nenaudingą ~kelių sekundžių Gemini
rerank'ą (spike parodė, kad jis p@1 nekelia). Kaštai jų tūriu — centai/mėn.

---

## 1. Runtime architektūra ir srautas

Dense įsijungia kaip **antras retriever'is** esamame `suggestCategories({mode:"request"})`
pipeline — tiksliai taip pat, kaip Phase 2 `injectPhraseCandidates` (aditYVus
kandidatų generavimas, ne re-ranker).

```
užklausos tekstas (title + description)
        │
        ├─► [A] leksinis rankCandidates()            (esamas, ~ms, CPU)
        │
        └─► [B] dense retriever  (NAUJAS)
                 query embed (API, ~200ms, timeout 800ms)
                 └─► pgvector: top-30 kategorijų pagal cosine
                        │
        ┌───────────────┘
        ▼
   RRF fuzija(A_rank, B_rank)  → sulietas kandidatų rankingas
        │
        ▼
   esamas downstream NEPAKEISTAS:
   override → applyRequestIntentRules → pickTopSuggestions →
   multi-need trim → grąžinti suggestions[]
```

**Fallback (privalomas):** jei query embed arba pgvector užklausa fail'ina /
viršija timeout (pvz. 800ms), dense praleidžiamas — pipeline grįžta į gryną
leksinį (šiandienos elgsena). Vartotojas niekada nelieka be pasiūlymo.

**Kur tiksliai kode:** `category-suggestions.ts`, po `scoredBase` (leksinis +
route-junk filtras), prieš override/intent taisykles — t.y. ten, kur dabar
kviečiamas `injectPhraseCandidates`. Naujas `injectDenseCandidates(scored,
queryEmbedding, byId, bySlug)` prideda dense top-K į `scored` pool su RRF-išvestu
score. Downstream (override, intent, multi-need trim, AI rerank kabė) lieka kaip
yra.

**Reranker:** ATIDĖTAS (spike: p@1 nekelia). Dargi — dense retrieval'as gali
PAKEISTI dabartinį Gemini rerank'ą (`aiRerank`), nes:
- Gemini rerank dabar p@1 nekelia (žr. `project_categorization_fix_phase1`),
- jis kainuoja ~kelias sekundes + tokenus per užklausą.
Pakeitus jį dense retrieval'u — ir tikslumas kyla, ir latency krenta. (Sprendimas
ar iškart išjungti Gemini, ar laikyti abu lygiagrečiai shadow režimu — §8 forkas.)

---

## 2. ESMĖ — runtime query embedding (centrinis sprendimas)

**Nekintamasis invariantas:** runtime query IR offline kategorijų embeddings
PRIVALO būti to paties modelio ir tos pačios dimensijos. Pakeitus modelį, reikia
perskaičiuoti VISAS kategorijas ir pertikrinti golden_300.

Spike patikrino `multilingual-e5-large` (1024d), bet LOKALIAI (fastembed/ONNX, be
rakto). Produkcijoje to paties modelio savarankiškas hostinimas problemiškas
(ONNX ~2.2GB — netelpa į serverless funkciją). Variantai:

| Variantas | Modelis | Infra našta | Latency | Kaštai | Re-validate golden? |
|---|---|---|---|---|---|
| **A. Embedding API (rekom.)** | Cohere `embed-multilingual-v3` (1024d) ARBA OpenAI `text-embedding-3-large` | **0** (jokio serverio) | ~150-300ms | ~$0.0001/užkl. | TAIP (pigu) |
| B. Open-model API | `e5-large`/`BGE-M3` per Deepinfra/Together (1024d) | 0 | ~200-400ms | ~$0.00002/užkl. | iš dalies (tas pats modelis = mažesnė rizika) |
| C. Self-host e5-large | tikslus spike modelis | **didelė** (atskiras container servisas: Fly/Render/Modal; ~2GB modelis) | ~50-150ms (warm) | fiksuotas $/mėn + priežiūra | NE (tas pats modelis) |
| D. Supabase Edge `gte-small` | gte-small (384d) | maža | ~50ms | įskaičiuota | TAIP (silpnesnis, LT neaiškus) |

**Rekomendacija: A (embedding API), su B kaip „close second".**
- A pašalina visą serverių priežiūrą solo founder'iui. Cohere `embed-multilingual-v3`
  yra stiprus daugiakalbis (tinka LT), 1024d (sutampa su spike dimensija).
- Vienintelis mokestis: API modelis ≠ tikslus spike modelis, tad **prieš įjungiant
  paleisti golden_300 su tuo modeliu** (embed 1942 kat. + 254 užkl. per API =
  centai + minutės). Gate: p@1 ≥ ~35%, recall@30 ≥ ~78%. Jei nepasiekia — bandyti
  B (open-model API, tas pats e5-large/BGE-M3) prieš svarstant C.
- **C tik jei A ir B abu nuvilia kaštais/latency mastu** — nepradėti nuo serverio.

**Prieiga prie API:** env šiandien NETURI embedding rakto. Variantai: (a) Vercel
AI Gateway (`provider/model` string, viena vieta keliems provideriams, jau
Vercel ekosistemoje — žr. AI Gateway) — reikia Gateway rakto; (b) tiesioginis
Cohere/OpenAI raktas per `vercel env`. Rekomenduoju AI Gateway — vėliau lengva
keisti modelį be kodo. (Tai mažas setup'as, ne blocker'is.)

> Pastaba: NEnaudoti dabartinio `OPENROUTER_API_KEY` — OpenRouter yra chat-only,
> ne embeddings.

---

## 3. Offline precompute + invalidacija

- **Ką embed'inti:** kiekvienos `SERVICE_CATEGORY_WHERE` kategorijos (`depth>0`,
  ~1916) tekstas = `name. aliases. breadcrumb` (tiksliai kaip spike
  `export-categories-for-dense.ts`). Roots (depth 0) praleisti (per platūs).
- **Kada:** vieną kartą backfill'as, ir iš naujo kai taksonomija keičiasi
  (pridėta/pervadinta kategorija, dedup). Taksonomija keičiasi retai.
- **Kuo:** tuo pačiu API modeliu kaip runtime (§2). Backfill skriptas
  (`scripts/backfill-category-embeddings.ts`) — batch embed per API, `UPDATE`
  pgvector stulpelį.
- **Invalidacija:** kabintis prie esamo taksonomijos keitimo kelio
  (`invalidateServiceCategoryGroups` kaimynystėje) — pažymėti pakeistas
  kategorijas `embedding_stale=true`; periodinis `pg_cron` jobas (yra `pg_cron`
  1.6.4) re-embed'ina stale eilutes. Arba paprasčiau: rankinis `pnpm
  embeddings:backfill` po taksonomijos pakeitimo (retai → rankinis OK pradžiai).

---

## 4. pgvector setup (SQL)

`vector` 0.8.0 prieinama (dar neįjungta). Palaiko HNSW ir IVFFlat.

```sql
-- migracija
create extension if not exists vector;

-- embeddings prie kategorijų (atskira lentelė — neteršia pagrindinės Category;
-- dimensija priklauso nuo §2 modelio, čia 1024 pvz. Cohere/e5)
create table category_embedding (
  category_id text primary key references "Category"(id) on delete cascade,
  embedding   vector(1024) not null,
  model       text not null,           -- audit: kuriuo modeliu (saugiklis maišymui)
  updated_at  timestamptz not null default now()
);

-- HNSW indeksas (rekom.): ~2k eilučių — HNSW paprastesnis nei IVFFlat (be lists
-- tuning, be treniravimo), puikus recall/latency mažam setui. cosine distance.
create index on category_embedding using hnsw (embedding vector_cosine_ops);
```

**HNSW vs IVFFlat:** HNSW — geresnis recall, nereikia `lists` parametro, tinka
mažam ir augančiam setui; IVFFlat reikalauja treniravimo ir gerai veikia tik gerai
parinkus `lists`. Su ~1916 eilučių abu greiti, **renkamės HNSW** (paprasčiau,
robustiškiau). (Tiesą sakant, prie 2k eilučių net brute-force scan greitas —
indeksas dėl ateities.)

**Runtime užklausa** (top-30, kosinusas):
```sql
select category_id
from category_embedding
order by embedding <=> $1   -- $1 = query vektorius
limit 30;
```
Vykdoma per Prisma `$queryRaw` (pgvector tipas perduodamas kaip string/`::vector`).

---

## 5. Integracija į `suggestCategories` (kodo eskizas, NE diegti)

Pakartoti `injectPhraseCandidates` šabloną — aditYVus, niekada neišgalvoja slug:

```ts
// category-suggestions.ts (eskizas)
async function injectDenseCandidates(
  scored: ScoredCandidate[], queryEmbedding: number[],
  byId: Map<string, CandidateRow>, bySlug: Map<string, CandidateRow>,
): Promise<ScoredCandidate[]> {
  // 1. pgvector top-30 (Prisma $queryRaw), timeout 800ms -> [] jei fail
  // 2. RRF fuzija: lexRank iš `scored`, denseRank iš pgvector
  //    rrf(d) = 1/(k+lexRank) + 1/(k+denseRank), k=60 (standartas)
  // 3. INVARIANTAS: injektuojam tik slug, esančius live pool (bySlug.has) — niekada nefabrikuojam
  // 4. score band: kaip PHRASE_BASE_SCORE — kad dense kandidatas pakliūtų į top, bet nesteamroll'intų override
  // ...sort, return scored (downstream nepaliestas)
}
```

- **RRF, ne score-sumavimas:** leksinis ir dense score skirtingų skalių — rank
  fuzija (RRF, k=60) yra standartinis, kalibracijos nereikalaujantis būdas.
- Override (`Number.MAX_SAFE_INTEGER`), intent taisyklės, multi-need trim,
  calibrated confidence — **lieka kaip yra**. Dense tik keičia kandidatų pool +
  tvarką prieš juos.
- `loadCandidates` jau turi `id/slug/name/depth/parentId/rootId` — dense top-30
  category_id mapinami į esamus `CandidateRow`.

---

## 6. Latency ir kaštų biudžetas

| Komponentas | Latency | Pastaba |
|---|---|---|
| query embed (API) | ~150-300ms | timeout 800ms → leksinis fallback |
| pgvector top-30 | ~5-15ms | HNSW, ~2k eilučių |
| RRF + downstream | ~ms | CPU |
| **Pridėta neto** | **~200-300ms** | bet PAKEIČIA ~kelių sek. Gemini rerank → neto GALI būti greičiau |

**Kaštai** (prielaida: net 1000 užklausų/dieną = 30k/mėn):
- Runtime embed: 30k × ~$0.0001 = **~$3/mėn** (Cohere/OpenAI). Open-model (B) ~5× pigiau.
- Offline precompute: 1916 kat. × retai = **centai**.
- pgvector saugojimas: 1916 × 1024 × 4B ≈ 8MB — nereikšminga.

Solo founder'iui — nereikšmingi kaštai, jokios fiksuotos infra (variantas A/B).

---

## 7. Matavimas (gate'ai prieš įjungiant)

- **Offline (privaloma):** išplėsti `eval-category-suggestions.ts` ARBA pridėti
  `eval-dense-fusion.ts` — paleisti PILNĄ fuzuotą pipeline su PRODUKCINIU modeliu
  ant golden_300. Gate: **precision@1 ≥ leksinis 24.8% IR ≥ ~35%** (taikinys
  spike ~37%), recall@3 kyla, multi-need F1 neregresuoja.
- **Per-modelio re-validate:** §2 — bet kuris API modelis testuojamas golden_300
  PRIEŠ wiring'ą.
- **Shadow (prieš on):** runtime skaičiuoti dense, bet NErodyti — loginti, ką
  dense BŪTŲ pakeitęs vs leksinis (kaip esamas shadow-routing pattern). Patikrinti
  realiu srautu, kad nėra netikėtumų / latency spike'ų.

---

## 8. Rollout planas

1. **Migracija:** `create extension vector` + `category_embedding` lentelė + HNSW.
2. **Backfill:** `scripts/backfill-category-embeddings.ts` (API embed visų kat.).
3. **Offline gate:** golden_300 su produkciniu modeliu ≥ 35% p@1 (kitaip — keisti modelį).
4. **Shadow:** flag `CATEGORY_DENSE_SHADOW=1` — skaičiuoja + loginа, nerodo. Stebėti latency + agreement keletą dienų.
5. **On (flag-gated):** `CATEGORY_DENSE_ENABLED=1` — dense fuzuotas į suggestions. Galima ramps (pvz. tik dalis srauto per hash).
6. **Gemini rerank:** kai dense on ir stabilus — apsvarstyti `aiRerank` išjungimą (latency + kaštų taupymas; jis p@1 nekelia).

Kiekvienas žingsnis grįžtamas (flag off → grynas leksinis, šiandienos elgsena).

---

## 9. Forkai founder'iui (sprendimai)

1. **Embedding šaltinis (svarbiausias):** A) Cohere/OpenAI API per AI Gateway
   (0 infra, +re-validate) — *rekomenduoju*; B) open-model API (e5/BGE-M3, tas
   pats modelis, pigiau, mažiau žinomas provideris); C) self-host (jokio
   per-call $, bet serverio priežiūra). → **A**.
2. **Gemini rerank likimas:** palikti lygiagrečiai (saugiau, brangiau) vs
   pakeisti dense (greičiau + pigiau, nes jis p@1 nekelia). → palikčiau shadow
   fazei, tada pakeisčiau.
3. **Kategorijų skaičius užklausai:** dabar fallback įdeda 1 chip'ą; su dense
   galim įdėti geriausią + leisti vartotojui pridėti. Susiję su PR#41/#42
   sprendimais — atskira UX diskusija.
4. **Invalidacija:** rankinis `backfill` po taksonomijos keitimo (paprasta) vs
   `pg_cron` auto-re-embed (automatiška, daugiau judančių dalių). → rankinis pradžiai.

---

## 10. Rizikos

- **API modelis silpnesnis nei e5-large LT'ui** — sumažina spike pranašumą.
  Mitigacija: §7 re-validate PRIEŠ wiring; jei kritę — open-model API (tas pats
  modelis) arba self-host.
- **Latency spike'ai per embed API** — mitigacija: 800ms timeout + leksinis
  fallback; shadow faze matuoja realų p99.
- **Embedding/precompute modelio drift** — `category_embedding.model` stulpelis +
  startup check, kad runtime modelis == saugotų embeddings modelis (kitaip
  fallback į leksinį, ne tylus blogas matchas).
- **Umbrella-bias** (spike pastaba: dalis „miss'ų" geresni nei gold) — golden
  metrikos gali nepilnai atspindėti realios naudos; verta mažo žmogiško
  spot-check po shadow.
- **Taksonomijos pokyčiai be re-embed** — stale embeddings. Mitigacija: §3
  invalidacija + `embedding_stale` vėliava.

---

## Priedas — kodėl būtent taip (santrauka)

- Dense = vienintelis svertas, pajudinęs ~25% sieną (multi-need, phrase, hedge —
  visi wash; žr. `project_multineed_recall_ceiling`, `project_ambiguity_hedge_reframe`).
- pgvector ant jau-turimo Supabase = jokios naujos infra saugojimui.
- Adityvi fuzija (ne re-ranker, ne slug fabrikacija) = saugu, grįžtama, gerbia
  esamus invariantus.
- API embed = jokio serverio solo founder'iui; re-validate gate'as saugo nuo
  modelio-maišymo regresijos.
