# Phase 3 dense — offline spike (Stage 0+1, su rerank zondu)

Sukurta 2026-06-28. Offline go/no-go, **neliečia produkcijos**. Žr. planą
`../phase3-dense-plan.md` ir brief'ą `../categorization-fix-brief.md`.

## Rezultatas: GO

golden_300 (254 labeled užklausos), kategorijos parinkimas:

| Metodas | precision@1 | recall@3 | recall@30 |
|---|---|---|---|
| Leksinis (dabar prod) | 24.8% | 36.6% | — |
| Dense `intfloat/multilingual-e5-large` | **37.4%** | 51.6% | 81.5% |
| Dense + rerank `jinaai/jina-reranker-v2-base-multilingual` | 35.8% | 55.1% | — |

- **Dense vienas — didelis win LT** (+12.6pp p@1, +50% santykinai). „Ar dense veikia
  lietuviškai?" rizika pašalinta.
- **Bendrinis reranker'is p@1 nekelia** (35.8 < 37.4), tik recall@3 (→55.1). Stiprus
  bi-encoder lenkia ne-domeno cross-encoder'į. Rerank atidėtas (tuninti arba praleisti).
- Dalis dense „miss'ų" geresni nei umbrella gold → tikra precizija dar aukštesnė.

## Reprodukcija (fastembed/ONNX, be torch, be API rakto)

```bash
python3.11 -m venv venv && ./venv/bin/python -m pip install fastembed numpy
# 1. eksportuoti kategorijų tekstus iš DB (reikia .env.local):
npx ts-node --transpile-only -r ./scripts/_register-paths.js \
  --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' \
  docs/ai-routing/phase3-spike/export-categories-for-dense.ts   # -> categories.jsonl
# 2. dense eval (recall@K + precision@1):
./venv/bin/python docs/ai-routing/phase3-spike/dense_eval.py intfloat/multilingual-e5-large
# 3. dense + rerank (cache'ina e5 vektorius .npy):
./venv/bin/python docs/ai-routing/phase3-spike/dense_rerank.py
```

`categories.jsonl`, `*.npy`, `*.out` yra artefaktai (gitignored) — negeneruojami repo.

## Pastabos
- e5-large embed ~6min CPU (1916 kat. + 254 užkl.), vienkartinis (offline precompute).
- Rerank ant CPU lėtas (~2.9s/užkl. @30, ~0.45s @10) — runtime reikės API/GPU arba praleisti.
- Kategorijų tekstas = `name. aliases. breadcrumb`, tik depth>0 (kaip leksinis).
- Pavadinimų lyginimas = ta pati `fold()` kaip TS harness (LT diakritikai).
