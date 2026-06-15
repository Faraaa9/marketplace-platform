# Category selection — baseline measurement

Set: `data/routing/eval/category-selection-baseline.jsonl` — 258 labeled Lithuanian queries across 26 root branches.
Mode: deterministic `suggestCategories` (AI rerank OFF). Audit writes stubbed; taxonomy read live. Measurement only — no production changes.
Acceptable-set overlay: 0/258 queries have a non-empty acceptable set (a pick counts for top-1/top-3 if it is in the set; 0 = pure exact-id).

> CAVEAT: every number is only as good as the labels. The script prints 15 random {query, expected} pairs at the top of its stdout — eyeball those first.

## Aggregate (deterministic)

| metric | value |
|---|---|
| top-1 accuracy (exact specific category) | 17.8% (46/258) |
| top-3 accuracy | 22.1% (57/258) |
| root-branch accuracy (right branch, any leaf) | 42.6% (110/258) |
| abstain rate (returned nothing) | 3.5% (9/258) |

## AI rerank delta

_Not run (deterministic baseline only). Re-run with `EVAL_WITH_AI=1` to add the AI pass — note it makes one paid OpenRouter call per query._

## Per-branch (the point — uneven coverage made visible)

| branch | n | top-1 | top-3 | root | abstain | most common wrong top-1 |
|---|--:|--:|--:|--:|--:|---|
| Aplinka, sodas | 10 | 20.0% | 20.0% | 50.0% | 10.0% | Žolės pjovimas (×2) |
| Apranga, papuošalai, aksesuarai | 10 | 10.0% | 10.0% | 30.0% | 0.0% | Kailinių siuvimas pagal individualius užsakymas (×2) |
| Buitinės paslaugos | 10 | 0.0% | 0.0% | 20.0% | 20.0% | Kaminų įdėklų valymas (×1) |
| Dailė, menai, keramika | 10 | 10.0% | 10.0% | 10.0% | 0.0% | Antspaudų gamyba (×1) |
| Dokumentai, tyrimai, konsultavimas | 10 | 30.0% | 50.0% | 40.0% | 10.0% | CV rašymas su konsultacija (×1) |
| Ezoterika, dvasinės paslaugos | 10 | 60.0% | 60.0% | 60.0% | 0.0% | Žmogaus patikimumo tikrinimas (×1) |
| Gamyba, prototipavimas, techniniai darbai | 10 | 20.0% | 30.0% | 50.0% | 0.0% | 3D Detalių gamyba, atkūrimas (×2) |
| Grožio paslaugos | 10 | 40.0% | 50.0% | 90.0% | 0.0% | Barzdos formavimas (×1) |
| Interjeras, baldai | 10 | 20.0% | 30.0% | 20.0% | 0.0% | Užuolaidų siuvimas (×1) |
| Internetas, IT | 10 | 20.0% | 20.0% | 70.0% | 10.0% | Telefono ekrano keitimas (×2) |
| Kitos paslaugos | 10 | 30.0% | 40.0% | 30.0% | 0.0% | Giluminiai vandens gręžiniai (×3) |
| Laisvalaikis, pramogos, turizmas | 10 | 40.0% | 40.0% | 70.0% | 0.0% | Vaikų gimtadienių, švenčių vedimas (×2) |
| Maistas, konditerija | 10 | 10.0% | 10.0% | 10.0% | 0.0% | Mobilus kokteilių baras vakarėlyje (×2) |
| Mokymai, kursai, kalbos | 10 | 0.0% | 10.0% | 60.0% | 0.0% | Vestuvinio šokio pastatymas, pamokos (×2) |
| NT ir tarpininkavimas | 10 | 30.0% | 30.0% | 40.0% | 0.0% | Namo pridavimas (×1) |
| Nuomos paslaugos | 10 | 0.0% | 0.0% | 10.0% | 0.0% | Irklencių (SUP) nuoma (×1) |
| Paslaugos augintiniams | 10 | 10.0% | 20.0% | 20.0% | 10.0% | Nagų dailė (×1) |
| Paslaugos verslui | 9 | 0.0% | 0.0% | 44.4% | 0.0% | Android aplikacijų kūrimas (×1) |
| Prekyba | 10 | 20.0% | 20.0% | 20.0% | 0.0% | El. parduotuvių kūrimas (×2) |
| Reklama, dizainas, spauda | 10 | 10.0% | 10.0% | 20.0% | 10.0% | Antspaudų gamyba (×1) |
| Renginiai, šventės | 9 | 0.0% | 0.0% | 77.8% | 11.1% | Vestuvių muzikantai (×2) |
| Sportas, treniruotės | 10 | 40.0% | 60.0% | 40.0% | 0.0% | Individualios jogos treniruotės (×2) |
| Statybos, apdaila | 10 | 0.0% | 0.0% | 90.0% | 0.0% | Giluminiai vandens gręžiniai (×1) |
| Sveikata, gydymas | 10 | 30.0% | 40.0% | 60.0% | 0.0% | Klasikinis nugaros masažas (×2) |
| Tradiciniai amatai | 10 | 10.0% | 10.0% | 30.0% | 0.0% | Vestuvinių suknelių nuoma (×2) |
| Transportas | 10 | 0.0% | 0.0% | 50.0% | 10.0% | Automobilių nuoma su vairuotoju (×2) |

## By difficulty (deterministic top-1)

| difficulty | n | top-1 | top-3 | abstain |
|---|--:|--:|--:|--:|
| ambiguous | 53 | 9.4% | 20.8% | 1.9% |
| normal | 27 | 14.8% | 14.8% | 3.7% |
| short | 74 | 25.7% | 28.4% | 2.7% |
| slang | 53 | 7.5% | 13.2% | 5.7% |
| typo | 51 | 27.5% | 27.5% | 3.9% |
