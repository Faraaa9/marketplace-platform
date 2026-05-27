# AI-Native Marketplace Roadmap

Šis dokumentas yra paslaugurinka.lt AI krypties kelrodis. Tikslas nėra
„pridėti chatbotą“, o sukurti AI sluoksnį, kuris gerina marketplace
likvidumą: daugiau aiškių užklausų, daugiau tinkamų atsakymų, greitesnis
pirmas kontaktas ir aiškesni CEO sprendimai.

## Strateginis Tikslas

Paslaugurinka.lt turi tapti ne tik tiekėjų ir užklausų katalogu, bet protinga
paslaugų koordinavimo sistema:

- klientui padeda aiškiai suformuluoti poreikį;
- tiekėjui padeda greitai suprasti, ar lead'as vertas dėmesio;
- platformai padeda geriau sujungti paklausą su pasiūla;
- admin/CEO komandai duoda aiškius veiklos signalus.

AI neturi veikti kaip autonominis pardavėjas. Pagal nutylėjimą AI tik siūlo,
paaiškina ir struktūruoja. Jis negali pats atrakinti lead'o, siųsti žinutės,
kurti atsakymo, keisti kainos ar atlikti piniginio veiksmo be žmogaus
patvirtinimo.

## Dabartinis Statusas

Įgyvendinta:

- `AiRun` audit modelis AI kvietimų stebėjimui.
- Manual migration: `prisma/manual-migrations/20260526_add_ai_runs.sql`.
- Bendras AI audit helperis `src/lib/ai/audit.ts`.
- Tiekėjo lead co-pilot servisas ir endpointas:
  `POST /api/tiekejas/uzklausos/[id]/copilot`.
- Tiekėjo užklausos puslapio AI įžvalgos kortelė.
- Admin suvestinės AI health blokas.
- Audit prijungtas prie esamų AI srautų:
  request improve, category suggest, audio transcribe, proposal draft,
  profile generate, moderation, lead co-pilot.
- Kliento užklausos agento pirmas UX sluoksnis:
  aprašymo struktūravimas, biudžeto/termino užpildymas ir trūkstamų klausimų
  kortelė.
- Semantinio matching'o shadow mode pradžia:
  tiekėjo užklausų API skaičiuoja semantinį balą, bet nekeičia vartotojui
  matomo rūšiavimo; agregatai keliauja į AI health per `semantic_match_shadow`.
- CEO intelligence pirmas blokas admin suvestinėje:
  paklausos/pasiūlos spragos, naujos užklausos be atsakymų ir veiksmų
  rekomendacijos.
- Follow-Up agento MVP, advisory only:
  deterministinis sustojusių pokalbių/lead'ų detektorius
  (`src/lib/ai/follow-up.ts`), tiekėjo endpointas
  `GET /api/tiekejas/follow-ups`, admin signalas `/api/admin/stats` ir
  `FollowUpAgentCard` admin suvestinėje. Agentas nieko nesiunčia, nekuria
  žinučių, kreditų neeikvoja. Kiekvienas scan'as audituojamas per
  `AiRun` (feature `follow_up_scan`) tik su agregatų metadata.
- Tiekėjo dashboard kortelė `ProviderFollowUpsCard`:
  kviečia `GET /api/tiekejas/follow-ups`, rodo iki 3 sustojusių
  pokalbių su patarimu ir nuoroda į detalų puslapį
  (`/tiekejas/uzklausos/{requestId}` arba `/tiekejas/zinutes/{id}`).
  Mobile-friendly, atsiranda tik kai yra signalų. Jokio auto-send,
  jokių pranešimų, jokio kreditų eikvojimo.
- Admin stats route refactor: didelės helper funkcijos perkeltos į
  `src/lib/admin/ai-usage.ts`, `marketplace-intelligence.ts`,
  `follow-up-signal.ts`, `day-buckets.ts`. `/api/admin/stats` lieka
  tik orkestracija. Elgesys identiškas.
- Known warning registras: `docs/known-warnings.md`.

Patikrinta:

- `npx prisma generate`
- `npm run lint`
- `npm run build`
- DB migracija pritaikyta; `ai_runs` lentelė pasiekiama per Prisma Client.

## 1. AI Pamatai Ir Matomumas

### Kas daroma

Bendras AI audit sluoksnis įrašo svarbių AI kvietimų metadata:

- feature;
- status;
- provider;
- model;
- promptVersion;
- latencyMs;
- actorUserId;
- entityType;
- entityId;
- errorCode;
- metadataJson.

Admin suvestinė rodo AI health per 14 dienų:

- AI kvietimų kiekį;
- klaidų dalį;
- vidutinę trukmę;
- funkcijų pasiskirstymą;
- naujausias klaidas.

### Kodėl

Be observability AI tampa juoda dėže. CEO turi matyti, ar AI realiai
naudojamas, ar stringa, kiek klaidų generuoja ir kurios funkcijos kuria
produkto vertę.

### Nauda

- CEO: kontrolė, kaštų ir kokybės stebėjimas.
- Produktui: galima saugiai plėsti AI funkcijas.
- Inžinerijai: aiškiau debuginti modelių, timeoutų ir validacijos problemas.

### Rizikos

Audit log'ai neturi tapti privačių duomenų sandėliu. Todėl AI audit sluoksnis
neturi saugoti pilnų promptų, užklausų aprašymų, klientų telefonų, el. pašto
adresų ar tiekėjų privačios informacijos.

## 2. Tiekėjo Lead Co-Pilot MVP

### Kas daroma

Tiekėjo užklausos puslapyje rodoma AI kortelė. Ji pateikia:

- kodėl lead'as gali tikti tiekėjui;
- atitikimo signalus;
- klausimus, kuriuos verta paklausti kliento;
- rizikas ar neaiškumus;
- saugų kitą žingsnį;
- confidence reikšmę.

Co-pilot yra read-only. Jis nieko neatrakina, nesiunčia žinučių, nekeičia
kainos ir neatlieka jokių piniginių veiksmų.

### Kodėl

Tiekėjų aktyvumas yra marketplace širdis. Jei tiekėjas greičiau supranta, kur
verta atsakyti, jis dažniau naudoja kreditus ir rašo geresnius pasiūlymus.

### Nauda

- Tiekėjui: mažiau laiko analizuojant užklausas, aiškesnis sprendimas,
  geresni klausimai klientui.
- Klientui: konkretesni ir naudingesni atsakymai.
- CEO: didesnis lead unlock rate, response rate ir daugiau monetizacijos
  signalų.

### Rizikos

AI gali pervertinti lead'o tinkamumą. Todėl co-pilot turi būti pateikiamas kaip
patarimas, o ne automatinis sprendimas. Jei tiekėjo profilis silpnas, AI
vertinimas turi aiškiai komunikuoti ribotą užtikrintumą.

## 3. Kliento Užklausos Agentas

### Kas daroma

Dabartinis aprašymo pagerinimas turi būti palaipsniui paverstas į aiškesnį
užklausos agentą. Klientas parašo arba padiktuoja poreikį, o AI ištraukia:

- pavadinimą;
- kategoriją;
- miestą;
- biudžetą;
- terminą;
- trūkstamus klausimus.

Jei trūksta svarbios informacijos, agentas turi klausti 1-3 trumpų klausimų, o
ne versti klientą galvoti per visą formą.

### Kodėl

Klientai dažnai nežino, kaip teisingai aprašyti darbą. Blogai aprašyta
užklausa mažina tiekėjų norą atsakyti.

### Nauda

- Klientui: mažiau trinties, greitesnis paskelbimas.
- Tiekėjui: aiškesni lead'ai.
- CEO: didesnis request completion rate ir geresnė lead kokybė.

### Rizikos

AI negali pridėti faktų, kurių klientas nepateikė. Jis gali struktūruoti,
normalizuoti, klausti ir siūlyti, bet ne išgalvoti masto, kainų, terminų ar
darbo detalių.

## 4. Semantinis Matching'as

### Kas daroma

Pirmas etapas pradėtas shadow mode principu: tiekėjo užklausų API apskaičiuoja
deterministinį semantinį balą pagal tiekėjo profilio ir užklausos tekstinius
signalus, bet nekeičia vartotojui matomo rūšiavimo. Dabartinis kategorijų ir
lokacijos matching'as lieka kaip saugus gate'as.

Vėlesniame etape šį sluoksnį galima keisti į tikrus embeddings tiekėjų
profiliams ir klientų užklausoms. Embeddings būtų naudojami reitingavimui, ne
pirminiam leidimui.

### Kodėl

Kategorijos vienos nepakankamos. Du tiekėjai gali būti toje pačioje kategorijoje,
bet realiai specializuotis skirtinguose darbuose. Semantinis matching'as ilgainiui
tampa marketplace moat'u.

### Nauda

- Klientui: užklausą pamato tinkamesni tiekėjai.
- Tiekėjui: mažiau nereikalingų lead'ų.
- CEO: geresnis supply-demand matching ir daugiau atsakymų per užklausą.

### Rizikos

Jei ranking'as neteisingas, gali kristi pasitikėjimas. Todėl pradžioje jis turi
būti tik shadow mode ir lyginamas su dabartiniu scoring'u.

## 5. Follow-Up Agentas

### Kas daroma

Agentas seka pokalbių būsenas ir siūlo veiksmą. MVP (advisory only) jau įdiegtas
ir veikia per `src/lib/ai/follow-up.ts`. Detektorius deterministinis (be LLM
kvietimo), todėl pigus ir saugus rodyti realiu laiku.

Stebimi keturi buckets:

- `provider_replied_client_silent`: tiekėjas atsakė, klientas tyli ≥ 2 d.
- `client_open_no_provider_replies`: atvira užklausa be atsakymų ≥ 3 d.
- `provider_no_reply_to_lead`: klientas parašė, tiekėjas tyli ≥ 1 d.
- `client_inquiry_provider_silent`: tiesioginė užklausa be tiekėjo
  atsakymo ≥ 2 d.

Siūlomi veiksmai (žmogui — agentas nieko nesiunčia):

- priminti klientui, kad laukia pasiūlymo;
- atkreipti dėmesį į užklausą be atsakymų;
- priminti tiekėjui apie laukiantį lead'ą arba tiesioginę žinutę.

### API ir paviršiai

- `GET /api/tiekejas/follow-ups` — tik aktyvus tiekėjas, grąžina jo paties
  sustojusių pokalbių sąrašą su patarimu. Response thread'ai linkuoja į
  `/tiekejas/uzklausos/{requestId}`, tiesioginės užklausos — į
  `/tiekejas/zinutes/{directInquiryId}`.
- `/api/admin/stats` papildomai grąžina `followUps` agregatą: bucket counts,
  iki 5 sustojusių lead'ų ir iki 5 užklausų be atsakymų.
- `FollowUpAgentCard` admin suvestinėje rodo signalą su veiksmų sąrašu.
- `ProviderFollowUpsCard` tiekėjo dashboard'e rodo iki 3 suplautų signalų
  su nuoroda į detalų puslapį. Kortelė atsiranda tik kai yra signalų ir tik
  aktyviems patvirtintiems tiekėjams.
- Kiekvienas scan'as įrašo vieną `AiRun` su `feature = "follow_up_scan"` ir
  agregatų metadata.

### Kodėl

Marketplace sandoriai dažnai žūsta ne dėl blogos pasiūlos, o dėl nutrūkusios
komunikacijos.

### Nauda

- Klientui: mažiau „niekas nevyksta“ jausmo.
- Tiekėjui: daugiau atgaivintų pokalbių.
- CEO: didesnė konversija iš užklausos į realų kontaktą.

### Rizikos

Per daug automatinių priminimų gali erzinti. Defaultas: ribotas dažnis ir aiški
vartotojo kontrolė. MVP nieko automatiškai nesiunčia ir neeikvoja kreditų;
sekantis žingsnis (out-of-MVP) — neprivalomi human-in-the-loop priminimai per
esamus pranešimų kanalus.

### Privatumas

`follow_up_scan` AiRun metadata laikomi tik agregatai (`scope`, `totalThreads`,
bucket counts). Pokalbių tekstai, klientų ar tiekėjų telefonai, el. paštai
audit'e nesaugomi. Tiekėjo endpointas grąžina užklausos pavadinimą tik tam
tiekėjui, kuriam ji priklauso; tiesioginių užklausų atveju vietoj turinio
rodoma generinė antraštė „Tiesioginė užklausa“.

## 6. CEO Intelligence

### Kas daroma

Admin panelėje palaipsniui turi atsirasti marketplace intelligence:

- kategorijos su didele paklausa ir maža pasiūla;
- tiekėjai su aktyvumu, bet žema konversija;
- užklausos, kurios negauna atsakymų;
- AI funkcijos pagal naudojimą, klaidas ir latency;
- savaitinė santrauka, ką verta gerinti.

Pirmas blokas jau įgyvendintas admin suvestinėje: rodomos kategorijos, kuriose
per 14 dienų paklausa lenkia aktyvių tiekėjų pasiūlą, naujos užklausos be
atsakymų ir trumpi veiksmo signalai.

### Kodėl

CEO reikia ne tik skaičių, bet veiksmų sąrašo. Platforma turi būti valdoma pagal
signalus, ne tik intuiciją.

### Nauda

- Aiškiau matosi, kur auginti tiekėjus.
- Aiškiau matosi, kur tvarkyti kategorijas.
- Aiškiau matosi, kur stringa klientų kelias.
- Lengviau suprasti, kurios AI funkcijos kuria realią vertę.

## API Ir Duomenų Kontraktai

### AiRun

`AiRun` saugo tik operacinę metadata:

- `feature`
- `status`
- `provider`
- `model`
- `promptVersion`
- `latencyMs`
- `actorUserId`
- `entityType`
- `entityId`
- `errorCode`
- `metadataJson`

Pilni promptai, klientų kontaktai ir vartotojų tekstai čia nesaugomi.

### Lead Co-Pilot Endpoint

`POST /api/tiekejas/uzklausos/[id]/copilot`

Grąžina:

- `fitSummary`
- `fitReasons`
- `questions`
- `riskSignals`
- `nextStep`
- `confidence`

Reikalavimai:

- aktyvus tiekėjas;
- eligibility check;
- tiekėjas dar nėra atsakęs į šią užklausą;
- jokių piniginių ar komunikacijos veiksmų.

### Admin Stats

`GET /api/admin/stats` grąžina `aiUsage`:

- total14d;
- success14d;
- error14d;
- avgLatencyMs;
- lastRunAt;
- byFeature;
- recentErrors.

## Test Plan

Privalomi patikrinimai po AI pakeitimų:

```bash
npx prisma generate
npm run lint
npm run build
```

DB patikra:

- pritaikyti naują manual migration;
- patikrinti `prisma.aiRun.count()`;
- atlikti bent vieną AI veiksmą;
- patikrinti, kad atsiranda `ai_runs` įrašas.

Tiekėjo co-pilot scenarijai:

- aktyvus tiekėjas, tinkama kategorija, neatsakyta užklausa grąžina įžvalgą;
- tiekėjas jau atsakė, endpointas neleidžia generuoti;
- tiekėjas neturi eligibility, gaunamas 403;
- AI timeout arba modelio klaida rodo saugią klaidą ir įrašo audit error.

Admin scenarijai:

- `ai_runs` tuščia, dashboard rodo tuščią AI būseną;
- yra success/error įrašų, dashboard rodo totals, error rate, latency,
  funkcijas;
- DB migracija nepritaikyta, stats endpointas nesugriauna admin dashboard'o.

Privacy scenarijus:

- audit įrašuose nėra pilnų užklausų aprašymų, telefonų, el. paštų ar promptų.

## Įgyvendinimo Prioritetas

1. AI audit ir admin AI health. ✅
2. Tiekėjo lead co-pilot. ✅
3. Kliento užklausos agento UX sustiprinimas. ✅ (v1)
4. Semantinis matching'as shadow mode. ✅ (shadow)
5. Follow-up agentas. ✅ (advisory MVP)
6. CEO intelligence išplėtimas.

## Defaultai

- AI yra pagalbininkas, ne autonominis aktorius.
- Pirmas komercinis prioritetas yra tiekėjo pusė.
- OpenRouter lieka dabartinis provider.
- Architektūra turi leisti vėliau pereiti prie Vercel AI Gateway ar kito modelių
  sluoksnio.
- Kiekviena nauja AI funkcija turi būti auditinama per `AiRun`.
