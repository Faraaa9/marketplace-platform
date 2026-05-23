import dotenv from "dotenv";
import path from "path";

// Load .env.local (where DATABASE_URL lives) before Prisma init
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

// ─── Demo provider data ────────────────────────────────────────────
const DEMO_PASSWORD = "demo123";

interface DemoProvider {
  email: string;
  name: string;
  category: string;
  specializations: string[];
  description: string;
  headline: string;
  services: string;
  location: string;
  phone: string;
  priceFrom: number;
  experienceYears: number;
  offersInvoices: boolean;
  availableForUrgent: boolean;
  planType: string;
  website: string | null;
  images: string[];
  coverImage: string;
}

const DEMO_PROVIDERS: DemoProvider[] = [
  // ── SANTECHNIKA (4) ──────────────────────────────────────────────
  {
    email: "demo-tomas@test.lt",
    name: "Tomas Kazlauskas (DEMO)",
    category: "santechnika",
    specializations: ["santechnika", "statyba"],
    description:
      "Profesionalus santechnikas su 12 metų patirtimi Vilniaus regione. Specializuojuosi šildymo sistemų montavime, vamzdynų tiesime ir vonios kambarių įrengime. Dirbu tik su aukštos kokybės medžiagomis (Rehau, Viega, Geberit). Garantuoju švarų ir tvarkingą darbą – visada palieku darbo vietą švarią.",
    headline: "Šildymo sistemų ir santechnikos ekspertas",
    services:
      "• Šildymo sistemų montavimas ir remontas\n• Vandens ir kanalizacijos vamzdynų tiesimas\n• Vonios kambarių įrengimas 'nuo nulio'\n• Čiaupų, unitazų, dušo kabinų montavimas\n• Grindinio šildymo įrengimas\n• Avariniai santechnikos darbai 24/7",
    location: "Vilnius",
    phone: "+37061000001",
    priceFrom: 35,
    experienceYears: 12,
    offersInvoices: true,
    availableForUrgent: true,
    planType: "PRO",
    website: null,
    images: [
      "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=90",
      "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=90",
      "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=90",
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=90",
    ],
    coverImage: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=1200&q=90",
  },
  {
    email: "demo-andrius@test.lt",
    name: "Andrius Butkus (DEMO)",
    category: "santechnika",
    specializations: ["santechnika"],
    description:
      "Santechnikos meistras Kaune. Greitai ir kokybiškai atlieku visus santechnikos darbus – nuo paprasčiausio čiaupo keitimo iki pilno vonios kambario renovacijos. Turiu visus reikalingus įrankius ir atvykstu su savo medžiagomis. Darbų garantija – 2 metai.",
    headline: "Patikimas santechnikas Kaune",
    services:
      "• Čiaupų ir maišytuvų keitimas\n• Kanalizacijos valymas ir remontas\n• Boilerių montavimas\n• Skubūs santechnikos darbai",
    location: "Kaunas",
    phone: "+37061000002",
    priceFrom: 25,
    experienceYears: 8,
    offersInvoices: true,
    availableForUrgent: true,
    planType: "BASIC",
    website: null,
    images: [
      "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=800&q=90",
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&q=90",
      "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=90",
    ],
    coverImage: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=1200&q=90",
  },
  {
    email: "demo-dainius@test.lt",
    name: "Dainius Rimkus (TEST)",
    category: "santechnika",
    specializations: ["santechnika", "statyba"],
    description:
      "Atlieku santechnikos ir šildymo darbus Klaipėdoje ir apylinkėse. Daugiau nei 15 metų patirtis pramoniniuose ir gyvenamuosiuose objektuose. Dirbu su dujiniais ir elektriniais katilais, šilumos siurbliais.",
    headline: "Šildymo ir santechnikos sprendimai pajūryje",
    services:
      "• Šilumos siurblių montavimas\n• Dujinių katilų priežiūra\n• Radiatorių keitimas\n• Vamzdynų suvirinimas",
    location: "Klaipėda",
    phone: "+37061000003",
    priceFrom: 40,
    experienceYears: 15,
    offersInvoices: true,
    availableForUrgent: false,
    planType: "PRO",
    website: "https://rimkus-santechnika.lt",
    images: [
      "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=800&q=90",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=90",
    ],
    coverImage: "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=1200&q=90",
  },
  {
    email: "demo-rasa@test.lt",
    name: "Rasa Valaitienė (DEMO)",
    category: "santechnika",
    specializations: ["santechnika"],
    description:
      "Santechnikos inžinierė su daugiau nei 6 metų patirtimi. Projektuoju ir montuoju vandentiekio sistemas naujos statybos namuose. Konsultuoju dėl energetiškai efektyvių sprendimų.",
    headline: "Vandentiekio projektavimas ir montavimas",
    services:
      "• Vandentiekio projektavimas\n• Lietaus vandens surinkimo sistemos\n• Filtravimo sistemų montavimas\n• Konsultacijos",
    location: "Vilnius",
    phone: "+37061000004",
    priceFrom: 50,
    experienceYears: 6,
    offersInvoices: true,
    availableForUrgent: false,
    planType: "BASIC",
    website: null,
    images: [
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=90",
      "https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=800&q=90",
      "https://images.unsplash.com/photo-1581092162384-8987c1d64718?w=800&q=90",
    ],
    coverImage: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=90",
  },

  // ── IT (4) ───────────────────────────────────────────────────────
  {
    email: "demo-matas@test.lt",
    name: "Matas Jonaitis (DEMO)",
    category: "it",
    specializations: ["it", "dizainas"],
    description:
      "Full-stack programuotojas, kuriu modernias svetaines ir web aplikacijas su React, Next.js ir Node.js. Padėsiu nuo idėjos iki veikiančio produkto – dizainas, programavimas, paleidimas. Dirbu su startuoliais ir mažomis įmonėmis.",
    headline: "Modernių svetainių kūrimas",
    services:
      "• Svetainių kūrimas (React, Next.js)\n• El. parduotuvių kūrimas\n• SEO optimizacija\n• Techninė priežiūra ir palaikymas\n• Mobilių aplikacijų kūrimas",
    location: "Vilnius",
    phone: "+37061000005",
    priceFrom: 60,
    experienceYears: 7,
    offersInvoices: true,
    availableForUrgent: false,
    planType: "PRO",
    website: "https://matasdev.lt",
    images: [
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=90",
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=90",
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=90",
      "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=800&q=90",
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=90",
    ],
    coverImage: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=90",
  },
  {
    email: "demo-giedre@test.lt",
    name: "Giedrė Paulauskaitė (TEST)",
    category: "it",
    specializations: ["it"],
    description:
      "IT konsultantė ir sistemų administratorė. Padedu mažoms ir vidutinėms įmonėms sutvarkyti IT infrastruktūrą – nuo kompiuterių tinklų iki debesų sprendimų. Microsoft ir Google Workspace sertifikuota specialistė.",
    headline: "IT infrastruktūra jūsų verslui",
    services:
      "• Kompiuterių tinklų diegimas\n• Serverių administravimas\n• Debesų sprendimai (Google, Microsoft 365)\n• IT saugumo auditas\n• Duomenų atsarginės kopijos",
    location: "Kaunas",
    phone: "+37061000006",
    priceFrom: 45,
    experienceYears: 10,
    offersInvoices: true,
    availableForUrgent: true,
    planType: "BASIC",
    website: null,
    images: [
      "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800&q=90",
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=90",
      "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=90",
    ],
    coverImage: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=1200&q=90",
  },
  {
    email: "demo-lukas@test.lt",
    name: "Lukas Stankevičius (DEMO)",
    category: "it",
    specializations: ["it", "dizainas"],
    description:
      "UI/UX dizaineris ir front-end programuotojas. Kuriu intuityvius ir gražius vartotojo sąsajos sprendimus, kurie padeda jūsų verslui augti internete. Portfolio – daugiau nei 50 projektų.",
    headline: "UI/UX dizainas ir svetainių kūrimas",
    services:
      "• UI/UX dizainas (Figma)\n• Landing page kūrimas\n• WordPress svetainės\n• Logotipų ir firminio stiliaus kūrimas",
    location: "Vilnius",
    phone: "+37061000007",
    priceFrom: 40,
    experienceYears: 5,
    offersInvoices: true,
    availableForUrgent: false,
    planType: "FREE",
    website: "https://lukasstudio.lt",
    images: [
      "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=90",
      "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&q=90",
      "https://images.unsplash.com/photo-1545235617-9465d2a55698?w=800&q=90",
    ],
    coverImage: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&q=90",
  },
  {
    email: "demo-dovile@test.lt",
    name: "Dovilė Kučinskienė (TEST)",
    category: "it",
    specializations: ["it"],
    description:
      "Duomenų analitikė ir verslo automatizavimo specialistė. Padedu įmonėms priimti geresnius sprendimus remiantis duomenimis. Automatizuoju pasikartojančius procesus su Python, Power BI ir Excel VBA.",
    headline: "Duomenų analizė ir procesų automatizavimas",
    services:
      "• Power BI ataskaitų kūrimas\n• Excel automatizavimas (VBA)\n• Python duomenų analizė\n• CRM sistemų diegimas",
    location: "Klaipėda",
    phone: "+37061000008",
    priceFrom: 55,
    experienceYears: 4,
    offersInvoices: true,
    availableForUrgent: false,
    planType: "BASIC",
    website: null,
    images: [
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=90",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=90",
    ],
    coverImage: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=90",
  },

  // ── GROŽIS / VALYMAS (4) ────────────────────────────────────────
  {
    email: "demo-inga@test.lt",
    name: "Inga Mikalauskienė (DEMO)",
    category: "valymas",
    specializations: ["valymas"],
    description:
      "Profesionalios valymo paslaugos Vilniuje ir Vilniaus rajone. Valome butus, namus, biurus ir komercinės paskirties patalpas. Naudojame tik ekologiškas ir hipoalergines valymo priemones. Turime visą profesionalią įrangą – garų valytuvas, siurblį-plovėją, ozonatorių.",
    headline: "Ekologiškas profesionalus valymas",
    services:
      "• Generalinis valymas po remonto\n• Reguliarus biurų valymas\n• Langų valymas\n• Baldų ir kilimų giluminis valymas\n• Dezinfekcija ozonu",
    location: "Vilnius",
    phone: "+37061000009",
    priceFrom: 20,
    experienceYears: 9,
    offersInvoices: true,
    availableForUrgent: true,
    planType: "PRO",
    website: null,
    images: [
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=90",
      "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=800&q=90",
      "https://images.unsplash.com/photo-1527515637462-cee1395c108c?w=800&q=90",
      "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800&q=90",
    ],
    coverImage: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=90",
  },
  {
    email: "demo-vytautas@test.lt",
    name: "Vytautas Mockus (TEST)",
    category: "valymas",
    specializations: ["valymas"],
    description:
      "Teikiame valymo paslaugas Kauno mieste ir rajone. Specializuojamės poremontiniame valyme ir komercinių patalpų priežiūroje. Komanda iš 4 žmonių – galime sutvarkyti didelius plotus per vieną dieną.",
    headline: "Greitas ir kokybiškas valymas Kaune",
    services:
      "• Poremontinis valymas\n• Kasdienis biurų valymas\n• Fasadų plovimas\n• Teritorijų tvarkymas",
    location: "Kaunas",
    phone: "+37061000010",
    priceFrom: 15,
    experienceYears: 6,
    offersInvoices: true,
    availableForUrgent: true,
    planType: "FREE",
    website: null,
    images: [
      "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800&q=90",
      "https://images.unsplash.com/photo-1585421514284-efb74c2b69ba?w=800&q=90",
    ],
    coverImage: "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=1200&q=90",
  },
  {
    email: "demo-egle@test.lt",
    name: "Eglė Žukauskaitė (DEMO)",
    category: "valymas",
    specializations: ["valymas"],
    description:
      "Individuali valymo paslaugų teikėja. Specializuojuosi privačių namų ir butų valyme. Atkreipiu dėmesį į smulkmenas – kiekvienas kampas bus švarus. Dirbu su savo priemonėmis, lanksti grafikui.",
    headline: "Kruopštus namų valymas",
    services:
      "• Namų ir butų valymas\n• Virtuvės giluminis valymas\n• Vonios kambarių valymas\n• Skalbimas ir lyginimas",
    location: "Šiauliai",
    phone: "+37061000011",
    priceFrom: 12,
    experienceYears: 3,
    offersInvoices: false,
    availableForUrgent: true,
    planType: "FREE",
    website: null,
    images: [
      "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=800&q=90",
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&q=90",
      "https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=800&q=90",
    ],
    coverImage: "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=1200&q=90",
  },
  {
    email: "demo-robertas@test.lt",
    name: "Robertas Grigas (DEMO)",
    category: "valymas",
    specializations: ["valymas", "transportas"],
    description:
      "Profesionalus valymas ir šiukšlių išvežimas Panevėžyje. Tvarkome butus po nuomininkų, atliekame generalinį valymą, išvežame senus baldus ir statybines atliekas.",
    headline: "Valymas ir šiukšlių išvežimas",
    services:
      "• Generalinis valymas\n• Senų baldų išvežimas\n• Statybinių atliekų tvarkymas\n• Buto paruošimas nuomai",
    location: "Panevėžys",
    phone: "+37061000012",
    priceFrom: 18,
    experienceYears: 5,
    offersInvoices: true,
    availableForUrgent: true,
    planType: "BASIC",
    website: null,
    images: [
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=90",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=90",
    ],
    coverImage: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=90",
  },

  // ── STATYBA (4) ──────────────────────────────────────────────────
  {
    email: "demo-mindaugas@test.lt",
    name: "Mindaugas Balčiūnas (DEMO)",
    category: "statyba",
    specializations: ["statyba", "elektra"],
    description:
      "Statybos ir remonto darbų meistras su 20 metų patirtimi. Atliekame pilną vidaus apdailą – nuo grindų iki lubų. Dirbame su plytėlėmis, gipskartonu, dažymu, tapetavimu. Didelė patirtis renovuojant senos statybos butus Vilniaus senamiestyje.",
    headline: "Vidaus apdailos ir remonto ekspertas",
    services:
      "• Pilna vidaus apdaila\n• Plytelių klojimas\n• Gipskartonio montavimas\n• Dažymo ir tapetavimo darbai\n• Grindų klojimas (laminatas, parketas)\n• Durų ir langų montavimas",
    location: "Vilnius",
    phone: "+37061000013",
    priceFrom: 30,
    experienceYears: 20,
    offersInvoices: true,
    availableForUrgent: false,
    planType: "PRO",
    website: null,
    images: [
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=90",
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=90",
      "https://images.unsplash.com/photo-1541123603104-512919d6a96c?w=800&q=90",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=90",
      "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=800&q=90",
    ],
    coverImage: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=90",
  },
  {
    email: "demo-aurimas@test.lt",
    name: "Aurimas Kvedaras (TEST)",
    category: "statyba",
    specializations: ["statyba"],
    description:
      "Stogų dengimo ir fasadų šiltinimo specialistas. Dirbame su visų tipų stogais – šlaitiniais, plokščiais, žaliais. Naudojame tik sertifikuotas medžiagas su gamintojo garantija.",
    headline: "Stogų dengimas ir fasadų šiltinimas",
    services:
      "• Stogų dengimas (čerpės, skarda, bituminė danga)\n• Fasadų šiltinimas\n• Lietaus nuvedimo sistemos\n• Stogo remonto darbai",
    location: "Kaunas",
    phone: "+37061000014",
    priceFrom: 45,
    experienceYears: 14,
    offersInvoices: true,
    availableForUrgent: false,
    planType: "BASIC",
    website: "https://kvedaras-stogai.lt",
    images: [
      "https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=800&q=90",
      "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=90",
      "https://images.unsplash.com/photo-1621155346337-1d19476ba7d6?w=800&q=90",
    ],
    coverImage: "https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=1200&q=90",
  },
  {
    email: "demo-viktorija@test.lt",
    name: "Viktorija Navickienė (DEMO)",
    category: "statyba",
    specializations: ["statyba", "dizainas"],
    description:
      "Interjero dizainerė ir statybos projektu vadovė. Kuriu funkcionalius ir estetiškus interjerus, koordinuoju visus remonto darbus nuo projekto iki raktų atidavimo. Darbai atliekami kokybiškai ir laiku.",
    headline: "Interjero dizainas ir remonto valdymas",
    services:
      "• Interjero dizaino projektai\n• Remonto darbų koordinavimas\n• 3D vizualizacijos\n• Medžiagų parinkimas\n• Baldų projektavimas",
    location: "Vilnius",
    phone: "+37061000015",
    priceFrom: 80,
    experienceYears: 11,
    offersInvoices: true,
    availableForUrgent: false,
    planType: "PRO",
    website: "https://navickiene-interjeras.lt",
    images: [
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&q=90",
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=90",
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=90",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=90",
    ],
    coverImage: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=90",
  },
  {
    email: "demo-karolis@test.lt",
    name: "Karolis Šimkus (TEST)",
    category: "statyba",
    specializations: ["statyba"],
    description:
      "Betonuotojas ir pamatų specialistas. Atliekame visus betono darbus – pamatus, perdangas, laiptus, takus. Turime savo klojinių komplektus ir vibracines plokštes. Dirbame visoje Lietuvoje.",
    headline: "Betono darbai ir pamatų įrengimas",
    services:
      "• Pamatų betonavimas\n• Perdangų liejimas\n• Betono takų ir aikštelių įrengimas\n• Tvorų pamatai\n• Laiptų betonavimas",
    location: "Šiauliai",
    phone: "+37061000016",
    priceFrom: 35,
    experienceYears: 16,
    offersInvoices: true,
    availableForUrgent: false,
    planType: "FREE",
    website: null,
    images: [
      "https://images.unsplash.com/photo-1590644365607-1c5a6636bc67?w=800&q=90",
      "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800&q=90",
    ],
    coverImage: "https://images.unsplash.com/photo-1590644365607-1c5a6636bc67?w=1200&q=90",
  },

  // ── KITOS KATEGORIJOS (4) ───────────────────────────────────────
  {
    email: "demo-justina@test.lt",
    name: "Justina Bieliauskaitė (DEMO)",
    category: "dizainas",
    specializations: ["dizainas"],
    description:
      "Grafikos dizainerė ir prekės ženklo strategė. Kuriu vizualinį identitetą, kuris padeda jūsų verslui išsiskirti. Nuo logotipo iki pilno firminio stiliaus – viską atlieku profesionaliai ir kūrybiškai.",
    headline: "Prekės ženklo kūrimas ir grafikos dizainas",
    services:
      "• Logotipų kūrimas\n• Firminio stiliaus knyga\n• Socialinių tinklų vizualai\n• Pakuočių dizainas\n• Reklaminė medžiaga",
    location: "Vilnius",
    phone: "+37061000017",
    priceFrom: 50,
    experienceYears: 8,
    offersInvoices: true,
    availableForUrgent: false,
    planType: "BASIC",
    website: "https://justinab-design.lt",
    images: [
      "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&q=90",
      "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800&q=90",
      "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=90",
    ],
    coverImage: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=1200&q=90",
  },
  {
    email: "demo-mantas@test.lt",
    name: "Mantas Žilinskas (DEMO)",
    category: "transportas",
    specializations: ["transportas"],
    description:
      "Perkraustymo ir transporto paslaugos Vilniuje bei tarpmiestiniais maršrutais. Turime skirtingų dydžių furgonus, profesionalius krovėjus ir visą reikalingą pakavimo medžiagą. Perkraustome butus, biurus, pianos.",
    headline: "Profesionalus perkraustymas ir krovinių gabenimas",
    services:
      "• Butų ir namų perkraustymas\n• Biurų perkraustymas\n• Baldų pervežimas\n• Pianinų ir sunkių daiktų gabenimas\n• Pakavimo paslaugos",
    location: "Vilnius",
    phone: "+37061000018",
    priceFrom: 25,
    experienceYears: 7,
    offersInvoices: true,
    availableForUrgent: true,
    planType: "PRO",
    website: null,
    images: [
      "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=800&q=90",
      "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=90",
      "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=90",
    ],
    coverImage: "https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=1200&q=90",
  },
  {
    email: "demo-gabija@test.lt",
    name: "Gabija Stonkutė (TEST)",
    category: "sodas",
    specializations: ["sodas"],
    description:
      "Kraštovaizdžio architektė ir sodo priežiūros specialistė. Projektuoju ir įgyvendinu sodų, terasų ir viešųjų erdvių apželdinimą. Konsultuoju dėl augalų parinkimo pagal vietos sąlygas ir klimatą.",
    headline: "Kraštovaizdžio projektavimas ir sodo priežiūra",
    services:
      "• Kraštovaizdžio projektavimas\n• Vejos įrengimas ir priežiūra\n• Gyvatvorių sodinimas ir karpymas\n• Laistymo sistemų montavimas\n• Sezoninis sodo tvarkymas",
    location: "Kaunas",
    phone: "+37061000019",
    priceFrom: 30,
    experienceYears: 9,
    offersInvoices: true,
    availableForUrgent: false,
    planType: "BASIC",
    website: "https://gabija-sodai.lt",
    images: [
      "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=800&q=90",
      "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&q=90",
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=90",
      "https://images.unsplash.com/photo-1599629954294-5f939e723e2c?w=800&q=90",
    ],
    coverImage: "https://images.unsplash.com/photo-1558904541-efa843a96f01?w=1200&q=90",
  },
  {
    email: "demo-aivaras@test.lt",
    name: "Aivaras Gudaitis (DEMO)",
    category: "elektra",
    specializations: ["elektra", "statyba"],
    description:
      "Elektrikas su A kategorijos kvalifikacija. Atliekame elektros instaliaciją naujuose ir renovuojamuose pastatuose, montuojame apšvietimo sistemas, elektros skydus, saulės elektrines. Garantija visiems darbams – 3 metai.",
    headline: "Elektros instaliacijos ir saulės elektrinės",
    services:
      "• Elektros instaliacijos darbai\n• Apšvietimo sistemų montavimas\n• Elektros skydų montavimas\n• Saulės elektrinių montavimas\n• Žaibosaugos sistemos",
    location: "Vilnius",
    phone: "+37061000020",
    priceFrom: 40,
    experienceYears: 13,
    offersInvoices: true,
    availableForUrgent: true,
    planType: "PRO",
    website: null,
    images: [
      "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=90",
      "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&q=90",
      "https://images.unsplash.com/photo-1558449028-b53a39d100fc?w=800&q=90",
      "https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=800&q=90",
    ],
    coverImage: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1200&q=90",
  },
];

// ─── Review templates per category ─────────────────────────────────
const REVIEW_TEMPLATES: Record<string, string[]> = {
  santechnika: [
    "Puikus meistras! Atvyko laiku, viską sutvarkė greitai ir švariai. Labai rekomenduoju.",
    "Profesionalus darbas, patarė dėl medžiagų ir pasiūlė ekonomiškesnį sprendimą. Ačiū!",
    "Labai patenkintas darbu. Čiaupas pakeistas per valandą, viskas veikia puikiai.",
    "Gerai atliktas darbas, bet teko palaukti ilgiau nei buvo susitarta.",
    "Kokybiškai ir tvarkingai atlikti visi santechnikos darbai vonios kambaryje.",
  ],
  it: [
    "Svetainė sukurta profesionaliai ir laiku. Labai patiko dizainas ir funkcionalumas.",
    "Puikus specialistas, padėjo sutvarkyti visą IT infrastruktūrą biurui. Viskas veikia sklandžiai.",
    "Greitas ir kokybiškas darbas. Svetainė atrodo moderniai ir veikia greitai.",
    "Labai kompetentingas programuotojas, suprato poreikius iš pirmo karto.",
    "Rekomenduoju! Padarė daugiau nei tikėjausi, dar ir SEO sutvarkyto.",
  ],
  valymas: [
    "Butas švyti kaip naujas! Labai kruopštus ir atidus darbui žmogus.",
    "Puikus valymas po remonto. Nereikėjo nieko pertvarkyti, viskas idealiai.",
    "Reguliariai naudojamės paslaugomis jau pusę metų – visada puiki kokybė.",
    "Labai maloni ir darbšti. Atkreipia dėmesį į detales, kurias kiti praleidžia.",
    "Biuras visada švarus ir tvarkingas. Ačiū už patikimą paslaugą!",
  ],
  statyba: [
    "Remontą atliko kokybiškai ir greičiau nei tikėjomės. Labai profesionali komanda.",
    "Puikus plytelių klojimo meistras. Vonios kambarys atrodo kaip iš žurnalo.",
    "Atlikto labai tvarkingai, viskas pagal projektą. Rekomenduoju be jokių abejonių.",
    "Geras specialistas, bet kaina šiek tiek aukštesnė nei rinkos vidurkis.",
    "Fasado šiltinimas atliktas puikiai, šildymo sąskaitos sumažėjo 40%!",
  ],
  dizainas: [
    "Logotipas ir firminis stilius – tiksliai tai, ko norėjome. Kūrybiškas ir profesionalus požiūris.",
    "Puikus dizaineris! Suprato mūsų viziją ir sukūrė dar geriau nei įsivaizdavome.",
  ],
  transportas: [
    "Perkraustymas praėjo sklandžiai, nieko nesugadino, labai mandagūs vaikinai.",
    "Greitai ir profesionaliai perkraustė 3 kambarių butą. Rekomenduoju visiems!",
  ],
  sodas: [
    "Sodas atrodo nuostabiai po sutvarkymo. Profesionaliai apkarpytos gyvatvorės ir tvarkinga veja.",
    "Kraštovaizdžio projektas viršijo lūkesčius – kaimynai pavydi! Ačiū Gabijai.",
  ],
  elektra: [
    "Profesionaliai sumontuota elektros instaliacija naujame name. Viskas pagal normas.",
    "Apšvietimo sistema biure – tiksliai pagal mūsų poreikius. Puikus darbas!",
    "Saulės elektrinė sumontuota greitai ir kokybiškai. Jau matome rezultatus sąskaitose.",
  ],
};

// ─── Main seed function ────────────────────────────────────────────
async function main() {
  console.log("🌱 Seeding database...\n");

  // ── Admin user ──
  const adminPassword = await bcrypt.hash("Admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@platform.lt" },
    update: {},
    create: {
      email: "admin@platform.lt",
      name: "Administratorius",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("✓ Admin:", admin.email);

  // ── Original 3 providers (preserved) ──
  const providerPassword = await bcrypt.hash("Provider123!", 12);
  await Promise.all([
    prisma.user.upsert({
      where: { email: "jonas@example.lt" },
      update: {},
      create: {
        email: "jonas@example.lt",
        name: "Jonas Jonaitis",
        password: providerPassword,
        role: "PROVIDER",
        providerProfile: {
          create: {
            description:
              "Patyręs santechnikas su 15 metų patirtimi. Atlieku visus santechnikos darbus kokybiškai ir greitai.",
            specializations: ["santechnika", "statyba"],
            location: "Vilnius",
            phone: "+37061234567",
            isActive: true,
            planType: "PRO",
            images: [],
          },
        },
      },
    }),
    prisma.user.upsert({
      where: { email: "petras@example.lt" },
      update: {},
      create: {
        email: "petras@example.lt",
        name: "Petras Petraitis",
        password: providerPassword,
        role: "PROVIDER",
        providerProfile: {
          create: {
            description:
              "Elektros darbų meistras. Atliekame elektros instaliacijos, remonto ir priežiūros darbus.",
            specializations: ["elektra", "statyba"],
            location: "Kaunas",
            phone: "+37062345678",
            isActive: true,
            planType: "BASIC",
            images: [],
          },
        },
      },
    }),
    prisma.user.upsert({
      where: { email: "ona@example.lt" },
      update: {},
      create: {
        email: "ona@example.lt",
        name: "Ona Onaitė",
        password: providerPassword,
        role: "PROVIDER",
        providerProfile: {
          create: {
            description:
              "Profesionalios valymo paslaugos namams ir biurams. Naudojame ekologiškas priemones.",
            specializations: ["valymas"],
            location: "Klaipėda",
            phone: "+37063456789",
            isActive: true,
            planType: "FREE",
            images: [],
          },
        },
      },
    }),
  ]);
  console.log("✓ Original providers: 3");

  // ── 20 DEMO providers ──
  const demoPassword = await bcrypt.hash(DEMO_PASSWORD, 12);
  const demoUsers: Array<{ id: string; category: string; name: string }> = [];

  for (const p of DEMO_PROVIDERS) {
    const imagesArr: string[] = p.images;

    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {
        name: p.name,
        password: demoPassword,
        emailVerified: new Date(),
        image: p.coverImage,
      },
      create: {
        email: p.email,
        name: p.name,
        password: demoPassword,
        role: "PROVIDER",
        emailVerified: new Date(),
        image: p.coverImage,
        providerProfile: {
          create: {
            description: p.description,
            headline: p.headline,
            services: p.services,
            specializations: p.specializations,
            location: p.location,
            phone: p.phone,
            priceFrom: p.priceFrom,
            experienceYears: p.experienceYears,
            offersInvoices: p.offersInvoices,
            availableForUrgent: p.availableForUrgent,
            planType: p.planType,
            website: p.website,
            isActive: true,
            images: imagesArr,
          },
        },
      },
    });

    // Ensure profile exists on update path too
    await prisma.providerProfile.upsert({
      where: { userId: user.id },
      update: {
        description: p.description,
        headline: p.headline,
        services: p.services,
        specializations: p.specializations,
        location: p.location,
        phone: p.phone,
        priceFrom: p.priceFrom,
        experienceYears: p.experienceYears,
        offersInvoices: p.offersInvoices,
        availableForUrgent: p.availableForUrgent,
        planType: p.planType,
        website: p.website,
        isActive: true,
        images: imagesArr,
      },
      create: {
        userId: user.id,
        description: p.description,
        headline: p.headline,
        services: p.services,
        specializations: p.specializations,
        location: p.location,
        phone: p.phone,
        priceFrom: p.priceFrom,
        experienceYears: p.experienceYears,
        offersInvoices: p.offersInvoices,
        availableForUrgent: p.availableForUrgent,
        planType: p.planType,
        website: p.website,
        isActive: true,
        images: imagesArr,
      },
    });

    demoUsers.push({ id: user.id, category: p.category, name: p.name });
    console.log(`  ✓ ${p.name} (${p.category}, ${p.planType})`);
  }
  console.log(`✓ Demo providers: ${demoUsers.length}\n`);

  // ── Service requests ──
  const requests = await Promise.all([
    upsertRequest("Reikia sutaisyti vandens čiaupą", {
      description:
        "Virtuvėje laša čiaupas, reikia pakeisti arba sutaisyti. Namas yra centre.",
      category: "santechnika",
      location: "Vilnius",
      budget: "iki-100",
      clientEmail: "klientas1@example.lt",
      clientName: "Marius",
    }),
    upsertRequest("Elektros instaliacijos darbai naujame bute", {
      description:
        "Naujas butas, reikia pilnos elektros instaliacijos. 3 kambariai, virtuvė, vonios kambarys.",
      category: "elektra",
      location: "Kaunas",
      budget: "1000-5000",
      clientEmail: "klientas2@example.lt",
      clientName: "Giedrė",
    }),
    upsertRequest("Biuro valymas kas savaitę", {
      description:
        "Ieškome valymo paslaugų teikėjo biurui (~100 kv.m.). Valymas reikalingas kartą per savaitę.",
      category: "valymas",
      location: "Klaipėda",
      budget: "100-500",
      clientEmail: "klientas3@example.lt",
      clientName: "UAB Saulė",
    }),
    upsertRequest("Sodo tvarkymas ir gyvatvorės karpymas", {
      description:
        "Reikia sutvarkyti 10 arų sodą: nupjauti žolę, apkarpyti gyvatvores, surinkti lapus.",
      category: "sodas",
      location: "Šiauliai",
      budget: "100-500",
      clientEmail: "klientas4@example.lt",
      clientName: "Antanas",
    }),
    upsertRequest("Svetainės sukūrimas mažam verslui", {
      description:
        "Reikia sukurti modernią svetainę su kontaktų forma ir paslaugų aprašymais. Turime logotipą.",
      category: "it",
      location: "Visa Lietuva",
      budget: "500-1000",
      clientEmail: "klientas5@example.lt",
      clientName: "Indrė",
    }),
    // Extra requests for demo reviews
    upsertRequest("Vonios kambario remontas", {
      description: "Pilnas vonios kambario remontas: plytelės, santechnika, apšvietimas.",
      category: "santechnika",
      location: "Vilnius",
      budget: "1000-5000",
      clientEmail: "demo-klientas1@example.lt",
      clientName: "Agnė (DEMO)",
    }),
    upsertRequest("Svetainės atnaujinimas", {
      description: "Turime seną WordPress svetainę, norime atnaujinti dizainą ir greičio optimizaciją.",
      category: "it",
      location: "Kaunas",
      budget: "500-1000",
      clientEmail: "demo-klientas2@example.lt",
      clientName: "Domas (DEMO)",
    }),
    upsertRequest("Biuro generalinis valymas", {
      description: "300 kv.m. biuro generalinis valymas prieš persikraustymą.",
      category: "valymas",
      location: "Vilnius",
      budget: "100-500",
      clientEmail: "demo-klientas3@example.lt",
      clientName: "Simona (DEMO)",
    }),
    upsertRequest("Buto remontas naujai pirktame bute", {
      description: "Pilnas 60 kv.m. buto remontas – grindys, sienos, lubos, elektra.",
      category: "statyba",
      location: "Vilnius",
      budget: "virs-5000",
      clientEmail: "demo-klientas4@example.lt",
      clientName: "Paulius (DEMO)",
    }),
    upsertRequest("Perkraustymas iš Vilniaus į Kauną", {
      description: "3 kambarių buto perkraustymas. Yra pianinas ir didelė spinta.",
      category: "transportas",
      location: "Vilnius",
      budget: "100-500",
      clientEmail: "demo-klientas5@example.lt",
      clientName: "Laura (DEMO)",
    }),
  ]);
  console.log(`✓ Service requests: ${requests.length}`);

  // ── Responses + Reviews for demo providers ──
  let reviewCount = 0;

  for (const demoUser of demoUsers) {
    const templates = REVIEW_TEMPLATES[demoUser.category] || REVIEW_TEMPLATES["statyba"];
    // Find matching requests for this category
    const matchingRequests = requests.filter(
      (r) => r.category === demoUser.category
    );
    if (matchingRequests.length === 0) continue;

    // Create 2-4 reviews per provider
    const reviewsToCreate = Math.min(templates.length, 2 + Math.floor(Math.random() * 3));

    for (let i = 0; i < reviewsToCreate; i++) {
      const request = matchingRequests[i % matchingRequests.length];
      const rating = [3, 4, 4, 5, 5, 5][Math.floor(Math.random() * 6)]; // weighted toward 4-5

      // Create a response first (required for review)
      const responseKey = `demo-resp-${demoUser.id}-${request.id}-${i}`;
      const response = await prisma.response.upsert({
        where: { id: responseKey },
        update: {},
        create: {
          id: responseKey,
          requestId: request.id,
          providerId: demoUser.id,
          message: `Sveiki! Galiu atlikti šį darbą. Kaina nuo ${DEMO_PROVIDERS.find((p) => p.email === `demo-${demoUser.name.split(" ")[0].toLowerCase()}@test.lt`)?.priceFrom || 30} €.`,
          price: (rating * 15 + Math.floor(Math.random() * 50)),
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000),
        },
      });

      // Create review
      const reviewKey = `demo-rev-${demoUser.id}-${request.id}-${i}`;
      try {
        await prisma.review.upsert({
          where: {
            requestId_responseId: {
              requestId: request.id,
              responseId: response.id,
            },
          },
          update: {
            rating,
            comment: templates[i % templates.length],
          },
          create: {
            id: reviewKey,
            rating,
            comment: templates[i % templates.length],
            providerId: demoUser.id,
            requestId: request.id,
            responseId: response.id,
            createdAt: new Date(Date.now() - Math.floor(Math.random() * 60) * 24 * 60 * 60 * 1000),
          },
        });
        reviewCount++;
      } catch {
        // Unique constraint — skip duplicate
      }
    }
  }
  console.log(`✓ Reviews: ${reviewCount}`);

  console.log("\n✅ Seed complete!");
  console.log(`\n📋 Demo login credentials:`);
  console.log(`   Password for all DEMO/TEST providers: ${DEMO_PASSWORD}`);
  console.log(`   Example: demo-tomas@test.lt / ${DEMO_PASSWORD}`);
  console.log(`   Admin: admin@platform.lt / Admin123!\n`);
}

// ─── Helpers ───────────────────────────────────────────────────────

async function upsertRequest(
  title: string,
  data: {
    description: string;
    category: string;
    location: string;
    budget: string;
    clientEmail: string;
    clientName: string;
  }
) {
  const existing = await prisma.serviceRequest.findFirst({
    where: { title, clientEmail: data.clientEmail },
  });

  if (existing) return existing;

  return prisma.serviceRequest.create({
    data: {
      title,
      ...data,
      status: "OPEN",
      trackingToken: crypto.randomBytes(32).toString("hex"),
    },
  });
}

// ─── Run ───────────────────────────────────────────────────────────

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
