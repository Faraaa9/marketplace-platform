import { Layers, Square, Ruler, Droplet, Gauge, Truck } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/grindu-betonavimas-vilniuje",
  city: "Vilnius",
  categorySlug: "pr-statybos-apdaila--betonavimo-darbai-betonavimas",
  serviceType: "Grindų betonavimo paslaugos",
  seoTitle: "Grindų betonavimas Vilniuje — gaukite pasiūlymus",
  seoDescription:
    "Reikia išbetonuoti grindis Vilniuje? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų meistrų. Buto, garažo, pramoninių grindų betonavimas ir lyginimas.",
  heroBadge: "Betonavimo darbai Vilniuje",
  heroBadgeIcon: Square,
  h1: "Grindų betonavimas Vilniuje — lygios ir tvirtos grindys",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Vilniaus betonuotojų. Butų, garažų ar pramoninių grindų betonavimas su armavimu ir lyginimu — palyginkite kainas ir pasirinkite geriausią.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780140101/landing/grindu-betonavimas-vilniuje/ledbkvsejcyg29hxt5hs.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780140131/landing/grindu-betonavimas-vilniuje/ptthqdkxrpvet9eame1y.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780140152/landing/grindu-betonavimas-vilniuje/tmtb63su2gj0nokuta48.jpg",
  },
  imageAlts: {
    hero: "Darbininkai pila betoną iš siurblio žarnos ant armuotų grindų Vilniuje",
    work: "Grėblys skleidžia šviežią betoną ant armatūros tinklo",
    consult: "Meistras su brėžiniais aptaria grindų betonavimą statybvietėje",
  },
  servicesHeading: "Kokius betonavimo darbus galite užsakyti",
  servicesLead: "Vilniaus betonuotojai platformoje betonuoja grindis butuose, namuose ir komercinėse patalpose.",
  services: [
    { icon: Square, title: "Buto ir namo grindys", text: "Grindų betonavimas naujos statybos ir renovuojamuose būstuose." },
    { icon: Truck, title: "Garažo grindys", text: "Atsparios apkrovai garažo ir ūkinių pastatų grindys." },
    { icon: Gauge, title: "Pramoninės grindys", text: "Sandėlių, cechų grindys su kietikliais ir dilimui atsparia danga." },
    { icon: Ruler, title: "Grindų lyginimas", text: "Savaime išsilyginantys mišiniai prieš laminatą ar plyteles." },
    { icon: Layers, title: "Šildomos grindys", text: "Betonavimas virš grindinio šildymo vamzdynų." },
    { icon: Droplet, title: "Hidroizoliacija", text: "Pagrindo paruošimas ir drėgmės izoliacija prieš betonavimą." },
  ],
  pricingHeading: "Kiek kainuoja grindų betonavimas Vilniuje",
  offerPrice: "8",
  pricing: [
    { job: "Grindų betonavimas (m²)", price: "nuo 10 €" },
    { job: "Su armavimu ir lyginimu (m²)", price: "nuo 15 €" },
    { job: "Garažo grindys (m²)", price: "nuo 12 €" },
    { job: "Savaime išsilyginantis mišinys (m²)", price: "nuo 8 €" },
    { job: "Pramoninės grindys (m²)", price: "nuo 18 €" },
    { job: "Pagrindo paruošimas (m²)", price: "nuo 5 €" },
  ],
  insights: {
    heading: "Ką svarbu žinoti prieš betonuojant grindis",
    items: [
      { title: "Sluoksnio storis ir armavimas", text: "Buitinėms grindims dažnai pakanka 5–8 cm su armavimo tinklu, garažui ar pramonei reikia storesnio ir tvirtesnio sluoksnio. Storis tiesiogiai veikia kainą ir tvirtumą." },
      { title: "Betonas turi sukietėti", text: "Betonas pasiekia darbinį stiprumą per ~28 dienas, o vaikščioti galima po kelių parų. Neskubėkite kloti dangos — per anksti uždengtas betonas gali deformuotis." },
      { title: "Lyginimo lygis pagal dangą", text: "Po laminatu reikia labai lygaus paviršiaus (dažnai su savaime išsilyginančiu mišiniu), o po plytelėmis tolerancijos didesnės. Pasakykite, kokią dangą klosite." },
      { title: "Šildomos grindys — atskiras niuansas", text: "Jei po betonu yra šildymo vamzdynai, svarbus teisingas mišinys ir laipsniškas pirmasis pašildymas. Paklauskite, ar meistras turi patirties su grindiniu šildymu." },
    ],
  },
  faq: [
    {
      q: "Kiek kainuoja grindų betonavimas Vilniuje?",
      a: "Kaina už m²: paprastas betonavimas — nuo ~10 €/m², su armavimu ir lyginimu — nuo 15 €/m², pramoninės grindys — nuo 18 €/m². Galutinę kainą lemia sluoksnio storis ir plotas. Tikslią sąmatą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Ar į kainą įeina medžiagos ir betonas?",
      a: "Priklauso nuo susitarimo — kartais pateikiama tik darbų kaina, o betoną ir armatūrą perka užsakovas. Geras pasiūlymas aiškiai nurodo, kas įskaičiuota.",
    },
    {
      q: "Po kiek laiko galima kloti grindų dangą?",
      a: "Vaikščioti galima po 2–3 parų, bet laminatą ar plyteles klijuoti rekomenduojama tik betonui pakankamai išdžiūvus (priklausomai nuo storio — kelios savaitės). Meistras patars dėl konkretaus termino.",
    },
    {
      q: "Ar galima betonuoti virš grindinio šildymo?",
      a: "Taip — naudojami tam pritaikyti mišiniai, kurie gerai praleidžia šilumą. Svarbu teisingas storis ir pirmas atsargus pašildymas. Paminėkite, kad turite grindinį šildymą.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu meistru.",
    },
  ],
  request: {
    title: "Reikalingas grindų betonavimas Vilniuje",
    description:
      "Ieškau patikimo betonuotojo Vilniuje. Reikia išbetonuoti grindis (pvz. bute, garaže ar name), su armavimu ir lyginimu. Prašau pateikti pasiūlymą su orientacine kaina už m² ir galimu darbų laiku.",
  },
  finalCtaTitle: "Reikia išbetonuoti grindis Vilniuje?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
