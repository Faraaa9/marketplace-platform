# Phase 3 — dense semantinis kanalas (planas)

> Sukurta 2026-06-28. Tęsia `categorization-fix-brief.md` FAZĘ 3. Self-contained.

## Tikslas
Pakelti kategorijos parinkimo **precision@1** (dabar ~24.8% deterministinis ant
golden_300) — suteikiant matcheriui *prasmę*, ne tik žodžių sutapimą.

## Kodėl (kontekstas iš ankstesnių sesijų)
Įrodyta (2026-06-28), kad žodžių-sutapimo varikliu nepajudinsim ~25% sienos:
- Multi-need recall — wash ([[project_multineed_recall_ceiling]]).
- Phrase-brain secondary coverage — aklavietė.
- Ambiguity hedge / runner-up swap — atmesta (rescue@2 9.9%, ceiling 20.3%).
- ai-improve kategorijų priskyrimas iš viso negyvas (depth bug, PR#42).

Visi atsirėmė į tą patį: leksinis matcheris nesupranta, kad „perdažyti butą",
„nudažyti kambarį" ir kategorija „Vidaus apdailos darbai" yra tas pats poreikis —
nes nesutampa žodžiai. Dense embeddings tai sprendžia (matina pagal prasmę).

## Principai (privalomi)
- **Offline-first.** Visas Stage 0-3 daromas atskiroje research šakoje, NELIEČIANT
  produkcijos. Į prod einam tik kai gate'ai praeina.
- **Gate kiekvienam etapui.** Matuojam golden_300 (`scripts/eval-category-suggestions.ts`
  stiliumi). precision@1 PRIVALO kilti ir neregresuoti. Joks etapas neeina toliau
  be skaitinio pagerėjimo.
- **Niekada neišgalvok slug.** Kandidatai visada iš realios taksonomijos.
- **Latency.** Request-create jautrus — runtime tik query embed + vektorinė
  paieška + rerank; kategorijų embeddings precompute'inami offline.
- **Kaštai.** Solo founder — pradedam nuo API (jokių modelio serverių), Supabase
  pgvector saugojimui (jau esam ant Supabase).

## Etapai

### Stage 0 — offline dense eval harness (be prod)
Parašyti skriptą, kuris ant golden_300 matuoja dense retrieval: recall@K (ar
`gold_primary` patenka į top-K) ir precision@1. Modeliuoti pagal esamą leksinį
harness'ą. Be šito nieko nematuojam.

### Stage 1 — embedding modelio go/no-go spike (pigus, lemiamas)
- Kandidatai: `multilingual-e5-large` arba `BGE-M3` (LT-tinkami, multilingual),
  arba hosted API (Cohere `embed-multilingual-v3`, OpenAI `text-embedding-3`,
  Jina). LT = low-resource, tad LT kokybė = pagrindinė nežinomoji.
- Sukurti ~1942 kategorijų embeddings (name + aliases + breadcrumb) offline.
- Embed'inti 300 golden užklausų.
- **Matuoti dense-only recall@30 ir precision@1 vs 24.8% leksinė bazė.**
- **GATE:** jei dense-only recall@30 nepasiekia ~70% ARBA precision@1 nepralenkia
  leksinio aiškiai — LT dense signalas per silpnas, STABDOM Phase 3 (arba bandom
  kitą modelį). Kaina iki čia: ~centai (embed API) + kelios valandos. De-rizikuoja
  visą infra investiciją PRIEŠ ją darant.

### Stage 2 — hibridinė fuzija (leksinis + dense, RRF)
Sulieti esamą leksinį rankingą su dense rankingu per RRF (Reciprocal Rank Fusion).
Matuoti recall@K + precision@1 vs kiekvienas atskirai. Hibridas paprastai lenkia
abu (leksinis gaudo exact/retus terminus, dense — perfrazavimus).

### Stage 3 — cross-encoder rerank
Virš fuzuoto top-K uždėti cross-encoder reranker'į (pakeičia 12s Gemini):
`bge-reranker-v2-m3` (self-host) arba Cohere/Jina rerank API. Čia turėtų nukristi
didžiausias precision@1 šuolis. Padidinti K iki ~30-40 prieš rerank.
**GATE:** precision@1 po rerank — galutinis sprendimas, ar Phase 3 vertas prod.

### Stage 4 — produkcinis pjūvis (tik jei gate'ai praėjo)
- **Saugojimas:** Supabase **pgvector** (jau esam ant Supabase) — kategorijų
  embeddings lentelėje, precompute'inti offline + invaliduojami su taksonomijos
  pakeitimu.
- **Runtime srautas:** query embed (API) → pgvector top-K → RRF su leksiniu →
  rerank → grąžinti. Lexinis fallback jei embed/rerank timeout'ina.
- **Latency biudžetas:** query embed ~50-200ms (API) + pgvector ~ms + rerank
  ~100-300ms (API). Telpa, jei su tight timeout + leksiniu fallback. Apsvarstyti
  non-blocking (užpildyti po pradinio leksinio spėjimo).
- **Optional cascade:** LLM (Flash-Lite) TIK dviprasmiškoms — neprivaloma.

## Infra fork (founder sprendimas Stage 4)
| | API kelias (rekom. pradžiai) | Self-host kelias |
|---|---|---|
| Embeddings | Cohere/OpenAI/Jina — 0 infra, per-call $ | e5/BGE-M3 ant serverio — $ fiksuotas, reikia priežiūros |
| Reranker | Cohere/Jina rerank API | bge-reranker-v2-m3 ant serverio |
| Saugojimas | Supabase pgvector (abiem atvejais) | — |

**Rekomendacija:** pradėti **API + pgvector** (jokių modelio serverių solo
founder'iui). Self-host svarstyti tik jei kaštai/latency to reikalaus mastu.

## Rizikos
- **LT dense kokybė nežinoma** — Stage 1 spike tai de-rizikuoja už ~$1 prieš bet
  kokią infra. Tai svarbiausias planavimo įžvalga: pigus go/no-go pirma.
- **Latency** — rerank API gali nepatilpti request-create biudžete; planas B =
  non-blocking užpildymas arba leksinis-pirma + dense patikslina.
- **Kaštai mastu** — per-call embed+rerank × užklausų srautas; matuoti realiu
  tūriu prieš įsipareigojant.

## Kas pirmas
Stage 0 + Stage 1 (offline eval + embedding go/no-go) — pigu, lemiama, nepaliečia
prod. Viskas po to priklauso nuo Stage 1 gate'o.
