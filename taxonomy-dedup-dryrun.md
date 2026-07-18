# Taksonomijos dedup — dry-run suliejimo žemėlapis

**Sugeneruota:** 2026-06-15 · **Statusas:** TIK PERŽIŪRAI. DB nekeista, kodas nekeistas, jokia migracija nepaleista.
**Šaltinis:** `categories` kur `pageType='service' AND externalSource='paslaugurinka-taxonomy' AND isActive=true`.
> Generuotas artefaktas — galima įtraukti į `.gitignore`, jo komitinti nereikia.

---

## 1. Problema vienu sakiniu

Ta pati paslauga taksonomijoje įrašyta po kelis kartus, skirtingose šakose. Pvz. `Židinių montavimas` egzistuoja **4 kartus** (4 atskiri ID), todėl paieška „židin" sąžiningai parodo visus. Dedup = palikti **vieną kanoninį** įrašą kiekvienam pavadinimui, kitus sulieti į jį.

## 2. Mastas

| Rodiklis | Skaičius |
|---|---|
| Viso įrašų (kanoninė taksonomija) | 3255 |
| Unikalūs pavadinimai | 1942 |
| Dubliuotų pavadinimų grupės | 820 |
| → Lengvos (vien lapai, automatinis suliejimas) | **712** |
| → Sunkios (yra tėvų su vaikais, reikia sprendimo) | **108** |
| Perteklinės kopijos, kurias išjungti | **1313** |
| Nuorodų, kurias reikia perkelti (vienintelis duomenų judinimas) | **9** |

**Esmė:** mechanika triviali (perkelti 9 nuorodas, išjungti 1313 įrašų, padaryti 1313 slug nukreipimų). Tikrasis darbas — patvirtinti **108 sunkias grupes** ir slug nukreipimų sąrašą.

## 3. Kanoninio ID parinkimo taisyklė (deterministinė)

Kiekvienoje pavadinimo grupėje kanoninis = pirmas pagal:
1. **Daugiausiai naudojimo** (tiekėjų pasirinkimai + užklausų kategorijos + užklausų pagr. kat.) — laikom tą, kuris jau referuojamas, kad mažiau perkelti.
2. **Turi vaikų** (kad nesuluptume realios šakos).
3. **Mažesnis gylis** (arčiau šaknies).
4. **Mažiausias ID** (stabilumui).

> Sunkioms grupėms (108) tai tik **siūlymas** — „namų" šaką turi patvirtinti žmogus (pvz. `Kompiuterių remontas` taisyklė pasiūlė `Paslaugos verslui`, bet semantiškai gal labiau `Internetas, IT`).

---

## 4. Pavyzdys: „židin" šeima (tavo pradinis ekranas)

| Pavadinimas | Tėvas | Sprendimas |
|---|---|---|
| **Akmens mūras, lauko židiniai, tvoros** | Statybos, apdaila | ✅ KANONINIS |
| Akmens mūras, lauko židiniai, tvoros | Tradiciniai amatai | → sulieti |
| **Lauko židiniai iš akmens** | Židinių meistrai (Interjeras) | ✅ KANONINIS |
| Lauko židiniai iš akmens | Akmens mūras… (Tradiciniai amatai) | → sulieti |
| Lauko židiniai iš akmens | Akmens mūras… (Statybos) | → sulieti |
| Lauko židiniai iš akmens | Židinių meistrai (Statybos) | → sulieti |
| **Židinių apdaila** | Akmens masės, marmuro, granito darbai | ✅ KANONINIS |
| Židinių apdaila | Originalios interjero detalės | → sulieti |
| Židinių apdaila | Židinių meistrai (Interjeras) | → sulieti |
| Židinių apdaila | Interjero dekoravimas | → sulieti |
| Židinių apdaila | Židinių meistrai (Statybos) | → sulieti |
| **Židinių meistrai** | Statybos, apdaila | ✅ KANONINIS |
| Židinių meistrai | Interjeras, baldai | → sulieti |
| Židinių meistrai | Vidaus apdailos darbai | → sulieti |
| **Židinių montavimas** | Židinių meistrai (Statybos) | ✅ KANONINIS |
| Židinių montavimas | Židinių meistrai (Interjeras) | → sulieti |
| Židinių montavimas | Katilų montavimas (Buitinės) | → sulieti |
| Židinių montavimas | Katilų montavimas (Statybos) | → sulieti |
| **Židinių mūrijimas** | Krosnys, krosnių meistrai | ✅ KANONINIS |
| Židinių mūrijimas | Židinių meistrai (Interjeras) | → sulieti |
| Židinių mūrijimas | Židinių meistrai (Statybos) | → sulieti |

Po dedup meistras, vesdamas „židin", pamatys **~7 unikalias** paslaugas vietoj ~23.

> ⚠️ **Įdėtinis dublikatas:** `Akmens mūras…` pati yra dublikatas-tėvas, o po ja kabo `Lauko židiniai iš akmens`. Suliejant tėvą reikia pirma sutvarkyti vaikus → tokios grupės eina į „sunkias" ir liejamos nustatyta tvarka (gilesni pirma).

---

## 5. Nuorodų perkėlimas — VISAS sąrašas (9, vienintelis duomenų judinimas)

Tai vienintelės šalinamos kopijos, kurios turi realų naudojimą. Visa kita — tiesiog išjungiama.

| Pavadinimas | tiek. | užkl.kat | Iš (šalinama) | → Į (kanoninis) |
|---|---|---|---|---|
| Dedikuotų serverių administravimas | 0 | 1 | …paslaugos-verslui--it-specialistai--… | …internetas-it--it-specialistai--… |
| Durų remontas | 1 | 0 | …buitines-paslaugos--langai-durys--duru-remontas | …statybos-apdaila--langai-durys--duru-remontas |
| Elektroninių įrenginių kūrimas/remontas | 0 | 1 | …statybos-apdaila--elektronikos-inzinieriai--… | …buitines-paslaugos--elektronikos-inzinieriai--… |
| Grindų betonavimas | 1 | 0 | …vidaus-apdailos-darbai--grindu-betonavimas | …betonavimo-darbai--grindu-betonavimas |
| Kalviai, kalvystės darbai | 1 | 0 | …aplinka-sodas--kalviai-kalvystes-darbai | …tradiciniai-amatai--kalviai-kalvystes-darbai |
| Kompiuterių supirkimas | 0 | 1 | …buitines-paslaugos--kompiuteriu-remontas--… | …internetas-it--kompiuteriu-remontas--… |
| Kompiuterių supirkimas | 0 | 1 | …paslaugos-verslui--kompiuteriu-remontas--… | …internetas-it--kompiuteriu-remontas--… |
| Langų, durų apdaila | 0 | 1 | …langai-durys--langu-duru-apdaila | …vidaus-apdailos-darbai--langu-duru-apdaila |
| Reklamos paslaugos | 1 | 0 | …reklama-dizainas-spauda--reklamos-paslaugos | …paslaugos-verslui--reklamos-paslaugos |

Iš viso: **4 tiekėjų pasirinkimai + 5 užklausų kategorijos = 9 nuorodos.** Užklausų pagrindinė kategorija ir tiekėjų nuorodos (`supplier_category_links`) ant šalinamų kopijų — **0**.

---

## 6. Sunkios grupės — 108 (reikia tavo „namų" patvirtinimo)

⚠️ = grupė turi naudojimą (peržiūrėti pirma). Kopijos = kiek įrašų grupėje.

### 6.1. Su naudojimu (16) — prioritetas

| Pavadinimas | Kopijos | Siūlomas kanoninis tėvas |
|---|---|---|
| ⚠️ Kalviai, kalvystės darbai | 3 | Tradiciniai amatai |
| ⚠️ Skalda, smėlis, žvyras, juodžemis | 3 | Žemės kasimas, lyginimas |
| ⚠️ Tvoros, vartai, montavimas | 3 | Aplinka, sodas |
| ⚠️ Reklamos paslaugos | 2 | Paslaugos verslui |
| ⚠️ Santechnikai, santechnikos darbai | 2 | Statybos, apdaila |
| ⚠️ Mikroautobusų nuoma | 5 | Transportas |
| ⚠️ Automobilių nuoma | 3 | Transportas |
| ⚠️ Pagalbiniai darbininkai | 3 | Transportas |
| ⚠️ Siuvimas, siuvyklos, siuvėjai | 3 | Tradiciniai amatai |
| ⚠️ Trinkelių klojimas | 3 | Aplinka, sodas |
| ⚠️ Medžio darbai, staliai | 2 | Statybos, apdaila |
| ⚠️ Mobiliųjų aplikacijų kūrimas | 2 | Internetas, IT |
| ⚠️ Perkraustymo paslaugos | 2 | Transportas |
| ⚠️ Programuotojai | 2 | Internetas, IT |
| ⚠️ Smėliavimas, dažymas | 2 | Statybos, apdaila |
| ⚠️ Vidaus apdailos darbai | 2 | Statybos, apdaila |

### 6.2. Be naudojimo (92) — tik struktūros sprendimas

| Pavadinimas | Kopijos | Siūlomas kanoninis tėvas |
|---|---|---|
| Siuvinėjimas | 5 | Apranga, papuošalai, aksesuarai |
| Kailinių siuvimas | 4 | Apranga, papuošalai, aksesuarai |
| Katilų montavimas, remontas | 4 | Statybos, apdaila |
| Medžių genėjimas, pjovimas | 4 | Tradiciniai amatai |
| Palapinių, paviljonų nuoma | 4 | Renginiai, šventės |
| SEO paslaugos | 4 | Internetas, IT |
| Užuolaidų siuvimas | 4 | Interjeras, baldai |
| Dujų įvedimas, pajungimas | 3 | Statybos, apdaila |
| Fotografai verslui | 3 | Reklama, dizainas, spauda |
| Garažo vartai, montavimas | 3 | Statybos, apdaila |
| Grafikos dizaineriai | 3 | Internetas, IT |
| Iliustruotojai | 3 | Dailė, menai, keramika |
| Įrankių nuoma | 3 | Statybos, apdaila |
| Kompiuterių remontas | 3 | Paslaugos verslui |
| Laistymo sistemos, įrengimas | 3 | Aplinka, sodas |
| Langai, durys: gamyba, montavimas | 3 | Statybos, apdaila |
| Malkos: gamyba, pristatymas | 3 | Tradiciniai amatai |
| Mobilus padangų montavimas | 3 | Transportas |
| Pirties nuoma | 3 | Nuomos paslaugos |
| Roletai, žaliuzės, romanetės | 3 | Buitinės paslaugos |
| Šiukšlių išvežimas: statybinių ir kt. | 3 | Statybos, apdaila |
| Sodybos nuomai | 3 | Renginiai, šventės |
| Šokiai, šokių pamokos | 3 | Mokymai, kursai, kalbos |
| Srautinis valymas | 3 | Statybos, apdaila |
| Stiklų, veidrodžių gamyba, keitimas | 3 | Statybos, apdaila |
| Suknelių nuoma | 3 | Nuomos paslaugos |
| Vejos priežiūra, įrengimas | 3 | Aplinka, sodas |
| Ventiliacija, vėdinimo sistemos | 3 | Statybos, apdaila |
| Video klipų kūrimas | 3 | Reklama, dizainas, spauda |
| Židinių meistrai | 3 | Statybos, apdaila |
| Akmens mūras, lauko židiniai, tvoros | 2 | Statybos, apdaila |
| Aplinkos tvarkymas, apželdinimas | 2 | Statybos, apdaila |
| Apšiltinimas, šiltinimas | 2 | Statybos, apdaila |
| Apšvietimo, įgarsinimo paslaugos | 2 | Renginiai, šventės |
| Architektai, projektavimas | 2 | Statybos, apdaila |
| Baldų projektavimas, dizaineriai | 2 | Interjeras, baldai |
| Barmenai, gėrimai renginiams | 2 | Maistas, konditerija |
| Betonavimo darbai, betonavimas | 2 | Statybos, apdaila |
| Dailės mokytojai | 2 | Mokymai, kursai, kalbos |
| Dietologai | 2 | Grožio paslaugos |
| Djs | 2 | Renginiai, šventės |
| Dviračių, paspirtukų remontas | 2 | Transportas |
| Ekskursijos, gidai | 2 | Tradiciniai amatai |
| Elektronikos inžinieriai | 2 | Statybos, apdaila |
| Fotostudijos | 2 | Renginiai, šventės |
| Frezavimas (CNC) | 2 | Gamyba, prototipavimas, techniniai darbai |
| Graviravimo paslaugos | 2 | Renginiai, šventės |
| Griovimo darbai | 2 | Statybos, apdaila |
| Grožio specialistų mokymai | 2 | Mokymai, kursai, kalbos |
| Indų nuoma | 2 | Renginiai, šventės |
| Internetinio verslo konsultantai | 2 | Paslaugos verslui |
| Interneto svetainių kūrimas | 2 | Paslaugos verslui |
| IT specialistai | 2 | Paslaugos verslui |
| Joga, jogos treneriai | 2 | Sveikata, gydymas |
| Juvelyrai, juvelyriniai dirbiniai | 2 | Apranga, papuošalai, aksesuarai |
| Kaligrafijos meistrai | 2 | Dailė, menai, keramika |
| Kaminų valymas | 2 | Buitinės paslaugos |
| Keramikai | 2 | Dailė, menai, keramika |
| Kineziterapeutai | 2 | Sveikata, gydymas |
| Laivo nuoma | 2 | Nuomos paslaugos |
| Maitinimas, maistas šventėms | 2 | Renginiai, šventės |
| Medelynai, uogos, gėlės | 2 | Aplinka, sodas |
| Mezgėjos | 2 | Apranga, papuošalai, aksesuarai |
| Mobiliųjų telefonų remontas | 2 | Buitinės paslaugos |
| Moto nuoma | 2 | Transportas |
| Nuotekų valymo įrenginiai | 2 | Buitinės paslaugos |
| Odininkai, odos gaminiai | 2 | Apranga, papuošalai, aksesuarai |
| Paminklai kapams, antkapiai | 2 | Tradiciniai amatai |
| Plėvelės klijavimas | 2 | Paslaugos verslui |
| Pramogos vaikams | 2 | Renginiai, šventės |
| Rąstinių namų statyba | 2 | Statybos, apdaila |
| Reklamos gamyba | 2 | Reklama, dizainas, spauda |
| Restauravimas | 2 | Buitinės paslaugos |
| Signalizacijos, kameros, apsaugos sistemos | 2 | Statybos, apdaila |
| Skulptoriai | 2 | Tradiciniai amatai |
| Sniego valymas | 2 | Buitinės paslaugos |
| Spaudos paslaugos | 2 | Paslaugos verslui |
| Statybos dokumentų tvarkymas | 2 | Statybos, apdaila |
| Stiklo konstrukcijos, montavimas | 2 | Interjeras, baldai |
| Stilistai | 2 | Grožio paslaugos |
| Stogdengiai, stogo darbai | 2 | Statybos, apdaila |
| Šventinės įrangos nuoma | 2 | Renginiai, šventės |
| Tekstų kūrėjai | 2 | Paslaugos verslui |
| Telekomunikacijų įrangos montuotojai | 2 | Statybos, apdaila |
| Vandens filtrai: montavimas, keitimas | 2 | Buitinės paslaugos |
| Vandens gręžiniai | 2 | Statybos, apdaila |
| Vėlėjos | 2 | Tradiciniai amatai |
| Vertėjai, vertimų biurai | 2 | Mokymai, kursai, kalbos |
| Vestuvių planuotojai | 2 | Renginiai, šventės |
| Vitražai, stiklo interjero detalės | 2 | Interjeras, baldai |
| Žemės kasimas, lyginimas | 2 | Statybos, apdaila |
| Žemės ūkio technikos nuoma | 2 | Transportas |

---

## 7. Lengvos grupės (712) — automatinis suliejimas

Visos kopijos yra lapai (be vaikų) → taisyklė parenka kanoninį be žmogaus. ~1130 perteklinių kopijų išjungiama, slug'ai nukreipiami. Pilną sąrašą galima išvesti 8 sk. užklausa (filtras `parents_in_grp = 0`).

---

## 8. Atkartojama SQL (pilnas žemėlapis vienu kart)

```sql
WITH canon AS (
  SELECT id, name, slug, "parentId", depth
  FROM categories
  WHERE "pageType"='service' AND "externalSource"='paslaugurinka-taxonomy' AND "isActive"=true
),
dup_names AS (SELECT name FROM canon GROUP BY name HAVING count(*)>1),
rows AS (
  SELECT c.*,
    (SELECT count(*) FROM provider_profile_categories p WHERE p."categoryId"=c.id)
   +(SELECT count(*) FROM service_request_categories s WHERE s."categoryId"=c.id)
   +(SELECT count(*) FROM service_requests r WHERE r."categoryId"=c.id) AS usage,
    EXISTS(SELECT 1 FROM categories ch WHERE ch."parentId"=c.id) AS has_children
  FROM canon c JOIN dup_names d ON c.name=d.name
),
ranked AS (
  SELECT *,
    row_number() OVER (PARTITION BY name ORDER BY usage DESC, has_children DESC, depth ASC, id ASC) AS rn,
    first_value(id)   OVER (PARTITION BY name ORDER BY usage DESC, has_children DESC, depth ASC, id ASC) AS canon_id,
    first_value(slug) OVER (PARTITION BY name ORDER BY usage DESC, has_children DESC, depth ASC, id ASC) AS canon_slug,
    count(*) FILTER (WHERE has_children) OVER (PARTITION BY name) AS parents_in_grp
  FROM rows
)
-- Kiekviena šalinama kopija → jos kanoninis (tai migracijos įvestis)
SELECT name, slug AS salinamas_slug, id AS salinamas_id,
       canon_slug, canon_id, usage, parents_in_grp
FROM ranked
WHERE rn > 1
ORDER BY parents_in_grp DESC, usage DESC, name;
```

---

## 9. Kas būtų vykdoma realiai (TIK kai patvirtinsi — dabar nieko)

1. **Patvirtinti** 6.1 + 6.2 „namų" šakas (ypač 16 su ⚠️).
2. **Perkelti 9 nuorodas** (5 sk.) į kanoninius ID.
3. **Išjungti** 1313 kopijų (`isActive=false`, `pageType=NULL`) — kaip esama `20260615_deactivate_legacy_category_trees.sql`.
4. **Slug → 301 nukreipimai** (1313) į kanoninį, kad nebūtų 404 / neprarastume SEO.
5. **Validacija** staging'e: `pnpm test:routing-all` + golden eval, kad matchinimas/routingas nesugriūtų.

**Atsako taškas (rollback):** kol nešalinam fiziškai (tik `isActive=false`), atstatymas = vienas `UPDATE` atgal.
