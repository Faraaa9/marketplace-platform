import { PaintRoller, Brush, Grid3x3, Layers, Hammer, Ruler } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/apdailos-darbai-kaune",
  city: "Kaunas",
  categorySlug: "pr-statybos-apdaila--vidaus-apdailos-darbai",
  serviceType: "Vidaus apdailos paslaugos",
  seoTitle: "Apdailos darbai Kaune — gaukite pasiūlymus iš meistrų",
  seoDescription:
    "Reikia buto ar namo apdailos Kaune? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų apdailininkų. Glaistymas, dažymas, plytelės, grindys, gipskartonis.",
  heroBadge: "Vidaus apdaila Kaune",
  heroBadgeIcon: PaintRoller,
  h1: "Apdailos darbai Kaune — patikimi meistrai",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Kauno apdailininkų. Sienų glaistymas ir dažymas, plytelės, grindys ar pilna buto apdaila — palyginkite kainas ir pasirinkite geriausią.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780121144/landing/apdailos-darbai-kaune/oh5yhepa98turtrwikeo.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780121172/landing/apdailos-darbai-kaune/gdwm1qyhx5clpfa5v3cx.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780121192/landing/apdailos-darbai-kaune/emp3xgahtaqwvzcgnkdx.jpg",
  },
  imageAlts: {
    hero: "Apdailininkas glaisto sieną renovuojamame bute Kaune",
    work: "Voleliu dažoma siena šviesia spalva",
    consult: "Apdailininkas su kliente renkasi apdailos medžiagas Kaune",
  },
  servicesHeading: "Kokius apdailos darbus galite užsakyti",
  servicesLead: "Kauno apdailininkai platformoje atlieka tiek smulkius, tiek pilnos apdailos darbus.",
  services: [
    { icon: PaintRoller, title: "Glaistymas ir dažymas", text: "Sienų ir lubų glaistymas, gruntavimas, dažymas." },
    { icon: Grid3x3, title: "Plytelių klijavimas", text: "Vonios, virtuvės, koridoriaus plytelių klijavimas." },
    { icon: Layers, title: "Grindų klojimas", text: "Laminato, parketo, vinilo ar plytelių grindys." },
    { icon: Hammer, title: "Gipskartonio darbai", text: "Pertvaros, palangės, lubų konstrukcijos iš gipskartonio." },
    { icon: Brush, title: "Sienų tinkavimas", text: "Mašininis ir rankinis tinkavimas, dekoratyvinė apdaila." },
    { icon: Ruler, title: "Pilna buto apdaila", text: "Apdaila nuo sienų iki grindų pagal projektą." },
  ],
  pricingHeading: "Kiek kainuoja apdailos darbai Kaune",
  offerPrice: "4",
  pricing: [
    { job: "Sienų glaistymas (m²)", price: "nuo 6 €" },
    { job: "Sienų dažymas (m²)", price: "nuo 4 €" },
    { job: "Plytelių klijavimas (m²)", price: "nuo 18 €" },
    { job: "Laminato klojimas (m²)", price: "nuo 6 €" },
    { job: "Gipskartonio montavimas (m²)", price: "nuo 12 €" },
    { job: "Pilna kambario apdaila (m²)", price: "nuo 60 €" },
  ],
  faq: [
    {
      q: "Kiek kainuoja apdailos darbai Kaune?",
      a: "Kaina skaičiuojama už kvadratinį metrą: sienų glaistymas — nuo ~6 €/m², dažymas — nuo 4 €/m², plytelių klijavimas — nuo 18 €/m². Pilnos kambario apdailos kaina prasideda nuo ~60 €/m². Tikslią sąmatą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Kiek trunka buto apdaila?",
      a: "Vidutinio buto apdaila dažniausiai trunka nuo kelių savaičių iki poros mėnesių, priklausomai nuo ploto ir darbų apimties. Apdailininkas pateiks darbų eigą ir terminus pasiūlyme.",
    },
    {
      q: "Ar kaina su medžiagomis?",
      a: "Dažniausiai pateikiama darbų kaina, o medžiagas (dažus, plyteles, glaistą) perka klientas arba meistras pagal susitarimą. Tai aiškiai aptariama pasiūlyme, kad nebūtų netikėtumų.",
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
    title: "Reikalingi apdailos darbai Kaune",
    description:
      "Ieškau patikimo apdailininko Kaune. Reikia atlikti vidaus apdailos darbus bute — pavyzdžiui, sienų glaistymas ir dažymas, plytelių klijavimas ar grindų klojimas. Prašau pateikti pasiūlymą su orientacine kaina ir galimu darbų laiku.",
  },
  finalCtaTitle: "Reikia apdailos darbų Kaune?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
