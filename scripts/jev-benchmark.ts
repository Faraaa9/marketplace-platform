// Real-key Jev benchmark on public paslaugos.lt listings (2026-10-29, customer
// names omitted). Run: pnpm exec tsx scripts/jev-benchmark.ts with
// TYPESAFE_API_KEY, OPENROUTER_API_KEY and DATABASE_URL set. Reads only.
import { prisma } from "@/lib/prisma";
import { prepareMarketplaceContext } from "@/lib/typesafe/marketplace-context";
import { evaluateMarketplaceRequest } from "@/lib/typesafe/marketplace-intelligence";

// `accept`: our category names that count as a correct primary pick.
const CASES: { title: string; text: string; city: string; accept: string[] }[] = [
  { title: "Reikalingas aptarnavimas Kondicionieriaus/ oras-oras siurblio", text: "Sveiki, ieškau meistro, kuris galėtų patikrinti ir sutvarkyti oras–oras šilumos siurblį (kondicionierių) Vilniuje, Naujamiestyje. Kondicionierius sumontuotas prieš maždaug 3–4 metus, tačiau dabar jau gerokai prasčiau šaldo ir šildo. Įtariu, kad gali trūkti freono arba kažkur yra nuotėkis.", city: "Vilnius", accept: ["Kondicionierių remontas", "Šilumos siurblių remontas", "Kondicionierių priežiūra", "Šilumos siurblių priežiūra", "Ventiliacija, vėdinimo sistemos"] },
  { title: "Dažytojas", text: "Reikalinga sutvarkyti laiptinės sienas po vamzdyno keitimo", city: "Kaunas", accept: ["Sienų dažymas", "Laiptinių remontas", "Dažymo darbai", "Vidaus apdailos darbai", "Glaistymas", "Laiptinių dažymas"] },
  { title: "Reikalingi betonuotojai", text: "Reikalinga betonuotojų brigada galinti įrengti CFA polius, galvenas, rostverką, atraminę sieną ir monolitinius laiptus.", city: "Kauno r.", accept: ["Betonavimo darbai, betonavimas", "Pamatų liejimas, įrengimas", "Polių įrengimas", "Poliniai pamatai", "Monolitiniai darbai"] },
  { title: "Skubiai reikia isvalyti 56kv buta", text: "Skubiai reikia isvalyti 56kv buta. Kalnieciai. Langai, balkonai, nemazai daigtu reikes isnesti, sukrauti.", city: "Kaunas", accept: ["Butų valymas", "Valymo paslaugos", "Generalinis valymas", "Buto valymas"] },
  { title: "Sutvarkyti vandenį leidžiantį tualeto bakelį", text: "Pastatomo tualeto sename bakelyje nuolat laša vanduo iš vandens prileidimo mechanizmo. Butas.", city: "Klaipėda", accept: ["Santechnikas į namus", "Smulkūs santechnikos darbai", "Klozeto pajungimas", "Klozetų remontas", "Santechnikos darbai"] },
  { title: "Keleiviniai mikroautobusai", text: "Įmonė Vilniuje ieško ilgalaikei nuomai (apie metus laiko) 8-9 vietų keleivinių mikro autobusų 1-2 vnt. Būtų naudojamas darbo dienomis, iki 100 km per dieną darbuotojų vežimui į darbą ir iš jo.", city: "Vilnius", accept: ["Mikroautobusų nuoma", "Keleiviniai mikroautobusai"] },
  { title: "Trinkelių klojimas", text: "Rašomas projektas. Planuojama kloti trinkelėmis arba grįsti akmenimis taką ir nedidelę aikštelę. Yra trys laiptukų pakopos. Pagrindas šiuo metu yra betono plokščių. Darbų apimtis 335 m² ar mažesnis.", city: "Panevėžys", accept: ["Trinkelių klojimas", "Trinkelių klojimas, grindinys"] },
  { title: "Grindų betonavimas", text: "Ieškomi grindų betonuotojai! Ieškome meistrų, galinčių kitą savaitę išbetonuoti grindis smėlbetoniu. Vieta: Kaunas, V. Krėvės pr. Plotas: apie 254 m². Sluoksnio storis: 6 cm. Pagrindas: putplastis jau sudėtas, reikia įrengti grindų išlyginamąjį sluoksnį (stiažkę).", city: "Kaunas", accept: ["Grindų betonavimas", "Grindų liejimas", "Grindų išlyginimas"] },
  { title: "Šeimos fotosesija", text: "Šeimos-senelių ir tetų fotosesija: 3 vaikai, 2 tėvai, 2 babytės, 1 senelis, teta. Atskirai šeimos nuotraukų, anūkų su seneliais ar tetomis.", city: "Kaunas", accept: ["Šeimos fotosesija", "Fotografai"] },
  { title: "Reikia pravesti elektros kabelį nuo KSpintos iki pastato", text: "Pramonės g., Vilnius, apie 100/150 metrų nuo spintos iki pastato, ESO projektas prijungimo yra.", city: "Vilnius", accept: ["Elektrikai, elektros darbai", "Elektros kabelių tiesimas", "Elektros instaliacija", "Elektros įvado įrengimas", "Elektros darbai"] },
  { title: "Vonios įrengimas", text: "Reikia irengti dusa. Visi santechnikos mazgai paruosti. Reikia istatyti lataka, ideti elektrini kilimeli, islyginti grindis, hidroizoliacija ir isklijuoti plyteles.", city: "Klaipėda", accept: ["Vonios remontas", "Vonios įrengimas", "Plytelių klijavimas", "Vonios kambario įrengimas", "Dušo įrengimas"] },
  { title: "Plėvelės klijavimas", text: "17.5kv nuo saulės Vilnius Iki parduotuvė", city: "Vilnius", accept: ["Plėvelės klijavimas", "Langų plėvelės", "Langų tamsinimas", "Apsauginės plėvelės ant langų"] },
  { title: "Fiskaro nuoma", text: "Reikalingas fiskaras atvezti irengima is Svencioneliu i Pabrade. irengimo svoris 9500kg", city: "Švenčionių r.", accept: ["Fiskaro nuoma", "Fiskaras, fiskaro paslaugos"] },
  { title: "Autoelektrikai", text: "Citroen C4 Picasso. Neužsiveda po lietaus arba jei orų drėgmė aukšta. Taip pat reikėtų kėbulo darbų", city: "Vilnius", accept: ["Autoelektrikai"] },
  { title: "Siuvinėjimas žvyneliais", text: "Norėčiau panašiai išsiuvinėti megztinį.", city: "Vilnius", accept: ["Drabužių siuvinėjimas", "Siuvinėjimas"] },
];

const pct = (n: number) => `${Math.round(n * 100)}%`;

(async () => {
  let correct = 0, wrongAuto = 0, autos = 0, poolHit = 0;
  for (const c of CASES) {
    const ctx = await prepareMarketplaceContext({ text: `${c.title}\n\n${c.text}`, city: c.city });
    const r = await evaluateMarketplaceRequest(ctx);
    const accept = new Set(c.accept.map((n) => n.toLowerCase()));
    const inPool = ctx.categories.filter((x) => accept.has(x.name.toLowerCase())).map((x) => x.name);
    const ok = r.primaryCategoryName != null && accept.has(r.primaryCategoryName.toLowerCase());
    if (inPool.length) poolHit++;
    if (ok) correct++;
    if (r.decision === "auto") { autos++; if (!ok) wrongAuto++; }
    console.log(`${ok ? "OK " : r.decision === "auto" ? "BAD" : "-- "} ${c.title}
    Jev: ${r.primaryCategoryName ?? "nėra"} ${pct(r.primaryConfidence)} -> ${r.decision} | pool ${ctx.categories.length}, tinkami jame: ${inPool.join(", ") || "nėra"}
    skubu ${pct(r.urgencyProbability)} | per miglota ${pct(r.missingDetailsProbability)} | šlamštas ${pct(r.spamProbability)} | ${r.latencyMs}ms ${r.model}`);
  }
  console.log(`\nTeisinga kategorija: ${correct}/${CASES.length}; tinkama buvo pasiūlymuose: ${poolHit}/${CASES.length}; automatiškai: ${autos}, iš jų klaidingai: ${wrongAuto}`);
  await prisma.$disconnect();
})();
