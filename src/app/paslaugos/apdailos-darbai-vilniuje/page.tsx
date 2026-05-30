import { PaintRoller, Brush, Grid3x3, Layers, Hammer, Ruler } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/apdailos-darbai-vilniuje",
  city: "Vilnius",
  categorySlug: "pr-statybos-apdaila--vidaus-apdailos-darbai",
  serviceType: "Vidaus apdailos paslaugos",
  seoTitle: "Apdailos darbai Vilniuje — gaukite pasiūlymus",
  seoDescription:
    "Reikia buto ar namo apdailos Vilniuje? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų apdailininkų. Glaistymas, dažymas, plytelės, grindys, gipskartonis.",
  heroBadge: "Vidaus apdaila Vilniuje",
  heroBadgeIcon: PaintRoller,
  h1: "Apdailos darbai Vilniuje — patikimi meistrai",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Vilniaus apdailininkų. Sienų glaistymas ir dažymas, plytelės, grindys ar pilna buto apdaila — palyginkite kainas ir pasirinkite geriausią.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780140306/landing/apdailos-darbai-vilniuje/x4btgk4ulbdeqqasi9qe.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780140327/landing/apdailos-darbai-vilniuje/xepa7gucecdgjy8nticf.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780140349/landing/apdailos-darbai-vilniuje/rtmo4ebhxpguxggb2qrh.jpg",
  },
  imageAlts: {
    hero: "Dažytojas voleliu dažo lubas šviesiame renovuotame Vilniaus bute",
    work: "Plati mentele lyginamas glaistas ant sienos kampo",
    consult: "Apdailininkas su planšete aptaria remonto planą su klientu",
  },
  servicesHeading: "Kokius apdailos darbus galite užsakyti",
  servicesLead: "Vilniaus apdailininkai platformoje atlieka tiek smulkius, tiek pilnos apdailos darbus.",
  services: [
    { icon: PaintRoller, title: "Glaistymas ir dažymas", text: "Sienų ir lubų glaistymas, gruntavimas, dažymas." },
    { icon: Grid3x3, title: "Plytelių klijavimas", text: "Vonios, virtuvės, koridoriaus plytelių klijavimas." },
    { icon: Layers, title: "Grindų klojimas", text: "Laminato, parketo, vinilo ar plytelių grindys." },
    { icon: Hammer, title: "Gipskartonio darbai", text: "Pertvaros, palangės, lubų konstrukcijos iš gipskartonio." },
    { icon: Brush, title: "Sienų tinkavimas", text: "Mašininis ir rankinis tinkavimas, dekoratyvinė apdaila." },
    { icon: Ruler, title: "Pilna buto apdaila", text: "Apdaila nuo sienų iki grindų pagal projektą." },
  ],
  pricingHeading: "Kiek kainuoja apdailos darbai Vilniuje",
  offerPrice: "4",
  pricing: [
    { job: "Sienų glaistymas (m²)", price: "nuo 6 €" },
    { job: "Sienų dažymas (m²)", price: "nuo 4 €" },
    { job: "Plytelių klijavimas (m²)", price: "nuo 18 €" },
    { job: "Laminato klojimas (m²)", price: "nuo 6 €" },
    { job: "Gipskartonio montavimas (m²)", price: "nuo 12 €" },
    { job: "Pilna kambario apdaila (m²)", price: "nuo 60 €" },
  ],
  insights: {
    heading: "Naudinga žinoti prieš pradedant apdailą",
    items: [
      { title: "Teisingas darbų eiliškumas", text: "Pradedama nuo „nešvarių“ darbų: tinkavimo, glaistymo, instaliacijų, tada plytelės, grindys ir dažymas. Sumaišius eiliškumą tenka perdaryti — patyręs meistras jį sudėlioja iš anksto." },
      { title: "Darbai ir medžiagos atskirai", text: "Dažniausiai pateikiama darbų kaina, o dažus, plyteles, glaistą perka klientas. Aiškus susitarimas, kas ką perka, padeda išvengti netikėtumų." },
      { title: "Paruošimas lemia rezultatą", text: "Gražus dažymas prasideda nuo gerai išglaistytų ir nugruntuotų sienų. Sutaupius ant paruošimo, matosi kiekvienas nelygumas." },
      { title: "Etapinis priėmimas", text: "Didesnėje apdailoje verta priimti darbus etapais (po tinkavimo, po glaistymo). Taip lengviau pastebėti broką laiku." },
    ],
  },
  faq: [
    {
      q: "Kiek kainuoja apdailos darbai Vilniuje?",
      a: "Kaina už m²: sienų glaistymas — nuo ~6 €/m², dažymas — nuo 4 €/m², plytelių klijavimas — nuo 18 €/m². Pilnos kambario apdailos kaina prasideda nuo ~60 €/m². Tikslią sąmatą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Kiek trunka buto apdaila?",
      a: "Vidutinio buto apdaila dažniausiai trunka nuo kelių savaičių iki poros mėnesių, priklausomai nuo ploto ir darbų apimties. Apdailininkas pateiks darbų eigą ir terminus pasiūlyme.",
    },
    {
      q: "Ar kaina su medžiagomis?",
      a: "Dažniausiai pateikiama darbų kaina, o medžiagas perka klientas arba meistras pagal susitarimą. Tai aiškiai aptariama pasiūlyme, kad nebūtų netikėtumų.",
    },
    {
      q: "Nuo ko pradėti apdailą?",
      a: "Paprastai pradedama nuo „nešvarių“ darbų: tinkavimo, glaistymo, instaliacijų, tada plytelės, grindys ir dažymas. Patyręs apdailininkas sudėlios teisingą darbų eiliškumą.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu meistru.",
    },
  ],
  request: {
    title: "Reikalingi apdailos darbai Vilniuje",
    description:
      "Ieškau patikimo apdailininko Vilniuje. Reikia atlikti vidaus apdailos darbus bute — pavyzdžiui, sienų glaistymas ir dažymas, plytelių klijavimas ar grindų klojimas. Prašau pateikti pasiūlymą su orientacine kaina ir galimu darbų laiku.",
  },
  finalCtaTitle: "Reikia apdailos darbų Vilniuje?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
