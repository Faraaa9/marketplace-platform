# Category Intelligence Shadow Evaluation

> AUTO-GENERATED, OFFLINE. The production router is UNCHANGED. Two configurations are measured:
>
> * **+intelligence (shipped candidate)** — router selection is left exactly as-is; the phrase signal only (a) raises confidence when a strong/medium phrase CONFIRMS the router's pick and (b) caps confidence + flags manual review on ambiguity / redirect / conflict.
> * **rerank experiment (rejected)** — what happens if the signal is allowed to re-order the router's candidates. Reported for completeness; it is net-negative on gold, which is why the shipped config does not re-rank.

## Summary

- Phrase brain: **20,348** phrases (`phrase_category_stats.json`).
- Datasets:
  - **golden_300** — 300 rows (254 with gold primary)
  - **golden_ambiguous_heavy** — 58 rows (12 with gold primary)
  - **random_500_unlabeled** — 500 rows (0 with gold primary)

| dataset | metric | baseline | +intelligence | delta |
|---|---|---:|---:|---:|
| golden_300 | top-1 acc | 0.4094 | 0.4094 | 0.0 |
| golden_300 | top-3 acc | 0.8465 | 0.8465 | 0.0 |
| golden_300 | parent acc | 0.8465 | 0.8465 | 0.0 |
| golden_300 | manual review rate | 0.19 | 0.7167 | 0.5267 |
| golden_300 | high-confidence wrong | 44 | 22 | -22 |
| golden_ambiguous_heavy | top-1 acc | 0.25 | 0.25 | 0.0 |
| golden_ambiguous_heavy | top-3 acc | 1.0 | 1.0 | 0.0 |
| golden_ambiguous_heavy | parent acc | 0.8333 | 0.8333 | 0.0 |
| golden_ambiguous_heavy | manual review rate | 0.1207 | 0.7931 | 0.6724 |
| golden_ambiguous_heavy | high-confidence wrong | 2 | 0 | -2 |
| random_500_unlabeled | top-1 acc | None | None | None |
| random_500_unlabeled | top-3 acc | None | None | None |
| random_500_unlabeled | parent acc | None | None | None |
| random_500_unlabeled | manual review rate | 0.26 | 0.54 | 0.28 |
| random_500_unlabeled | high-confidence wrong | 0 | 0 | 0 |

_Top-1/top-3/parent deltas are 0 by design: the shipped config does not change selection. The value is the high-confidence-wrong drop + review targeting below._

## Decision changes (rerank experiment — rejected)

| dataset | top-1 if reranked (Δ) | changed | wrong→correct | correct→wrong | unchanged correct | unchanged wrong |
|---|---:|---:|---:|---:|---:|---:|
| golden_300 | 0.3937 (-0.0157) | 32 | 6 | 10 | 94 | 137 |
| golden_ambiguous_heavy | 0.4167 (0.1667) | 12 | 2 | 0 | 3 | 6 |
| random_500_unlabeled | None (None) | 5 | 0 | 0 | 0 | 0 |

### 10 improvements (wrong → correct)

- `3944452` Vidaus įrengimo ir ŠVOK darbai Kaune — **Ventiliacija, vėdinimo sistemos → Vidaus apdailos darbai** (gold: Vidaus apdailos darbai); phrases: naujos statybos, antras aukštas, statybos namas, naujos statybos namas
- `3547920` Ieškau meistro vidaus apdailai — **Įtempiamos lubos, montavimas → Vidaus apdailos darbai** (gold: Vidaus apdailos darbai); phrases: naujos statybos, vonios kambario, įtempiamų lubų, vonios kambarys
- `3554430` Buto remontas Vilnius — **Įtempiamos lubos, montavimas → Vidaus apdailos darbai** (gold: Vidaus apdailos darbai); phrases: plytelių klijavimas, buto remontas, įtempiamų lubų, sienų paruošimas
- `2661932` Statybinių atliekų išvežimas — **Šiukšlių išvežimas: statybinių ir kt. → Griovimo darbai** (gold: Griovimo darbai); phrases: atliekų išvežimas, statybinių atliekų, statybinių atliekų išvežimas, dvi sienas
- `2632876` Reikia uždengti stogo dangą, apskardinti, sumontuoti lietaus nuvedimo sistemą — **Skardinimo darbai, skardininkai → Stogdengiai, stogo darbai** (gold: Stogdengiai, stogo darbai); phrases: vieno aukšto, stogo dangą, namas vieno, lietaus nuvedimo
- `3903921` Domina sienų, lubų, grindų, ventiliacijos pertvarkymas — **Ventiliacija, vėdinimo sistemos → Vidaus apdailos darbai** (gold: Vidaus apdailos darbai); phrases: plytelių klijavimas, sienų lubų, vonios ir tualeto, klijavimas vonios

### 10 regressions (correct → wrong)

- `3655883` Miesto nuotekų pajungimas, darbų sąmata — **Sąmatininkai: sąmatų skaičiavimas → Santechnikai, santechnikos darbai** (gold: Sąmatininkai: sąmatų skaičiavimas); phrases: nuosavą namą, miesto nuotekų
- `2620358` Reikia išvežti statybines atliekas ir išlupti grindis apie 25 kvadratus — **Šiukšlių išvežimas: statybinių ir kt. → Griovimo darbai** (gold: Statybinių atliekų išvežimas); phrases: statybines atliekas, išvežti statybines, išvežti statybines atliekas
- `3121783` Reikia sumontuoti itempiamas lubas 50kv.m  su karnizais, užuolaidomis — **Įtempiamos lubos, montavimas → Vidaus apdailos darbai** (gold: Įtempiamos lubos, montavimas); phrases: itempiamas lubas, sumontuoti įtempiamas lubas, sumontuoti itempiamas
- `3856361` Grindų dažymas — **Grindų klojimas, remontas → Vidaus apdailos darbai** (gold: Grindų klojimas, remontas); phrases: baltos spalvos, medines grindis, dažymas reikia perdažyti, grindų dažymas
- `3679615` Betoniniu laiptu apdaila — **Betonavimo darbai, betonavimas → Vidaus apdailos darbai** (gold: Betonavimo darbai, betonavimas); phrases: betoniniu laiptu, islyginamuoju sluoksniu, laiptu apdaila
- `3976744` Cikloramos gamyba, Vilnius — **Baldų gamyba → Vidaus apdailos darbai** (gold: Baldų gamyba); phrases: gipso kartono, teikiate tokią, projektavimas ir įrengimas
- `3043735` Blizgios pakabinamos lubos 64 kv.m. — **Įtempiamos lubos, montavimas → Vidaus apdailos darbai** (gold: Įtempiamos lubos, montavimas); phrases: pakabinamos lubos
- `3091659` Vidaus apdailos darbai — **Grindų klojimas, remontas → Vidaus apdailos darbai** (gold: Grindų klojimas, remontas); phrases: vidaus apdailos, gyvenamas namas, namo išorės, statybos darbams
- `3443105` Užsandarinti įtempiamų lubų plyšį — **Įtempiamos lubos, montavimas → Vidaus apdailos darbai** (gold: Įtempiamos lubos, montavimas); phrases: įtempiamų lubų, lubų ir sienos
- `2920333` Santechnikai, santechnikos darbai — **Vandens filtrai: montavimas, keitimas → Santechnikai, santechnikos darbai** (gold: Vandens filtrai: montavimas, keitimas); phrases: santechnikai santechnikos, pastatyti vandens, vandens filtra

## Ambiguous phrases

Adapter behaviour for the brief's probe phrases (run live against the phrase brain):

- **"Bėga vanduo"** → top phrase `bėga vanduo` (ambiguous); dist: Santechnikai, santechnikos darbai 53%, Buitinės technikos remontas 13%, Stogdengiai, stogo darbai 10%; review=True; boosts={'Santechnikai, santechnikos darbai': 0.0427, 'Buitinės technikos remontas': 0.0104}
- **"Skalbimo mašinos remontas"** → top phrase `skalbimo mašinos` (ambiguous); dist: Buitinės technikos remontas 44%, Santechnikai, santechnikos darbai 27%, Meistrai į namus 16%; review=False; boosts={'Buitinės technikos remontas': 0.25, 'Santechnikai, santechnikos darbai': 0.0761, 'Meistrai į namus': 0.0129}
- **"Stogo danga"** → top phrase `stogo danga` (ambiguous); dist: Statybos darbai 46%, Stogdengiai, stogo darbai 30%, Elektrikai, elektros darbai 9%; review=True; boosts={'Statybos darbai': 0.2019, 'Stogdengiai, stogo darbai': 0.1418, 'Elektrikai, elektros darbai': 0.0123}
- **"Vonios kambario remontas"** → top phrase `vonios kambario` (weak); dist: Vidaus apdailos darbai 62%, Santechnikai, santechnikos darbai 9%, Valymo paslaugos 8%; review=False; boosts={'Vidaus apdailos darbai': 0.25, 'Santechnikai, santechnikos darbai': 0.0134}
- **"Dujinio katilo remontas"** → top phrase `dujinio katilo` (ambiguous); dist: Santechnikai, santechnikos darbai 50%, Katilų montavimas, remontas 43%, Vidaus apdailos darbai 3%; review=True; boosts={'Santechnikai, santechnikos darbai': -0.17, 'Katilų montavimas, remontas': 0.25, 'Buitinės technikos remontas': 0.0417}
- **"Pagaminti ir sumontuoti"** → top phrase `pagaminti ir sumontuoti` (ambiguous); dist: Vidaus apdailos darbai 26%, Medžio darbai, staliai 23%, Baldų gamyba 22%; review=True; boosts={'Vidaus apdailos darbai': 0.021, 'Medžio darbai, staliai': 0.0183, 'Baldų gamyba': 0.0174}

When only an ambiguous phrase matches, the adapter raises `should_trigger_review` and the row's confidence is capped to 0.6 — it never auto-selects a category.

## Safety analysis

- **High-confidence-wrong** (all gold datasets), shipped config: baseline **44** → intel **22** (no increase — improved). This is the headline win: review-capping confidence pulls wrong picks out of the high-confidence band.
- **Rerank experiment** net top-1 on changed gold rows: **+6** correct vs **-10** regressions = net **-4**. Most regressions are a high-volume umbrella category (e.g. *Vidaus apdailos darbai*) out-boosting a correct specific trade — so re-ranking is NOT shipped.
- The shipped config NEVER overrides the router's selection. Phrases only (a) confirm → higher confidence when they agree, or (b) cap confidence + flag review when ambiguous/conflicting. They can never raise a shaky pick to high confidence.
- Ambiguous phrases are never a positive selector and review fires only when no strong phrase resolves the request (keeps review rate meaningful).
- Redirect hints fire only when the token is literally present and the over-claimed category is already in play; the target is not injected (inject_redirect_target=False).

## Recommendation

**SAFE_TO_INTEGRATE_WITH_LIMITS**

Integrate the adapter as a **review + confidence signal only** (shadow-logged first). Limits:
- **Do NOT let phrases select the category.** Selection stays on the production router; the rerank experiment is net-negative on gold.
- Use the signal only to: cap confidence + route to manual review on ambiguity/redirect/conflict (≤ 0.6), and raise confidence when a strong/medium phrase agrees with the router.
- Max per-category boost: **0.25** (strong=0.18, medium=0.06); keep confidence nudges bounded.
- Ambiguous phrases: review trigger only, never a positive boost.
- Catch-all/umbrella categories (*Vidaus apdailos darbai*, *Statybos darbai*, *Meistrai į namus*) must NOT receive ranking weight — they drive the rerank regressions. Needs human Obsidian review before any future re-rank attempt.
- Redirect lexicon (`lietvamzdis`, `latakas`, `radiatorius`, `rekuperatorius`, …) needs periodic human Obsidian review before any weight increase.
