# Greičiausias meistro onboardingas — planas

> Tikslas: meistras (santechnikas, elektrikas, gipsininkas — žmonės, kurie mažai
> naudoja kompiuterį) gali per ~60 sek. ir kelis bakstelėjimus turėti gyvą,
> randamą, kontaktuojamą profilį. Įveda „elektrikas" → iškart gauna elektriko
> darbus. Viskas kita — vėliau, neprivaloma.

## 0. TL;DR

Šiandien onboardingas yra **3 ekranai prieš naudą** (registracija → el. pašto
patvirtinimas → AI profilio generavimas), o profilio žingsnis priverstinai veda
per AI generavimą (URL scrape arba „nuo nulio" + kelių sekundžių laukimas,
priklauso nuo OpenRouter, gali pakibti). Tai per daug.

Siūlymas: **1 ekranas, 4 bakstelėjimai.** Ką dirbi → kur → telefonas → vardas.
Profilis gyvas. Visa kita (aprašymas, nuotraukos, kainos, rekvizitai) — po to,
neprivaloma, su „sustiprink profilį" checklist'u. AI lieka kaip *neprivalomas
pagalbininkas*, ne kaip vartai.

Beveik viskas jau yra kode — daugiausia jungiam esamus blokus, ne kuriam naują.

---

## 1. Kodėl dabar sunku (diagnozė)

| Friction | Kur | Kodėl skauda meistrui |
|---|---|---|
| Du atskiri etapai: paskyra + profilis | `/registruotis` → `/patvirtinti` → `/meistrai/kurti-profili` | 3 ekranai ir „eik tikrink el. paštą" prieš bet kokią naudą |
| AI generavimo vartai | `AIProfileSetup.tsx` (672 eil.) | „Įklijuok paslaugos.lt nuorodą" — dauguma neturi; „nuo nulio" vis tiek reikia įmonės pavadinimo + paslaugų pastraipos; kelių sek. laukimas, priklauso nuo OpenRouter (yra pakibimų istorija), 3 gen./24h limitas |
| Hierarchinis kategorijų pikeris | `GroupedCategoryPicker` po generavimo | Reikia naršyti medį ir suprasti taksonomiją |
| Privalomas aprašymas | `description` 20–2000 simb. (PUT validacija) | Verčia rašyti tekstą, kad galėtum egzistuoti |

Esmė: sistema renka *daug* prieš duodama *bet ką*. O profilio analizė
(`meistras-profile-analysis.md`) jau įrodė: **sąžiningas plonas > pilnas
fabrikuotas**. Onboardingas turi rinkti minimumą gyvybei, gylį atidėti.

---

## 2. Minimumas, kad profilis būtų naudingas

Kad meistras būtų **randamas + kontaktuojamas**, reikia tik 4 dalykų:

1. **Ką dirbi** → kategorija(-os). Tai ir auto-routingas darbams.
2. **Kur dirbi** → miestas (lokatyvas).
3. **Telefonas** → meistrai nori, kad jiems *paskambintų*.
4. **Vardas** → jau turim iš paskyros, tik patvirtinam.

Viskas. `aprašymas`, `nuotraukos`, `kainos`, `patirtis`, `rekvizitai`,
`garantija` — **neprivaloma**, siūloma po to.

---

## 3. Siūlomas srautas (1 ekranas, 4 bakstelėjimai)

### Q1 — „Ką dirbi?" (svarbiausia, čia įvyksta magija)
Vienas paieškos laukas. Rašo „elek" → iškart pasirodo chip'ai: **Elektrikas**,
Elektros instaliacija, … Bakstelėja. Gali pridėti 2–3 dar.

- Tai vienu metu yra ir **kategorijos pasirinkimas**, ir **darbų routingas**.
- Kadangi `expandToMatchSet()` išplečia pasirinktą amatą į *visą jo pomedį*,
  vienas bakstelėjimas „Elektrikas" = tinka **kiekvienai** elektros užklausai
  (visi vaikiniai darbai). Tiksliai „įvedė elektrikas → gauna elektriko darbus".
- Netvarkingam įvedimui („darau santechniką ir šildymą") → `suggestCategories()`
  grąžina rikiuotus chip'us, meistras patvirtina.

→ užpildo `categoryIds`, išvedam `primaryService`.

### Q2 — „Kur dirbi?" (miestas)
Miesto autocomplete iš `LITHUANIAN_CITIES`. Bakstelėja „Vilnius".
→ `location` / `primaryCity` / `serviceArea`.

### Q3 — „Telefonas"
→ `phone`.

### Q4 — „Vardas"
Iš anksto užpildytas iš paskyros (`name`), redaguojamas.
→ `displayName`.

**[Sukurti profilį]** → profilis gyvas, randamas, kontaktuojamas.

`description` kūrimo metu **negeneruojam fabrikuotai** — sudedam vieną sąžiningą
faktinį sakinį (pvz. „Elektrikas, Vilnius.") ir paliekam tuščią-sąžiningą, kol
meistras pats papildys. Jokių išgalvotų kainų/garantijų (žr. analizės doc).

---

## 4. Po sukūrimo — „Sustiprink profilį" (neprivaloma)

Svertinis completeness checklist'as su nauda, susieta su leadais:
- „Pridėk nuotrauką → 3× daugiau užklausų"
- „Nurodyk kainą nuo → +15% pasiūlymų"
- „Aprašymas savo žodžiais"
- „Patirtis, rekvizitai, garantija"

Čia gyvena ir **neprivalomas AI greitas pildymas**: „Turi paslaugos.lt profilį?
Įklijuok nuorodą — užpildysim už tave." (Esamas `AIProfileSetup` perkeliamas
čia kaip *boost*, nebe kaip privalomas vartai.)

---

## 5. Ką naudojam vs ką kuriam (ponytail kopėčios)

**JAU YRA (tik sujungti):**
- `suggestCategories({mode:"provider", text})` — laisvas tekstas → chip'ai (deterministinė stadija = momentinė).
- `expandToMatchSet(ids)` — vienas amatas = visas darbų medis. *Dėl to vienas bakstelėjimas veikia.*
- `getServiceCategoryGroups()` / `getFlatServiceCategories()` — cache'inti, vieši → typeahead šaltinis (filtruojam kliente, AGENTS.md ir prirašo local-first + debounced search).
- `LITHUANIAN_CITIES` + lokatyvo helper (`constants.ts`).
- `syncFreeCategories()` + `PATCH /api/tiekejas/profilis/categories` — kategorijų išsaugojimas.
- `FREE_CATEGORY_LIMIT = 10` — jokios mokėjimo friction onboarding'e.

**KURIAM (mažai):**
- 4-bakstelėjimų ekranas (naujas, lengvas; pakeičia priverstinį `AIProfileSetup` kaip default kelią).
- Typeahead — **be naujo endpoint'o**: filtruojam jau cache'inamą flat sąrašą kliente (lazy kelias). `suggestCategories` lieka fallback'u netvarkingam tekstui.
- `AIProfileSetup` → demote į „sustiprink" boost'ą.
- Nuimti `description` 20-simb. kūrimo vartus; auto-stub sąžiningas vienos eilutės.

---

## 6. Etapai

- **Fazė 1 (MVP, lazy):** 4-bakstelėjimų ekranas + client typeahead + auto-stub
  description + AI demote. Beveik vien jungimas. Tai pašalina ~90% friction.
- **Fazė 2:** svertinis „sustiprink profilį" completeness su lead-nauda.
- **Fazė 3 (didesnis statymas, neprivaloma):** **Telegram onboardingas.** Botas
  jau daro užklausas ir jau kviečia `suggestCategories`. `/registruoti` srautas
  („parašyk ką dirbi ir miestą") onboardintų visiškai ne-kompiuterinį meistrą
  be jokių formų. Galingiausia tikslinei auditorijai, bet atskiras darbas.

---

## 7. Užfiksuoti sprendimai (founder, 2026-06-30)

1. **Paskyros modelis → atidėti el. pašto patvirtinimą.** Leisti daryti
   4-bakstelėjimų profilį iškart po registracijos; patvirtinimas vyksta async ir
   **neblokuoja** profilio gyvybės. Jokios naujos infra (SMS/OTP atmesta kol kas).
2. **V1 apimtis → pilna Fazė 1.** 4-laukų ekranas + client typeahead +
   auto-stub aprašymas + AI demote į boost'ą. (Completeness checklist = Fazė 2.)

## 8. Fazė 1 — failų lygio darbai

1. **Naujas ekranas** `src/app/meistrai/kurti-profili/QuickOnboard.tsx` (client):
   4 laukai (amatas-typeahead, miestas, telefonas, vardas) + „Sukurti". Tampa
   default'u; `AIProfileSetup` nebe privalomas kelias.
2. **Amato typeahead** — be naujo endpoint'o: krauti `getServiceCategoryGroups()`
   (cache'inta, vieša) ir filtruoti kliente (debounce). Netvarkingam tekstui —
   fallback į `POST /api/category-suggestions` (`mode:"provider"`).
3. **Kūrimo API** — pakartotinai naudoti profilio create kelią; nuimti
   `description` 20-simb. *kūrimo* vartus; auto-stub sąžiningas vienos eilutės
   („{amatas}, {miestas}.") jei tuščia. Kategorijos per `syncFreeCategories()`.
4. **Atidėtas el. pašto patvirtinimas** — leisti `kurti-profili` + profilio
   gyvybę be `emailVerified`; patvirtinimo el. laiškas lieka, bet negate'ina.
   (Patikrinti `/patvirtinti` redirect'us ir bet kokius `emailVerified` gate'us.)
5. **AI demote** — `AIProfileSetup` perkelti į `/tiekejas/profilis` kaip
   neprivalomą „Greitas pildymas" boost'ą (URL-scrape lieka vertingas).
6. **Auto-stub vietoje fabrikacijos** — JOKIŲ kainų/garantijų generavimo (žr.
   `meistras-profile-analysis.md` §6); tik faktinis vienos eilutės sakinys.
