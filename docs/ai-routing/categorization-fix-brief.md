# UŽDUOTIS: pagerinti laisvo teksto → kategorijos priskyrimą (paslaugurinka.lt)

> Brief sukurtas 2026-06-27 po 50-užklausų eval + multi-agentų research. Self-contained — agentas neturi to pokalbio atminties.

## Kontekstas
paslaugurinka.lt — LT paslaugų marketplace. Klientas rašo laisvo teksto užklausą; pipeline parenka paslaugų kategoriją(-as). Tai maitina request↔provider MATCHING (matching lygina category id tapatybę — `src/lib/provider-eligibility.ts:38` `a.id===b.id`, `src/lib/request-notifications.ts:39` `categoryId IN matchSet`), tad kategorizavimo tikslumas kritinis.

Pipeline: `src/lib/category-suggestions.ts`, funkcija `suggestCategories({mode:"request", text, title, limit})`.
- Stage 1 (deterministinis): `normalize` (diakritikai nuimti) + `tokenize` (stopwords) + `stem`=pirmos 5 raidės (~:98) + `scoreCandidate` per name+aliases+**breadcrumb** (~:152; stem match +3 ~:172).
- Stage 2 (neprivalomas): Gemini rerank per OpenRouter, NIEKADA neišgalvoja slug.
- Taksonomija: ~2098 aktyvių service kategorijų (po 2026-06-27 dedup Stage 1), filtras `SERVICE_CATEGORY_WHERE`.

⚠ Patikrink visus file:line — kodas galėjo pasislinkti; cituojami iš 2026-06-27 būsenos.

## 6 klaidų klasės (iš realaus 50-užklausų eval, su pavyzdžiais)
1. ŠAKNŲ PAINIAVA: „pristatomas kaminas"→Gėlių PRISTATYMAS; „autoelektrikai"→Saulės modulių plovimas; „advokato"→Kūrybinės dirbtuvės vaikams; „elektriko"→Elektronikos prietaisų remontas. (stem „pristat"→„prist", „elektr"→„elekt"; +breadcrumb teršia.)
2. ANTRINIO TEKSTO TRIUKŠMAS: „apžiūros aktas DRAUDIMUI"→Automobilio techninė apžiūra; „Laukiu PASIŪLYMŲ"→Komercinių pasiūlymų rengimas. (tokenize be pozicijos svorio.)
3. PER SIAURAS PRIMARY kai užklausa PATI yra ta kategorija: „Trinkelių klojimas"→Trinkelių PAGRINDO PARUOŠIMAS; „sutvarkyti trinkeles"→Trinkelių VALYMAS.
4. MULTI-NEED suplojimas: „Griovimo+santechnika+elektra"→vienas siauras gabaliukas.
5. CONFIDENCE BEVERTIS: visi top = 0.95. Priežastis: `confidenceFor` hard-cap 0.95 (~:286-292; top ratio=1→visada 0.95) IR Gemini confidence perrašo (~:431-432, 588-609).
6. ŠIUKŠLINĖS „MARŠRUTŲ" KATEGORIJOS teršia kandidatus: „Keleivių pervežimas"→„Kaunas > Vilniaus oro uostas" tipo leaf'ai.
   Susiję: multi-need nukerta `~:612-615` (jei top≥0.9 → palieka 1; o top visada 0.95); `pickTopSuggestions perRootCap=3` request mode (~:251).

## TURIMI DUOMENŲ TURTAI (folder: `/Users/judyanncastillo/Documents/KATEGORIJOS + 200K-uzklausu/`)
- `data/routing/category-intelligence/phrase_category_stats.json` — 20 348 frazių: `top_category`, `top_category_share` (REALI P(kat|frazė), 0-1), `strength` (strong/medium/ambiguous/weak), `needs_context`, pilnas `category_distribution`. → kandidatų generatorius + tikra confidence.
- `.../category_phrase_summary.json` — 282 kat. × bucket'ai strong/medium/ambiguous/**negative_or_confusing**.
- `.../category_confusions.csv` — 282 poros su `shared_phrase_weight` (kada nepasitikėti vienu hit'u).
- `data/processed/golden_eval_300_labeled.jsonl` — 300 įrašų, VISI labeled; 254 `gold_primary_category`, 264 `gold_secondary_categories`, 46 `gold_is_ambiguous`, plius `gold_object_type`/`gold_work_type`. → GATAVAS offline eval harness.
- `data/processed/requests_all.parquet` — 200K raw užklausų (pyarrow/pandas yra).

## PRIOR IŠVADA (privaloma gerbti)
phrase-brain kaip RE-RANKER yra net-negatyvus (umbrella/plačios kategorijos dominuoja). Naudoti TIK kaip kandidatų generatorių / prior / confidence feature — NIEKADA kaip galutinį selektorių.

## OGRANIČENIA
Solo founder; OpenRouter prieinamas; lietuvių (mažai resursų NLP); kaštams jautrus (per-užklausą AI brangsta); užklausos kūrimas latency-jautrus; ~2098 kategorijų. Invariantas „niekada neišgalvok slug" privalo likti.

---

## FAZĖ 0 — EVAL HARNESS PIRMA (be jo nieko nekeisk)
Parašyk replay skriptą (modeliuok pagal `scripts/routing-eval-golden.ts` invokaciją: `npx ts-node --transpile-only -r ./scripts/_register-paths.js ...`; env per `dotenv` iš `.env.local`+`.env`), kuris leidžia `suggestCategories({mode:"request"})` ant visų `golden_eval_300_labeled.jsonl` ir skaičiuoja:
- **precision@1** (top vs `gold_primary_category`), **recall@3**, **multi-need F1** (vs `gold_secondary_categories`), **ambiguity-gate recall** (ar žemas confidence/clarify ten kur `gold_is_ambiguous`).

Užfiksuok DABARTINĮ BASELINE skaičių PRIEŠ bet kokį pakeitimą. Kiekvienas tolesnis pakeitimas matuojamas prieš šį baseline. NEpriimk pakeitimo, kuris regresuoja precision@1.

## FAZĖ 1 — pigūs fix'ai, jokios infra (klaidos 6, 5, 4). VISI EDITINA `category-suggestions.ts` → vienas agentas, viena šaka, nuosekliai.
- **(6) Route-junk filtras:** DB pirma surask route/locative leaf'us (slug/breadcrumb su „>", „oro uost", miestas-miestas pora). Išmesk juos iš request-mode kandidatų pool (kaip `SERVICE_CATEGORY_WHERE` gate). DB tik SELECT.
- **(5) Confidence:** (a) nustok leisti Gemini confidence perrašyti; (b) pakeisk deterministinį 0.95 hard-cap **top1/top2 score MARGIN** signalu; (c) fit izotoninę regresiją ant golden_300 (margin → P(correct)); (d) išvesk kalibruotą confidence → auto-accept / review / clarify gate'us.
- **(4) Multi-need:** išmesk/pakeisk `~:612-615` nukirtimą (jis remiasi melagingu 0.95) → leisk kelis strong hits iš skirtingų root'ų; per-label threshold, ne argmax.

Matuok golden_300 po kiekvieno. Commit fazę atskirai.

## FAZĖ 2 — phrase-brain kaip antras retriever (klaidos 1, 2, 3)
- **Prereq (blocker, NEPRIKLAUSOMAS — galima daryti lygiagrečiai su Faze 0/1):** `phrase_label_map.json` — phrase-brain naudoja ~250-397 paslaugos.lt raw labels; pipeline emituoja 2098 paslaugurinka slug'us. ~70% sutampa pavadinimu (auto), ~80 rankinis 1:N. Be šito Fazė 2 neveikia.
- Build `phrase_index.json` iš `phrase_category_stats` (normalize TA PAČIA `normalize()`; atmesk weak + total_count<15) → in-memory Map, cache modulio lygmeniu (kaip kategorijos).
- Runtime: ištrauk užklausos n-gramas (2-5 žodžių), lookup → inject phrase kandidatus į pool kaip ANTRĄ retrieverį (union su leksiniais). NE re-ranker. Strong frazė (share≥0.85, needs_context=false) gauna pakankamą bazinį score patekti į top.
- Confidence iš `top_category_share` kai yra phrase match.
- Slopink `negative_or_confusing_phrases` (klaida 2).

Matuok golden_300; stebėk kad phrase prior NEpadarytų to paties umbrella-bias (per-kategoriją recall).

## FAZĖ 3 — dense semantinis kanalas (tik jei lieka spraga) (klaida 1 sunkieji, 2 dense)
- Hibridinis: esamas leksinis + dense embeddings (BGE-M3 arba multilingual-e5-large, LT-tinkami) → RRF fusion → cross-encoder rerank (bge-reranker-v2-m3 self-host, arba jina/cohere rerank API) pakeičiant 12s Gemini. Precompute 2098 kat. embeddings offline; runtime tik query embed. Padidink K iki ~30-40. Neprivalomas LLM cascade (Flash-Lite) tik dviprasmiškoms.

Įvertink infra naštą solo founder'iui (servisas vs embedding API). Šitą pradžioje gali daryti kaip ATSKIRĄ research/spike šaką, nelietant produkcinio kelio.

## GAIRĖS
- Matuok golden_300 PRIEŠ/PO kiekvieno pakeitimo; nenuregresuok precision@1.
- phrase-brain = generator/prior/calibrator, NIEKADA selektorius.
- Išlaikyk „niekada neišgalvok slug".
- Saugok request-create latency.
- Ship fazė-po-fazės su eval gate; Fazė 0+1 nepriklausomos ir didžiausio ROI.

## SAUGUMAS (multi-agentų darbui)
- DB — TIK SELECT. Jokių migracijų / UPDATE / DELETE (taksonomijos dedup Stage 1 jau atliktas; Stage 2 NELIESTI).
- Kiekvienas lygiagretus agentas — SAVO git šakoje/worktree. NIEKADA du agentai vienu metu needitina `src/lib/category-suggestions.ts`.
- Prieš commit re-check `git status`; commit'ink TIK savo failus (repo dalinasi keli langai).
- Joks pakeitimas nesimerge'ina be golden_300 eval (precision@1 neregresuoja).
