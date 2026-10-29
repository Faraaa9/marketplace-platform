import { Hammer, Square, Layers, Lightbulb, Ruler, Wrench } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/gipso-kartono-montavimas-kaune",
  city: "Kaunas",
  categorySlug: "pr-statybos-apdaila--vidaus-apdailos-darbai--gipso-kartono-montavimas",
  serviceType: "Gipso kartono montavimo paslaugos",
  seoTitle: "Gipso kartono montavimas Kaune — gaukite pasiūlymus",
  seoDescription:
    "Reikia sumontuoti gipso kartoną Kaune? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų meistrų. Pertvaros, lubos, palangės, nišos, garso izoliacija.",
  heroBadge: "Gipskartonio darbai Kaune",
  heroBadgeIcon: Square,
  h1: "Gipso kartono montavimas Kaune",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Kauno gipskartonio meistrų. Pertvaros, kabamosios lubos, nišos ar garso izoliacija — palyginkite kainas ir pasirinkite geriausią.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780126244/landing/gipso-kartono-montavimas-kaune/tflmyi9fvfehsyatbf04.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780126271/landing/gipso-kartono-montavimas-kaune/kmzh0rfudgzfdbdsacc5.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780126293/landing/gipso-kartono-montavimas-kaune/koovhhryobkg50gjibw2.jpg",
  },
  imageAlts: {
    hero: "Meistras montuoja gipso kartono plokštę ant metalinio karkaso Kaune",
    work: "Rankos sukuria savisriegį į gipskartonio plokštę",
    consult: "Gipskartonio meistras aptaria pertvarų planą su klientu",
  },
  servicesHeading: "Kokius gipskartonio darbus galite užsakyti",
  servicesLead: "Kauno meistrai platformoje montuoja pertvaras, lubas ir dekoratyvines konstrukcijas iš gipskartonio.",
  services: [
    { icon: Square, title: "Pertvaros", text: "Naujų sienų ir pertvarų įrengimas erdvei padalinti." },
    { icon: Layers, title: "Kabamosios lubos", text: "Vienpakopės ir daugiapakopės gipskartonio lubos." },
    { icon: Lightbulb, title: "Nišos ir apšvietimas", text: "Dekoratyvinės nišos, lentynos, paslėpto apšvietimo karnizai." },
    { icon: Ruler, title: "Palangės ir angokraščiai", text: "Langų ir durų angų apdaila gipskartoniu." },
    { icon: Wrench, title: "Garso ir šilumos izoliacija", text: "Sienų ir lubų izoliavimas su mineraline vata po plokštėmis." },
    { icon: Hammer, title: "Paruošimas dažymui", text: "Siūlių glaistymas, armavimas ir paviršiaus paruošimas apdailai." },
  ],
  pricingHeading: "Kiek kainuoja gipso kartono montavimas Kaune",
  pricing: [
    { job: "Pertvaros montavimas (m²)", price: "nuo 14 €" },
    { job: "Lubų apkalimas (m²)", price: "nuo 12 €" },
    { job: "Dviejų pakopų lubos (m²)", price: "nuo 25 €" },
    { job: "Nišos / lentynos įrengimas", price: "nuo 40 €" },
    { job: "Angokraščių apdaila (vnt.)", price: "nuo 20 €" },
    { job: "Siūlių glaistymas (m²)", price: "nuo 4 €" },
  ],
  insights: {
    heading: "Į ką atkreipti dėmesį renkantis gipskartonio meistrą",
    items: [
      { title: "Drėgnoms patalpoms — atsparios plokštės", text: "Vonioje ar virtuvėje turi būti naudojamas drėgmei atsparus (žalias) gipskartonis, o priešgaisriniams reikalavimams — ugniai atsparus (rožinis). Paklauskite, kokias plokštes meistras siūlo." },
      { title: "Karkaso žingsnis lemia tvirtumą", text: "Standartinis profilio žingsnis — 40–60 cm. Tankesnis karkasas reiškia tvirtesnę sieną, ant kurios galima kabinti spinteles ar televizorių." },
      { title: "Garso izoliacija — su vata", text: "Jei pertvara skiria miegamąjį, paprašykite užpildyti ertmę mineraline vata. Tuščia pertvara prastai sulaiko garsą." },
      { title: "Glaistymo lygis", text: "Apdailai dažymu reikia aukštesnio glaistymo lygio (Q3–Q4) nei po plytelėmis. Patikslinkite, koks lygis įskaičiuotas, kad siūlės nesimatytų." },
    ],
  },
  faq: [
    {
      q: "Kiek kainuoja gipso kartono montavimas Kaune?",
      a: "Kaina skaičiuojama už kvadratinį metrą: pertvara — nuo ~14 €/m², lubų apkalimas — nuo 12 €/m², daugiapakopės lubos — nuo 25 €/m². Galutinę kainą lemia konstrukcijos sudėtingumas ir izoliacija. Tikslią sąmatą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Ar į kainą įeina medžiagos?",
      a: "Dažniausiai pateikiama darbų kaina, o plokštes, profilius, glaistą ir vatą perka klientas pagal meistro sąrašą. Tai aiškiai nurodoma pasiūlyme.",
    },
    {
      q: "Ar galima kabinti daiktus ant gipskartonio sienos?",
      a: "Lengvus daiktus — su specialiais kaiščiais. Sunkesniems (spintelės, TV) reikia iš anksto numatyti tvirtinimo vietas karkase arba įmontuoti tvirtinimo plokštę. Pasakykite meistrui, ką planuojate kabinti.",
    },
    {
      q: "Kiek laiko trunka darbai?",
      a: "Vieną pertvarą sumontuoja per 1–2 dienas, didesnės lubos ar kelios konstrukcijos užtrunka ilgiau. Terminus meistras nurodo pasiūlyme.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu meistru.",
    },
  ],
  request: {
    title: "Reikalingas gipso kartono montavimas Kaune",
    description:
      "Ieškau patikimo gipskartonio meistro Kaune. Reikia sumontuoti gipso kartoną — pavyzdžiui, pertvarą, kabamąsias lubas ar nišą. Prašau pateikti pasiūlymą su orientacine kaina už m² ir galimu darbų laiku.",
  },
  finalCtaTitle: "Reikia gipskartonio darbų Kaune?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
