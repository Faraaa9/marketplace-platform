# Reprezentacinė meistro svetainė — gilioji analizė

> Tikslas: paversti `/meistrai/[slug]` puslapį iš plonos katalogo eilutės į
> tikrą **reprezentacinę svetainę**, kuria tiekėjas didžiuotųsi ir dalintųsi —
> kad „mes tau nemokamai sukuriame profesionalią svetainę" taptų stipriu
> argumentu kviečiant tiekėjus.
>
> Šaltinis: 7-ių agentų multi-modal research (Thumbtack, Houzz Pro, Checkatrade,
> Angi, Bark, Booksy, StarOfService + **paslaugos.lt** kaip pagrindinis LT
> konkurentas, pilnai nuskenuotas) + CRO/UX įrodymai + LT rinkos specifika +
> premium vizualinis dizainas. Prototipas: `meistras-profile-prototype.html`.

---

## 0. Trumpai (TL;DR)

Šiandien puslapis **apsimeta** turtingu profiliu, bet **fabrikuoja** turinį, kurio
tiekėjas nepateikė. Tai ne tik „trūksta sekcijų" — tai aktyviai kenkia
pasitikėjimui, t.y. daro priešingai nei pagrindinis tikslas.

Trys didžiausios problemos (visos jau „shipped wrong"):

1. **Pasitikėjimas yra suklastotas, ne uždirbtas.** Kainoraštis ir garantijos
   generuojami automatiškai kiekvienam tiekėjui iš netikrų formulių.
2. **Dalinama nuoroda nėra svetainė.** Nėra generuojamos OG kortelės — įklijavus
   nuorodą į Messenger/WhatsApp nematyti nieko, kas primintų svetainę.
3. **Legitimumo duomenys renkami, bet slepiami.** `companyCode` yra DB, bet
   niekur nerodomas; nėra PVM, adreso, garantijos, atestacijos laukų.

Esmė: **sąžiningas plonas puslapis nugali pilną fabrikuotą.** Pirma suprojektuok
sąžiningą tuščią būseną, turtingą — kaip priedą.

---

## 1. Pozicionavimo spraga

Founder'io pažadas: „duodam tau nemokamą profesionalią svetainę, kuria didžiuosies".
Tris dalykai šį pažadą laužo:

- **Fabrikuotas turinys.** `PricingBlock` (`ProfileUiHelpers.tsx:116-138`) sugeneruoja
  3 pakopų kainoraštį KIEKVIENAM: bazė = `priceFrom` arba **30 € pagal nutylėjimą**,
  „Skubus remontas" = bazė × 2.5, „Pilnas paketas" = bazė × 5. Klientas mato
  skaičius, kurių tiekėjas niekada nenurodė. `TrustSignals` (`ProfileUiHelpers.tsx:191-203`)
  sugalvoja „Garantija X metų" iš `experienceYears`, nors garantijos lauko schemoje
  **iš viso nėra**. Live pavyzdys: front-end programuotojui rodoma
  „**Diagnostika nuo 30 € / Skubūs remontai / Atvykimas per 1 val.**" — absurdas.
- **Dalinama nuoroda nėra svetainė.** Repo nėra jokio `next/og` / `opengraph-image`
  route. `buildPageSeo` tik apkarpo pirmą darbo nuotrauką, o daugumai (be nuotraukų)
  — bevaizdė kortelė.
- **Legitimumas paslėptas.** `companyCode` yra `schema.prisma:110`, bet niekada
  neįtraukiamas į `select` ir nerodomas. Nėra PVM kodo, registracijos adreso,
  atestacijos, draudimo, garantijos laukų.

Rezultatas: puslapis **kopijuoja** paslaugos.lt formą (reitingas, galerija,
kainos, atsiliepimai), bet **neperteikia jos esmės** (tikri daugiaašiai
atsiliepimai, tikros kainos, teisinis identitetas).

---

## 2. Kas jau gerai (statyba ant tvirto pamato)

- Hero pamatas yra: cover + portretas (su Story žiedu) + vardas + headline +
  reitingas + meta pills + primary CTA (`page.tsx:374-558`). Tai universali
  „above-the-fold" formulė, kurią research vadina aukščiausio ROI.
- Atsiliepimai jau turi **paslaugos žymą + datą** (`ReviewsSection.tsx:26-32`) —
  „Atlikta paslauga: X, 2025-10" pattern jau pusiau pastatytas. Trūksta tik
  sub-balų, atsakymų ir nuotraukų.
- **Sąžiningas reitingo vidurkis** ir sąžininga tuščia būsena atsiliepimuose
  („Atsiliepimų kol kas nėra") — čia nieko nefabrikuojam.
- **Atsako laikas ir acceptance rate jau skaičiuojami** (`page.tsx:822-830`) —
  pigiausias didelės konversijos signalas jau egzistuoja, tik užkastas sidebar'e.
- **Turtingas, nepanaudotas LT duomenų modelis:** `companyCode`, `serviceArea[]`,
  `specializations[]`, `offersInvoices`, `priceFrom`, `experienceYears`,
  `website`, `publicEmail` — daug pasitikėjimo signalų tik reikia *parodyti*, ne rinkti.
- Stiprus SEO/JSON-LD pamatas (LocalBusiness + Breadcrumb + Review, sąžiningai
  gated). Mobile sticky bar, lightbox, share mygtukas — skeletonas jau yra.

---

## 3. Spragos (pagal sunkumą)

| Sunkumas | Spraga | Įrodymas |
|---|---|---|
| 🔴 critical | Kainoraštis fabrikuojamas kiekvienam | `ProfileUiHelpers.tsx:116` (`base ... : 30`), 128/135 (`base*2.5`, `base*5`), rendinamas besąlygiškai `page.tsx:575` |
| 🔴 critical | Garantijos/trust signalai fabrikuojami | `ProfileUiHelpers.tsx:191-217` (garantija iš `experienceYears`, „Atvykimas per 1 val."); garantijos lauko schemoje nėra |
| 🔴 critical | Nėra generuojamos OG/share kortelės | repo nėra `next/og`/`ImageResponse`; metadata image tik apkarpyta nuotrauka (`page.tsx:178-182`) |
| 🟠 high | Teisinis identitetas (`companyCode`) saugomas, bet nerodomas | `schema.prisma:110` yra; `select` (`page.tsx:786-812`) praleidžia; nėra PVM/adreso/atestacijos/draudimo laukų |
| 🟠 high | Importuoti/neprisiimti tiekėjai 404 | `page.tsx:738-741` praleidžia eilutes be `userId` — tikriausiai didžiausias kohortos segmentas |
| 🟠 high | Atsiliepimai vienašiai, be atsakymų ir nuotraukų | `schema.prisma:378-403` — vienas `rating Int`, nėra sub-balų/atsakymo/nuotraukų |
| 🟠 high | Vienas šablonas klaidingas skaitmeniniams pro | nėra trade-type/isDigital šakojimo; „Diagnostika vietoje / Skubus remontas" beprasmiška programuotojui |
| 🟠 high | Lightbox neprieinamas (a11y) | `WorkImageGallery.tsx:127-182` — raw `<img>`, nėra `role=dialog`/focus-trap/scroll-lock; generic alt „darbas N" |
| 🟠 high | Completeness metras kosmetinis, ne svertinis | `tiekejas/profilis/page.tsx:424-438` — visi 7 punktai vienodo svorio; ignoruoja kainas, captioned nuotraukas, `companyCode` |
| 🟡 medium | Mobile sticky CTA tik „rašyti", be `tel:` skambučio | `StickyBottomBar.tsx:61-67`; LT klientai skambina pirma; scroll listener be throttle |
| 🟡 medium | Share mygtukas be kanalų (Messenger/WhatsApp/Viber) | `ProfileShareButton.tsx:17-35` — tik navigator.share/clipboard |
| 🟡 medium | Verifikacijos ženkliukai dekoratyvūs, neišplečiami | `page.tsx:429-432` — 4 tiers be jokio faktinio turinio; „isGoat" skamba kaip žaidimas |
| 🟡 medium | Onboarding overwrite-guard išjungtas prod'e | `kurti-profili/page.tsx:44-47` užkomentuotas su „atstatyti pries production" |
| ⚪ low | Demo bio injektuojamas kaip turinys | `page.tsx:281-283` sukuria fake aprašymą demo profiliams |
| ⚪ low | Panašūs tiekėjai nukreipia į konkurentus konversijos puslapio apačioje | `page.tsx:697-707`; `serviceArea[]`/`specializations[]` niekada nerodomi |

---

## 4. Nauja puslapio struktūra (IA)

Pilna struktūra iš viršaus į apačią (žr. prototipą):

1. **Hero / identiteto juosta** — cover (nuotrauka arba skoningas branded gradientas
   kai nėra) + portretas + vardas + **outcome headline** + sąžiningi chip'ai (TIK
   tikros reikšmės: reitingas+kiekis jei >0, patirtis, „Nuo X €" tik kai nustatyta,
   aptarnaujama zona, atsako laikas) + išplečiamas „Patvirtinta" ženkliukas
   (→ įmonės kodas, patvirtintas el. paštas/telefonas) + **dvigubas CTA**
   („Gauti pasiūlymą" + „Skambinti" `tel:`) + kanalų share.
2. **„At-a-glance" trust juosta** — tikrų skaičių eilutė: atsako laikas
   („Paprastai atsako per ~X val."), pateikti/pasirinkti pasiūlymai, metai
   aktyvus, narys nuo. Atsako laiką iškelti iš sidebar.
3. **Apie / žmogus** — tiekėjo bio savo balsu + specializacijų chip'ai + „Kaip dirbu"
   žingsniai. JOKIO injektuoto demo bio.
4. **Paslaugos + sąžiningos kainos** — pakeisti fabrikuotą `PricingBlock`. Tikra
   per-paslaugą „nuo X €" lentelė (naujas `priceItems`); kai nėra — „Kaina derinama",
   ne išgalvotos pakopos.
5. **Portfolio / darbų galerija** — masonry + **prieinamas** lightbox (`role=dialog`,
   focus-trap, scroll-lock, descriptive alt) + per-nuotrauką antraštė + paslaugos
   žyma + **prieš/po** poros. Gražiai degraduoja nuo 1 nuotraukos.
6. **Atsiliepimai (centras)** — daugiaašiai sub-balai (Kokybė / Kaina / Bendravimas /
   Terminai) + tiekėjo atsakymai + kliento nuotraukos. Rūšiavimas: naujausi / su
   nuotraukomis. Pašalinti auto-marquee (arba `prefers-reduced-motion`).
7. **Rekvizitai, garantija ir sąskaitos (LT trust)** — TIK tikri faktai: įmonės
   kodas + tipas (MB/UAB/individuali veikla) + adresas, PVM/sąskaitos faktūros,
   konkreti darbų garantija, civilinės atsakomybės draudimas, atestacija (su failu).
8. **Aptarnaujama teritorija** — `serviceArea[]` kaip miestų/regionų sąrašas
   (+ spindulys), opcionaliai žemėlapis. Skaitmeniniams: „Nuotoliu / visa Lietuva".
9. **(Sąlyginė) skaitmeninio pro variacija** — kai `isDigital`, vietoj
   atvykimo/spindulio → Behance stiliaus case studies (iššūkis → procesas →
   rezultatas), deliverables/terminai, nuotolinis darbas, nuorodos į gyvą darbą.
10. **Sticky kontaktas (mobile) + pakartotas CTA** — throttled juosta su `tel:`
    skambučiu IR žinute + WhatsApp/Viber/Messenger.
11. **Footer: teisinis identitetas + share-as-business-card** — rekvizitai + darbo
    valandos + kanalų share + generuojama OG kortelė. „Panašūs tiekėjai" nukelti
    žemiau / atidėti, kad nenukreiptume kliento pas konkurentus.

---

## 5. Duomenys: ką turim vs ką reikia rinkti

**Jau turim (tik parodyti):** `displayName`, `headline`, `shortSummary`,
`description`, `services`, `specializations[]`, `serviceArea[]`, `primaryService`,
`primaryCity`, `location`, `phone`, `website`, `publicEmail`, **`companyCode`**,
`priceFrom`, `offersInvoices`, `availableForUrgent`, `experienceYears`, `images[]`,
`heroImageUrl`, reitingas/atsiliepimai, computed: atsako laikas, acceptance rate,
narys nuo, online/last-seen.

**Naujai rinkti (DB + editorius):**

| Laukas | Tipas | Kodėl | Kaip rinkti |
|---|---|---|---|
| `priceItems` | JSON / lentelė `[{service, price, unit, note}]` | Pakeičia fabrikuotas 3 pakopas tikromis kainomis (+15% leadų, iProspect — bet tik su sąžiningais skaičiais) | Editorius: kartojamos eilutės; AI-prefill iš scrapinto URL |
| `guaranteeMonths` + `guaranteeText` | Int? + String? | Dabar „Garantija X metų" fabrikuojama; konkreti garantija tiesiogiai numuša LT „apgaviko" baimę (~+33% seal testuose) | Editorius: toggle + trukmė/apimtis; rodyti tik kai nustatyta |
| `vatCode` + `registeredAddress` + `entityType` | String? ×3 | Užbaigia rekvizitų legitimumą; reikia B2B/renovacijos klientams (sąskaita faktūra) | Editorius „Verslo informacija"; auto-fill iš Registrų centro pagal `companyCode` |
| `certifications` (atestacija) | Lentelė `[{type, issuer, number?, fileUrl?, trade}]` | Elektrikams/dujoms atestatas privalomas teisiškai + draudimui | Editorius upload; rodyti tik reguliuojamoms profesijoms; verified per admin |
| `hasLiabilityInsurance` | Boolean | Civilinės atsakomybės draudimas — top LT trust didelės vertės darbams | Editorius toggle; rodyti tik kai true |
| `professionVertical` / `isDigital` | Enum (`trade`/`digital`/`hybrid`) | Šakoja visą IA: trades → atvykimas/spindulys/prieš-po; digital → case studies/deliverables/nuotolis | Išvedama iš kategorijos onboarding'e + editoriaus override |
| `imageMeta` (per-nuotrauką) | JSON / `GalleryItem` `[{url, caption, serviceTag, beforeAfterGroupId, role}]` | `images` dabar plokščias `string[]` → galerija tegali rodyti „Darbas N". Antraštės + žymos + prieš/po paverčia tinklelį portfolio | Editorius uploader: antraštė + paslaugos dropdown + prieš/po porinimas |
| Review sub-balai + atsakymas + nuotraukos | `Review.qualityRating/priceRating/communicationRating/deadlineRating` (Int?), `providerReply` (String?), `ReviewPhoto[]` | paslaugos.lt 4-ašis modelis — stipriausias LT trust mechanizmas | Kliento forma: 4 slankikliai + nuotrauka; tiekėjo „atsakyti"; gated tik samdytiems |
| `businessHours` | JSON (per dieną) | Užbaigia rekvizitų footer'į; standartas stipresnėse LT svetainėse | Editorius savaitės grafikas; rodyti tik kai nustatyta |

---

## 6. Tuščios būsenos strategija (svarbiausia!)

**Mediana NĖRA turtingas profilis** — tai naujas tiekėjas arba importuotas/
neprisiimtas scrape su vardu ir beveik nieko. Todėl:

1. **NEDERĖTINA: pašalinti VISĄ fabrikaciją** (PricingBlock pakopos, TrustSignals
   garantija, demo bio) NEDELSIANT. Sąžiningas-plonas > pilnas-fabrikuotas.
2. **Hero visada veikia** — vardas + headline + portretas/branded gradientas +
   vienas sąžiningas CTA; chip'ai tik kai duomenys tikri (jokio „0 atsiliepimų").
3. **Sekcijos rendinasi sąlyginai ir gražiai susitraukia** — galerija slepiama <1
   nuotraukos, kainos „Nuo X €" tik kai nustatyta arba nieko, rekvizitai tik
   nustatyti faktai.
4. **Indexability/visibility grindys** — žemiau minimumo (nėra aprašymo IR nuotraukų
   IR atsiliepimų) → puslapis `noindex`, o savininkui rodom „Užbaik savo profilį"
   vietoj tuščio kiauto; importuotiems — „Prisiimti šį profilį", ne 404.
5. **Editorius neša krūvį** — svertinis, su leadais susietas completeness metras
   („Užpildyk kainą ir nuotraukas → rodysimės aukščiau, gausi daugiau užklausų")
   + live preview-as-client.
6. **Generuojama OG kortelė — didysis išlygintojas** — net be nuotraukų plonas
   profilis gauna branded share kortelę (vardas + profesija + miestas + reitingas
   jei yra + paslaugurinka ženklas), tad nuoroda atrodo kaip svetainė nuo 1 dienos.

---

## 7. Prioritetai

**Top 5 (iš eilės):**

1. **Užmušti fabrikaciją** (critical, pirma): pašalinti PricingBlock pakopas,
   `experienceYears`→garantiją, demo bio. Tai aktyvios „trust bombos".
2. **Generuojama OG/share kortelė** per `next/og` su no-photo fallback — founder'io
   „tavo profilis IS tavo svetainė" pažadas; pigiausias didelės svertos žingsnis.
3. **Parodyti tikrus LT trust duomenis** — `companyCode` (+ tipas/adresas/PVM),
   `offersInvoices`, konkreti garantija, atestacija, `serviceArea[]` + atsako laiką į hero.
4. **Suprojektuoti sąžiningą-ploną + editorių** — graceful degradation, visibility
   floor + „užbaik profilį", claim flow importuotiems, svertinis completeness su preview.
5. **Atsiliepimai + a11y + mobile kontaktas** — 4 sub-balai, atsakymai, nuotraukos;
   lightbox (dialog/focus-trap/scroll-lock/alt) + marquee už reduced-motion;
   `tel:` + WhatsApp/Viber sticky bare + kanalų share.

**Quick wins (be naujų DB laukų):** ištrinti fake kainoraštį/garantijas/demo bio;
parodyti `companyCode`; atsako laiką į hero; prieinamas lightbox; marquee už
reduced-motion; `tel:` + WhatsApp sticky bare; kanalų share; `serviceArea[]` +
`specializations[]` chip'ai; atstatyti onboarding guard.

**Bigger bets:** generuojama OG; daugiaašiai atsiliepimai; tikras kainų+portfolio
modelis (`priceItems`, `imageMeta`); trade vs digital šaka; svertinis completeness
engine; LT credentials suite; importuotų/neprisiimtų palaikymas su claim flow.

---

## 8. Šaltiniai (research'o pagrindas)

- **paslaugos.lt** — pagrindinis LT konkurentas (pilnai nuskenuotas): sticky tab'ai
  (Apie / Atsiliepimai / Galerija / Paslaugos / Kontaktai), 4-ašiai atsiliepimai
  su paslaugos žyma+data, lankytojų skaičius, completeness points engine (DUK).
- **Thumbtack** — „online storefront", reviews+photos+credentials+FAQ, „starts at" kainos.
- **Houzz Pro** — žmogaus nuotrauka (ne logo), aprašomi projektų pavadinimai,
  3+ atsiliepimai = 15× daugiau kontaktų.
- **Checkatrade** — iki 12 patikrų sąrašas, 90%+ verifikuoti atsiliepimai, 12 mėn. garantija.
- **Angi/HomeAdvisor** — pakopiniai badge'ai (New/Approved/Certified) su background check.
- **Bark** — net 1 atsiliepimas → 3× didesnė tikimybė būti pasamdytam; reitingas → Google SERP.
- **Booksy** — „Profile acts as your website. No website necessary." (tikslus founder'io hook).
- CRO/UX: kainų skaidrumas +15% leadų (iProspect); speed-to-lead (5 min → 78% deals);
  garantijos seal ~+33%.
