# Label audit — hand-judge sample (you judge; I generated the labels so I cannot)

35 rows. Strata: weak-branch (Nuoma/Maistas/Dailė/Prekyba), branch-hit-leaf-miss (engine got the right branch, missed the leaf — prime "acceptable alternative" cases), abstain (engine returned nothing).

Fill the last two columns: **label_correct?** (is MY expected label right for the query?) and **engine_pick_acceptable?** (is the engine top-1 a defensible answer?). For acceptable picks, copy the id into data/routing/eval/category-selection-acceptable-sets.json under that query.

| stratum | branch | query | expected_label | engine_top1 | engine_top3 | label_correct? | engine_pick_acceptable? |
|---|---|---|---|---|---|---|---|
| weak-branch | Nuomos paslaugos | batutu nuoma vaiku gimtadieniui | Batutų nuoma | Batutų nuoma | Batutų nuoma | Vaikų gimtadienių, švenčių vedimas |  |  |
| weak-branch | Nuomos paslaugos | ieskau betono maisykles nuomai statyboms | Įrankių nuoma | Betono maišyklės nuoma | Betono maišyklės nuoma | Betono siurblio nuoma |  |  |
| weak-branch | Nuomos paslaugos | isnuomociau pirti vakarui | Pirties nuoma | Pirtininko paslaugos | Pirtininko paslaugos | Pirties procedūros | Pirties krosnys |  |  |
| weak-branch | Nuomos paslaugos | limuzino i vestuves | Prabangių automobilių nuoma, transportas vestuvėms | Vestuvių muzikantai | Vestuvių muzikantai | Vestuvių fotosesija | Vestuvių šventės vedimas |  |  |
| weak-branch | Nuomos paslaugos | masina savaitgaliui | Automobilių nuoma | Mezgimas mezgimo mašina | Mezgimas mezgimo mašina | Skalbimo mašinos pajungimas | Putų šou, putų mašinos nuoma |  |  |
| weak-branch | Maistas, konditerija | baras vestuvems | Mobilaus baro nuoma | Mobilus kokteilių baras vakarėlyje | Mobilus kokteilių baras vakarėlyje | Sodybos vestuvėms | Prabangių automobilių nuoma, transportas vestuvėms |  |  |
| weak-branch | Maistas, konditerija | food truck festivaliui | Food truck, maisto vagonėlis | Food truck, maisto vagonėlis | Food truck, maisto vagonėlis |  |  |
| weak-branch | Maistas, konditerija | ieskau prekybos maisto produktais didmena | Prekyba maisto produktais | Prekyba maisto produktais | Prekyba maisto produktais | Prekyba maisto papildais ir vitaminais |  |  |
| weak-branch | Maistas, konditerija | kas iskeptu sefa ant grilio per vakareli | Grill šefai | Mobilus kokteilių baras vakarėlyje | Mobilus kokteilių baras vakarėlyje | Vakarėlių apšvietimas | Teminių vakarėlių organizavimas |  |  |
| weak-branch | Maistas, konditerija | maistas 50 zmoniu jubiliejui | Banketų ir furšetų ruošimas | Dingusių žmonių paieška | Dingusių žmonių paieška | Muzikantai jubiliejui | Food truck, maisto vagonėlis |  |  |
| weak-branch | Dailė, menai, keramika | antspaudo gamyba | Antspaudų gamyba | Antspaudų gamyba | Antspaudų gamyba |  |  |
| weak-branch | Dailė, menai, keramika | graviruoti vardus ant taures lazeriu | Pjovimas lazeriu | Pjaustymas lazeriu | Pjaustymas lazeriu | Pjovimas lazeriu |  |  |
| weak-branch | Dailė, menai, keramika | ieskau dailininko kuris perdazytu sena komoda su raštais | Baldų dekoravimas | Malkos rąstais | Malkos rąstais |  |  |
| weak-branch | Dailė, menai, keramika | kaledu senelis i vaiko gimtadieni | Kalėdų senelis šventėje | Kalėdų senelis šventėje | Kalėdų senelis šventėje |  |  |
| weak-branch | Dailė, menai, keramika | kas padaro tuos blizgancius vitrazo langelius i duris | Vitražai, stiklo interjero detalės | Vitražų gamyba | Vitražų gamyba |  |  |
| weak-branch | Prekyba | ieskau dazu automobiliui be didiliu | Prekyba dažais jachtoms ir automobiliams | Pagalba užklimpus automobiliui | Pagalba užklimpus automobiliui | Lengvųjų automobilių nuoma | Daužtų automobilių supirkimas |  |  |
| weak-branch | Prekyba | ieskau kur isigyti naujus žiemines padangas ir ratlankius automobiliui | Prekyba automobilių dalimis | Ratlankių dažymas | Ratlankių dažymas | Ratlankių lyginimas, remontas | Padangų, ratų montavimas |  |  |
| weak-branch | Prekyba | kur gaut geru sportbaciu | Prekyba avalyne | Sporto programos sudarymas | Sporto programos sudarymas |  |  |
| weak-branch | Prekyba | noriu nusipirkti vitaminu vaikams | Prekyba maisto papildais ir vitaminais | Animatoriai, personažai vaikams | Animatoriai, personažai vaikams | Šokiai vaikams, jaunimui | Kalėdinės programos vaikams |  |  |
| weak-branch | Prekyba | parduodu sofa | Prekyba baldais | El. parduotuvių kūrimas | El. parduotuvių kūrimas | Konsultacija parduodant automobilį | El. parduotuvių kūrimas su OpenCart |  |  |
| branch-hit-leaf-miss | Mokymai, kursai, kalbos | anglu pamokos vaikui | Anglų kalbos kursai, pamokos | Privačios anglų kalbos pamokos | Privačios anglų kalbos pamokos | Anglų kalba internetu | Anglų kalbos kursai |  |  |
| branch-hit-leaf-miss | Grožio paslaugos | antakiu tatuiruote | Permanentinis makiažas | Antakių permanentinis makiažas | Antakių permanentinis makiažas | Antakių korekcija | Antakių dažymas |  |  |
| branch-hit-leaf-miss | Tradiciniai amatai | antkapis | Paminklai kapams, antkapiai | Paminklai kapams, antkapiai | Paminklai kapams, antkapiai | Paminklų, antkapių montavimas |  |  |
| branch-hit-leaf-miss | Laisvalaikis, pramogos, turizmas | batutai vaiku gimtadieniui | Batutų nuoma | Vaikų gimtadienių, švenčių vedimas | Vaikų gimtadienių, švenčių vedimas |  |  |
| branch-hit-leaf-miss | Buitinės paslaugos | buto generalinis valymas | Valymo paslaugos | Generalinis patalpų valymas | Generalinis patalpų valymas | Buto valymas po nuomininkų |  |  |
| branch-hit-leaf-miss | Renginiai, šventės | didzejus vestuvem | Djs | Vestuvių muzikantai | Vestuvių muzikantai | Vestuvių fotosesija | Vestuvių šventės vedimas |  |  |
| branch-hit-leaf-miss | Statybos, apdaila | gręžinys vandeniui | Vandens gręžiniai | Giluminiai vandens gręžiniai | Giluminiai vandens gręžiniai | Vandens gręžiniai | Mini gręžiniai |  |  |
| branch-hit-leaf-miss | Paslaugos verslui | ieskau buhalterio del mokesciu deklaracijos | Konsultacijos mokesčių klausimais | Deklaracijų pildymas, teikimas | Deklaracijų pildymas, teikimas | Buhalterio konsultacija |  |  |
| branch-hit-leaf-miss | NT ir tarpininkavimas | ieskau nekilnojamo turto brokerio buto pardavimui vilniuje | Nekilnojamo turto brokeriai | Turto vertinimas | Turto vertinimas | Nekilnojamojo turto fotografavimas | Nekilnojamo turto nuoma |  |  |
| branch-hit-leaf-miss | Transportas | ieškau autoserviso variklio remontui | Autoservisai, automobilių remontas | Variklių remontas | Variklių remontas | Elektros variklių remontas |  |  |
| branch-hit-leaf-miss | Internetas, IT | ieškau dizainerio interneto svetainės maketui sukurti | Svetainių dizainas (web design) | Svetainių dizainas (web design) | Svetainių dizainas (web design) | Interjero maketų gamyba | Spaudos maketų gamyba |  |  |
| branch-hit-leaf-miss | Sveikata, gydymas | ieškau jogos trenerio pradedantiesiems | Joga, jogos treneriai | Individualios jogos treniruotės | Individualios jogos treniruotės | Grupinės jogos treniruotės |  |  |
| abstain | Dokumentai, tyrimai, konsultavimas | dingo žmogus | Dingusių žmonių paieška | (abstain) | (none) |  |  |
| abstain | Paslaugos augintiniams | kam isvest snuki pasivaiksciot kol darbe | Šunų viešbučiai, vedžiojimas, priežiūra | (abstain) | (none) |  |  |
| abstain | Renginiai, šventės | kas pagros gyvai per baliu | Pasirodymai, šou renginiams | (abstain) | (none) |  |  |
