# Kategorijų pasirinkimo (picker) analizė + taksonomijos dublikatų problema

**Data:** 2026-06-15 · **Autorius:** analizė su Claude Code · **Auditorija:** komanda peržiūrai
**Susiję artefaktai:** [taxonomy-dedup-dryrun.md](taxonomy-dedup-dryrun.md) (suliejimo žemėlapis), `prisma/manual-migrations/20260615_deactivate_legacy_category_trees.sql`

---

## 0. TL;DR (vienas ekranas)

1. Pradėjom nuo UI skundo: naujos užklausos kategorijų pasirinkime „kategorijos nesimato", o `/meistrai` — gerai.
2. **Tai buvo tas pats komponentas ir tie patys duomenys** abiejose vietose. Skirtumas — vienur naršoma, kitur **ieškoma**. Paieška turėjo 2 defektus (užtvindymą ir nukirptus vardus). **Pataisyta ir patikrinta naršyklėje** (kol kas nekomitinta).
3. Sutvarkius paiešką, **atsidengė tikroji, gilesnė problema: duomenys**. Taksonomijoje ta pati paslauga įrašyta po kelis kartus skirtingose šakose.
4. Skaičiai: iš **3255** kategorijų **1313 (~40%) yra pertekliniai dublikatai**; 820 pavadinimų kartojasi (iki 8 kartų).
5. Tai kenkia ne tik UX — dar ir **užklausų↔tiekėjų matchinimui, analitikai ir senų nuorodų suderinamumui**. Tikras dedup darbas: ~**2,5–4 d.**, didžioji dalis — 108 „sunkių" grupių peržiūra (ne mechanika).

---

## 1. Nuo ko prasidėjo

Skundas: tiekėjas/klientas atsidaro kategorijų pasirinkimą, pradeda vesti (pvz. „b" arba „židin") ir arba nieko neperskaito (vardai nukirpti), arba gauna šimtus nereikšmingų variantų. Klausimas buvo: *kodėl `/meistrai` veikia gerai, o naujos užklausos sraute — ne?*

## 2. Tyrimo eiga ir pirmas radinys

- `/meistrai` filtras (`ProviderFilterBar`) ir naujos užklausos srautas (`InlineListingCard`) **abu** naudoja tą patį komponentą `GroupedCategoryPicker` ir **tą patį** duomenų šaltinį `/api/service-categories` → `getServiceCategoryGroups()`.
- Vadinasi, „vienur gerai, kitur ne" — ne dėl skirtingų duomenų. Skirtumas: `/meistrai` paprastai **naršoma** (švarus grupių sąrašas), o užklausos sraute buvo **ieškoma**.
- Paieška turėjo du defektus (žr. 3 sk.).

> Pastaba: `src/app/api/service-categories/route.ts` komentaras sako „9 roots", o realiai aktyvių šaknų yra **26**. Tik pasenęs komentaras.

## 3. UI pataisymai — KAS PADARYTA (`src/components/categories/GroupedCategoryPicker.tsx`)

Visi pakeitimai viename bendrame komponente (paveikia ir užklausų srautą, ir `/meistrai`, ir `/uzklausos` filtrą — tai gerai, nes defektai buvo visur).

| # | Defektas | Pataisymas | Patikrinta naršyklėje |
|---|---|---|---|
| 1 | **Paieškos užtvindymas.** Atitikmeniu buvo laikoma, jei užklausa pataiko į šaknies pavadinimą ar visą protėvių kelią. „b" yra žodyje „Sta**ty-b**os" → išmesdavo visą 554-ių pomedį. „b" grąžindavo **1155** eilutes. | Atitikmuo tik pagal **paties įrašo vardą**; prefiksai rikiuojami pirmi. | „b": 1155 → **981** (visos su „b"); „baldu surink" → **5**; „stat" → **71** |
| 2 | **Kelias (breadcrumb) nukirptas** ir kartojo lapą. | Rodom tik **protėvių šaką** (be lapo), atskiroje eilutėje, su laužymu (`whitespace-normal`). | Visi keliai pilni, `truncated=false` |
| 3 | **Ilgi vardai nukirpti** naršant (pvz. „Architektai, projektavim…"). | Vardai **laužiami į 2 eilutes** (`break-words`), ne `truncate`. | „Internetas, IT", „Statybos" — visi vardai matomi |
| 4 | **Per dideli tarpai** atsiradus laužymui. | `py-2.5` → `py-2`, `leading-tight`. | 1 eil. = 36px, 2 eil. = 49px |

**Statusas:** veikia, patikrinta per preview. **Nekomitinta** — laukia tavo sprendimo dėl komito/PR.

## 4. Tikroji problema, kurią atskleidė UI pataisymai

Kai paieška tapo tiksli, paaiškėjo, kodėl „židin" vis tiek meta tiek daug: **taksonomijoje ta pati paslauga egzistuoja kaip keli atskiri įrašai (skirtingi ID), pakabinti po skirtingais tėvais.**

Pavyzdys (`Židinių montavimas` — 4 atskiri ID):
- Statybos, apdaila / Židinių meistrai
- Interjeras, baldai / Židinių meistrai
- Statybos, apdaila / Katilų montavimas
- Buitinės paslaugos / Katilų montavimas

Meistrui jie visi reiškia tą patį. **Analogija:** ta pati knyga padėta ant 5 lentynų — kataloge randi 5 įrašus, nors knyga viena.

## 5. Įrodymai (tik `SELECT` užklausos prod DB, niekas nekeista)

| Rodiklis | Skaičius |
|---|---|
| Aktyvūs kategorijų įrašai | 3255 |
| Aktyvios šaknys | 26 |
| Unikalūs pavadinimai | 1942 |
| Pavadinimai, kurie kartojasi | **820** (iki **8** kartų) |
| Pertekliniai dublikatai (kopijos) | **1313 (~40%)** |

Pavyzdžiui „židin" stiebas: `Židinių apdaila` ×5, `Židinių montavimas` ×4, `Lauko židiniai iš akmens` ×4, `Židinių meistrai` ×3, `Židinių mūrijimas` ×3.

## 6. Su kokiomis problemomis susiduriam

### 6.1. UX — tiekėjo/kliento patirtis (matomas simptomas)
Paprastas darbininkas, vesdamas „židin", mato ~23 įrašus vietoj ~7 unikalių. Skiriasi tik smulkus pilkas kelias. Tai būtent ta persona, kuriai turi būti lengviausia. (UI pataisymai padarė tai bent **įskaitoma**, bet dublikatų nepašalina.)

### 6.2. Užklausų ↔ tiekėjų matchinimas (rimčiausia, nematoma)
Tiekėjas pasirenka „Židinių montavimas" su ID #1, klientas pateikia užklausą su „Židinių montavimas" ID #3 → sistema **nemato, kad tai ta pati paslauga**. Realiai gali būti **prarandami lead'ai**. Tikėtina, kad tai tiesiogiai susiję su mūsų routingo „DISTINCT_TAX" dviprasmybe (offline replay rodė ~57% atvejų), dėl kurios v4 multi-routing Phase 2 sustabdytas. **Hipotezė tikrintina**, bet dedup turėtų šią dviprasmybę gerokai sumažinti.

### 6.3. Duomenų vientisumas / analitika
Paklausa ir pasiūla „išsibarsto" po kelis ID. „Perkraustymo paslaugos" populiarumas dalijasi į 4 ID → nepatikima statistika, blogesnis kategorijų prioritetizavimas.

### 6.4. SEO (patikslinta — mažesnė rizika nei atrodo)
Kategorijų slug'ai **nėra** atskirai indeksuojami: faceted `/meistrai?category=` yra `noindex` ir ne sitemap'e; SEO turinys gyvena atskiruose `/paslaugos/*` landinguose (`SEO_LANDINGS`). **Tai NE reitingų avarija.** BET: po dedup seni `?category=<slug>` linkai (el. laiškuose, tracking nuorodose, žymose) nustotų resolvintis → reikia **alias/redirect**, kad nelūžtų. Jau yra `category_aliases` lentelė — panaudojam ją.

### 6.5. Palaikymas + AI kokybė
~40% medžio — triukšmas. AI kategorijų siūlymas ir matcher'is maitinami dubliuotu medžiu → prastesni siūlymai, sunkiau administruoti.

### 6.6. Įdėtiniai dublikatai (techninis niuansas)
Pasitaiko dublikatas-tėvas su dublikatu-vaiku (pvz. `Akmens mūras…` → `Lauko židiniai iš akmens`). Suliejant tėvą reikia pirma sutvarkyti vaikus, kitaip liks našlaičiai. Tokios grupės eina į „sunkias" (108) ir liejamos tvarka „gilesni pirma".

## 7. Kodėl taip atsitiko (hipotezė)
Dublikatai greičiausiai atsirado vykdant **taksonomijos suvienodinimo epą** (dvi senos kategorijų sistemos buvo sujungtos). Vietoj to, kad paslauga egzistuotų vieną kartą ir būtų rodoma keliose vietose, ji buvo **nukopijuota** po kiekvienu tinkamu tėvu. Tai natūraliai įeina į to epo **Phase 5**.

## 8. Sprendimo variantai

| Variantas | Ką daro | Kaina | Trūkumas |
|---|---|---|---|
| **A. Tik UI dedup** | Picker'yje grupuoti pagal vardą, rodyti vieną kartą | ~2–3 val. | Matchinimas, analitika, AI vis tiek mato dublikatus. Užmaskuoja, netaiso. |
| **B. Duomenų dedup** (rekomenduojama) | Palikti vieną kanoninį ID, kitus sulieti + alias seniems slug'ams | ~2,5–4 d. | Reikia peržiūrėti 108 „sunkias" grupes |

## 9. Dedup darbo apimtis (jei rinksimės B)

| Etapas | Apimtis | Laikas |
|---|---|---|
| Auto-suliejimas (712 grupių, vien lapai) | taisyklė parenka kanoninį | ~½–1 d. |
| 108 „sunkių" grupių peržiūra (žmogus tvirtina „namus") | 16 su naudojimu ⚠️ + 92 be | ~1–2 d. |
| Nuorodų perkėlimas | **tik 9 nuorodos** (4 tiekėjų pasirinkimai + 5 užklausų kat.) | val. |
| Senų slug'ų alias/redirect | 1313 | ~½ d. |
| Validacija (`pnpm test:routing-all` + golden eval, staging dry-run) | — | ~½ d. |

**Rizika duomenims maža:** realaus naudojimo ant šalinamų kopijų beveik nėra (9 nuorodos), o kol šalinam tik `isActive=false` (ne fizinis trynimas), rollback = vienas `UPDATE`. Pilnas „kas su kuo liejasi" žemėlapis — [taxonomy-dedup-dryrun.md](taxonomy-dedup-dryrun.md).

## 10. Rekomendacija ir žingsniai
1. **Sukomituoti UI pataisymus** (jie naudingi nepriklausomai nuo dedup) — pirmas, greitas laimėjimas.
2. **Patvirtinti kryptį B** (duomenų dedup) kaip Phase 5 dalį.
3. Komandai **peržiūrėti 108 „sunkias" grupes** (dry-run dokumente) — ypač 16 su ⚠️.
4. Po patvirtinimo — paruošti migraciją (išjungimas + 9 perkėlimai + alias) ir paleisti staging'e su routingo eval.

## 11. Atviri klausimai komandai
- Ar dedup darom **dabar** (kaip Phase 5), ar pirma tik UI stop-gap (A)?
- Kanoninio „namų" taisyklė — ar tinka „daugiausiai naudojimo → turi vaikų → mažesnis gylis"? Ar yra šaknų, kurios visada turi laimėti (pvz. IT paslaugos → „Internetas, IT", ne „Paslaugos verslui")?
- Ar tikrinam hipotezę, kad dedup sumažina routingo „DISTINCT_TAX" dviprasmybę (atrakintų Phase 2)?
- Senų `?category=` linkų alias — saugom amžinai ar su galiojimu?

## 12. Kaip atkartoti analizę
Visos užklausos — `SELECT` only. Pilną suliejimo žemėlapį generuojanti SQL yra [taxonomy-dedup-dryrun.md](taxonomy-dedup-dryrun.md) 8 skyriuje. Esminiai skaičiai:

```sql
-- Dublikatų mastas
WITH canon AS (
  SELECT id, name FROM categories
  WHERE "pageType"='service' AND "externalSource"='paslaugurinka-taxonomy' AND "isActive"=true
)
SELECT count(*) AS viso, count(DISTINCT name) AS unikalus,
       count(*) - count(DISTINCT name) AS pertekliniai_dublikatai
FROM canon;
```
