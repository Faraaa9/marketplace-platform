import { Layers, Ruler, Sparkles, Hammer, Scissors, Grid3x3 } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/parketo-klojimas-kaune",
  city: "Kaunas",
  categorySlug: "pr-statybos-apdaila--vidaus-apdailos-darbai",
  serviceType: "Parketo klojimo paslaugos",
  seoTitle: "Parketo klojimas Kaune — gaukite pasiūlymus ir kainas",
  seoDescription:
    "Reikia pakloti parketą Kaune? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų meistrų. Parketlentės, masyvo parketo klojimas, šlifavimas, lakavimas.",
  heroBadge: "Parketo klojimas Kaune",
  heroBadgeIcon: Layers,
  h1: "Parketo klojimas Kaune — šiltos medienos grindys",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Kauno parketo meistrų. Parketlentės, masyvo parketas, šlifavimas ir lakavimas — palyginkite kainas ir pasirinkite geriausią.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780158543/landing/parketo-klojimas-kaune/me5jovobjzc8a3ykhwfh.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780158561/landing/parketo-klojimas-kaune/zp117tt2d7wifxz4nwxx.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780158582/landing/parketo-klojimas-kaune/qw7cowgwju3ui8e7qulx.jpg",
  },
  imageAlts: {
    hero: "Meistras kloja natūralaus ąžuolo parketą elegantiškoje svetainėje Kaune",
    work: "Rankos tvirtai sujungia masyvo ąžuolo parketo blokelius",
    consult: "Parketo specialistas rodo medienos atspalvių pavyzdžius klientui",
  },
  servicesHeading: "Kokius parketo darbus galite užsakyti",
  servicesLead: "Kauno meistrai platformoje kloja, šlifuoja ir atnaujina parketą.",
  services: [
    { icon: Layers, title: "Parketlentės klojimas", text: "Trisluoksnės parketlentės klojimas plūduriuojančiu ar klijiniu būdu." },
    { icon: Grid3x3, title: "Masyvo parketas", text: "Masyvo parketo ir dailylenčių klojimas raštais (eglutė, blokai)." },
    { icon: Sparkles, title: "Šlifavimas ir lakavimas", text: "Seno parketo atnaujinimas — šlifavimas, alyvavimas ar lakavimas." },
    { icon: Ruler, title: "Pagrindo paruošimas", text: "Pagrindo lyginimas ir drėgmės patikra prieš klojimą." },
    { icon: Scissors, title: "Grindjuostės", text: "Grindjuosčių montavimas ir kampų apdaila." },
    { icon: Hammer, title: "Remontas", text: "Pažeistų lentelių keitimas, girgždesio šalinimas." },
  ],
  pricingHeading: "Kiek kainuoja parketo klojimas Kaune",
  pricing: [
    { job: "Parketlentės klojimas (m²)", price: "nuo 10 €" },
    { job: "Masyvo parketo klojimas (m²)", price: "nuo 18 €" },
    { job: "Klojimas raštu / eglute (m²)", price: "nuo 25 €" },
    { job: "Parketo šlifavimas ir lakavimas (m²)", price: "nuo 12 €" },
    { job: "Pagrindo lyginimas (m²)", price: "nuo 6 €" },
    { job: "Grindjuosčių montavimas (m)", price: "nuo 3 €" },
  ],
  insights: {
    heading: "Į ką atkreipti dėmesį klojant parketą",
    items: [
      { title: "Drėgmė — parketo priešas", text: "Mediena reaguoja į drėgmę, todėl prieš klojimą matuojamas pagrindo drėgnumas, o parketas aklimatizuojamas patalpoje. Skubėjimas baigiasi tarpais arba pūtimusi." },
      { title: "Klojimo būdas", text: "Parketlentė dažnai klojama plūduriuojančiu būdu, masyvas — klijuojamas prie pagrindo. Nuo to priklauso tvirtumas, garsas ir kaina. Aptarkite su meistru." },
      { title: "Šlifavimas grąžina gyvybę", text: "Senas parketas dažnai atrodo prastai tik dėl susidėvėjusio lako. Šlifavimas ir naujas dengimas atnaujina jį pigiau nei keitimas." },
      { title: "Lakas ar alyva", text: "Lakas atsparesnis ir lengviau prižiūrimas, alyva suteikia natūralesnį matinį vaizdą ir lengviau taisoma vietomis. Pasirinkimas — skonio ir naudojimo klausimas." },
    ],
  },
  faq: [
    {
      q: "Kiek kainuoja parketo klojimas Kaune?",
      a: "Parketlentės klojimas — nuo ~10 €/m², masyvo parketo — nuo 18 €/m², klojimas raštu (eglute) — nuo 25 €/m². Šlifavimas ir lakavimas — nuo 12 €/m². Tikslią kainą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Ar galima atnaujinti seną parketą nekeičiant?",
      a: "Dažnai taip — jei mediena sveika, pakanka šlifavimo ir naujo lako ar alyvos. Tai gerokai pigiau nei naujo parketo klojimas. Meistras įvertins būklę.",
    },
    {
      q: "Ar reikia paruošti pagrindą?",
      a: "Taip — pagrindas turi būti lygus ir sausas. Drėgmės patikra ir lyginimas (jei reikia) užtikrina, kad parketas nepradės girgždėti ar pūstis. Tai įtraukiama į pasiūlymą.",
    },
    {
      q: "Kiek laiko trunka darbai?",
      a: "Kambario parketą paklojama per 1–3 dienas, su šlifavimu ir lakavimu reikia papildomo laiko dangai išdžiūti. Terminus meistras nurodo pasiūlyme.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu meistru.",
    },
  ],
  request: {
    title: "Reikalingas parketo klojimas Kaune",
    description:
      "Ieškau patikimo meistro parketo klojimui Kaune. Reikia pakloti parketą / parketlentę (ar atnaujinti seną — šlifuoti ir lakuoti). Prašau pateikti pasiūlymą su orientacine kaina už m² ir galimu darbų laiku.",
  },
  finalCtaTitle: "Reikia pakloti parketą Kaune?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
