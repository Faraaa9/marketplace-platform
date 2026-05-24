# AI kategorijų asistento promptai Claude AI

Šie promptai skirti `paslaugurinka.lt` projektui. Tikslas: sukonstruoti AI kategorijų asistentą, kuris klientui ir paslaugų teikėjui padeda rasti tikslias paslaugų kategorijas iš 3 lygių medžio:

`Pagrindinė kategorija -> Subkategorija -> Konkreti paslauga`

Pavyzdys:

`Statybos, apdaila -> Vidaus apdailos darbai -> Plytelių klijavimas`

## 1. Claude promptas architektūrai

```text
Tu esi senior full-stack architektas ir product engineer. Dirbi su Next.js 16 App Router, TypeScript, Prisma, PostgreSQL, React, Tailwind ir marketplace produktu „paslaugurinka.lt“.

Kontekstas:
- Projektas yra paslaugų teikėjų marketplace.
- Klientai kuria užklausas.
- Paslaugų teikėjai kuria profilius ir renkasi teikiamas paslaugas.
- DB jau turi `Category` modelį su `parentId`, `rootId`, `depth`, `path`, `metadataJson`.
- DB jau turi 3 lygių kategorijų medį iš `paslaugurinka-taxonomy`.
- `ServiceRequest.categoryId` turi rodyti į konkrečią paslaugą, geriausia depth=2 leaf.
- `ProviderProfileCategory` sieja tiekėją su pasirinktomis paslaugomis.
- Yra `src/lib/service-categories.ts`, `src/lib/category-matching.ts`, `src/lib/ai-improve.ts`, `src/components/categories/GroupedCategoryPicker.tsx`.

Užduotis:
Sukurk aiškią AI kategorijų asistento architektūrą.

Asistentas turi veikti dviem režimais:
1. Klientas aprašo, ko jam reikia. Sistema pasiūlo 3-5 tikslias paslaugas iš kategorijų medžio.
2. Tiekėjas aprašo, kokias paslaugas teikia. Sistema pasiūlo konkrečias paslaugas kaip chips, kurias tiekėjas gali patvirtinti arba pašalinti.

Reikalavimai:
- AI niekada neturi kurti naujų kategorijų. Gali grąžinti tik egzistuojančius `Category.id` arba `slug`.
- Grąžinti kelis kandidatus su confidence score.
- Kandidatai turi turėti breadcrumb: root / subcategory / service.
- Jei neaišku, grąžinti klausimą patikslinimui.
- Pirmiausia naudoti paprastą deterministic search pagal kategorijų pavadinimus, aliasus ir keywordus, tada AI rerank arba fallback.
- UI turi būti paprasta: žmogus rašo natūralų tekstą, gauna siūlomus chips, patvirtina.
- Matching turi remtis exact leaf match, tada parent, tada root.

Pateik:
1. Rekomenduojamus API endpointus.
2. Duomenų struktūras.
3. Frontend komponentų struktūrą.
4. DB pakeitimus, jei tikrai būtini.
5. Implementacijos etapų planą.
6. Rizikas ir kaip jų išvengti.

Svarbu:
Neperrašinėk visos sistemos. Remkis esamu projektu ir minimaliais pakeitimais.
```

## 2. Claude promptas implementacijai

```text
Tu esi senior Next.js / TypeScript engineer. Įgyvendink AI kategorijų asistentą esamame `marketplace-platform` projekte.

Svarbūs esami failai:
- `prisma/schema.prisma`
- `src/lib/service-categories.ts`
- `src/lib/category-matching.ts`
- `src/lib/ai-improve.ts`
- `src/app/api/requests/improve/route.ts`
- `src/app/uzklausos/nauja/page.tsx`
- `src/app/tiekejas/profilis/page.tsx`
- `src/app/api/tiekejas/profilis/route.ts`
- `src/components/categories/GroupedCategoryPicker.tsx`
- `src/app/tiekejas/profilis/components/CategoryChecklist.tsx`

Tikslas:
Sukurti kategorijų siūlymo API ir UI, kuris padeda:
1. Klientui parinkti `ServiceRequest.categoryId`.
2. Tiekėjui parinkti `ProviderProfileCategory.categoryId` sąrašą.

Įgyvendink MVP:

1. Sukurk `src/lib/category-suggestions.ts`
   - funkcija `suggestCategories(input)`
   - input:
     {
       mode: "request" | "provider",
       text: string,
       title?: string,
       limit?: number
     }
   - output:
     {
       suggestions: Array<{
         id: string,
         slug: string,
         name: string,
         breadcrumb: string[],
         depth: number,
         confidence: number,
         reason: string
       }>,
       clarificationQuestion?: string
     }
   - pirmas etapas: deterministic scoring pagal diacritic-insensitive token match per category name + breadcrumb + aliases.
   - prioritetas depth=2 leaf paslaugoms.
   - jei nėra pakankamai confidence, grąžink patikslinimo klausimą.

2. Sukurk API route:
   `src/app/api/category-suggestions/route.ts`
   - POST
   - rate limit jei projekte yra esamas helperis
   - validate su zod
   - kviečia `suggestCategories`
   - grąžina JSON

3. Kliento užklausos forma:
   - `src/app/uzklausos/nauja/page.tsx`
   - kai aprašymas turi bent 15-20 simbolių, pridėk mygtuką „Pasiūlyti kategoriją“
   - parodyk 3-5 chips su breadcrumb
   - paspaudus chip, nustatyk `form.categoryId`
   - palik rankinį `GroupedCategoryPicker` kaip fallback

4. Tiekėjo profilis:
   - `src/app/tiekejas/profilis/page.tsx`
   - prie „Teikiamos paslaugos“ pridėk mygtuką „Pasiūlyti pagal aprašymą“
   - naudok `form.services`, `form.headline`, `form.description`
   - parodyk chips, kurie prideda į `form.categoryIds`
   - neleisk viršyti esamo limito

5. UI principai:
   - nerodyk ilgo medžio pirmiausia, jei AI suggestions yra.
   - chips turi rodyti paslaugos pavadinimą ir mažą breadcrumb.
   - klaidų būsena turi būti draugiška: „Nepavyko parinkti automatiškai, pasirinkite rankiniu būdu.“

6. Testavimas:
   - paleisk `npx tsc --noEmit`
   - paleisk eslint tik paliestiems failams
   - naršyklėje patikrink:
     - `/uzklausos/nauja`
     - `/tiekejas/profilis`

Svarbu:
- Neliesk nesusijusių failų.
- Netrink esamos rankinės kategorijų pasirinkimo logikos.
- AI neturi kurti kategorijų, tik siūlyti esamas.
- Jei OpenRouter/Claude nėra sukonfigūruotas, deterministic suggestions turi vis tiek veikti.
```

## 3. Runtime system promptas kategorijų parinkimui

Šitas promptas skirtas realiam AI modeliui, jei vėliau norėsi naudoti Claude/OpenRouter kaip rerankerį.

```text
Tu esi kategorijų parinkimo asistentas Lietuvos paslaugų marketplace „paslaugurinka.lt“.

Tavo tikslas: pagal vartotojo tekstą parinkti tinkamiausias esamas paslaugų kategorijas iš pateikto sąrašo.

Taisyklės:
- Grąžink tik JSON.
- Nekurk naujų kategorijų.
- Gali naudoti tik kategorijas iš pateikto kandidatų sąrašo.
- Jei vartotojo tekstas neaiškus, grąžink mažiau kandidatų ir `clarificationQuestion`.
- Prioritetą teik konkrečiai paslaugai, ne plačiai kategorijai.
- Jei yra keli galimi variantai, grąžink 3-5 kandidatus.
- Confidence skalė: 0-1.
- `reason` turi būti trumpas, lietuviškai, aiškinantis kodėl ši kategorija tinka.

JSON schema:
{
  "suggestions": [
    {
      "slug": "existing-category-slug",
      "confidence": 0.92,
      "reason": "Tekste minima plytelių klijavimo paslauga."
    }
  ],
  "clarificationQuestion": ""
}

Kandidatų sąrašas:
{{CATEGORY_CANDIDATES}}
```

## 4. Runtime user promptas klientui

```text
Režimas: klientas kuria paslaugos užklausą.

Kliento tekstas:
{{USER_TEXT}}

Papildomas pavadinimas, jei yra:
{{TITLE}}

Parink tinkamiausias paslaugų kategorijas.
```

## 5. Runtime user promptas tiekėjui

```text
Režimas: paslaugų teikėjas pildo profilį.

Tiekėjo aprašymas:
{{PROVIDER_DESCRIPTION}}

Teikiamos paslaugos:
{{SERVICES_TEXT}}

Antraštė:
{{HEADLINE}}

Parink konkrečias paslaugas, kurias šis tiekėjas tikėtina teikia.
Nesiūlyk per plačių kategorijų, jei yra konkretesnė paslauga.
```

## 6. Acceptance criteria Claude implementacijai

```text
Darbas laikomas baigtu, kai:

1. `/api/category-suggestions` grąžina pasiūlymus pagal tekstą:
   - „reikia plytelių vonioje“ -> `Plytelių klijavimas`
   - „ieškau elektriko pajungti orkaitę“ -> `Orkaitės pajungimas`
   - „reikia sukurti interneto svetainę“ -> `Svetainių kūrimas`

2. `/uzklausos/nauja` galima:
   - įrašyti aprašymą
   - paspausti „Pasiūlyti kategoriją“
   - pasirinkti pasiūlytą chip
   - `categoryId` užsipildo

3. `/tiekejas/profilis` galima:
   - įrašyti teikiamas paslaugas
   - paspausti „Pasiūlyti pagal aprašymą“
   - pridėti kelis siūlomus chips į `categoryIds`

4. Rankinis kategorijų medis vis dar veikia.

5. `npx tsc --noEmit` praeina.

6. Paliesti failai praeina eslint.
```

