import { Grid3x3, ShowerHead, Ruler, Layers, Hammer, Droplet } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/plyteliu-klijavimas-kaune",
  city: "Kaunas",
  categorySlug: "pr-statybos-apdaila--vidaus-apdailos-darbai--plyteliu-klijavimas",
  serviceType: "Plytelių klijavimo paslaugos",
  seoTitle: "Plytelių klijavimas Kaune — gaukite pasiūlymus ir kainas",
  seoDescription:
    "Reikia paklijuoti plyteles Kaune? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų plytelių klojėjų. Vonios, virtuvės, grindų plytelės, mozaika.",
  heroBadge: "Plytelių klijavimas Kaune",
  heroBadgeIcon: Grid3x3,
  h1: "Plytelių klijavimas Kaune — patikimi meistrai",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Kauno plytelių klojėjų. Vonia, virtuvė, grindys ar mozaika — palyginkite kainas ir pasirinkite geriausią meistrą.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780123838/landing/plyteliu-klijavimas-kaune/kyqumw9xcaptc2likhu7.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780123858/landing/plyteliu-klijavimas-kaune/lfixtj5g4ugwjh9gr4jk.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780123886/landing/plyteliu-klijavimas-kaune/kkwjdumixgydcsvupmgw.jpg",
  },
  imageAlts: {
    hero: "Plytelių klojėjas klijuoja sienines plyteles modernioje vonioje Kaune",
    work: "Rankos spaudžia plytelę ant klijų su kryžiukais",
    consult: "Plytelių meistras rodo plytelių pavyzdžius klientei",
  },
  servicesHeading: "Kokius plytelių darbus galite užsakyti",
  servicesLead: "Kauno plytelių klojėjai platformoje atlieka tiek smulkius, tiek pilnos apdailos darbus.",
  services: [
    { icon: ShowerHead, title: "Vonios plytelės", text: "Sienų ir grindų plytelių klijavimas vonioje ir tualete." },
    { icon: Droplet, title: "Virtuvės plytelės", text: "Virtuvės sienelės (fartuko) ir grindų plytelės." },
    { icon: Layers, title: "Grindų plytelės", text: "Koridorių, holų ir kitų patalpų grindų plytelės." },
    { icon: Grid3x3, title: "Mozaika ir dekorai", text: "Mozaikos, dekoratyvinių elementų klijavimas." },
    { icon: Ruler, title: "Pagrindo paruošimas", text: "Paviršiaus lyginimas, hidroizoliacija prieš klijavimą." },
    { icon: Hammer, title: "Senų plytelių keitimas", text: "Senų plytelių demontavimas ir naujų klijavimas." },
  ],
  pricingHeading: "Kiek kainuoja plytelių klijavimas Kaune",
  offerPrice: "16",
  pricing: [
    { job: "Sienų plytelių klijavimas (m²)", price: "nuo 18 €" },
    { job: "Grindų plytelių klijavimas (m²)", price: "nuo 16 €" },
    { job: "Mozaikos klijavimas (m²)", price: "nuo 30 €" },
    { job: "Vonios pilna apdaila plytelėmis (m²)", price: "nuo 25 €" },
    { job: "Senų plytelių demontavimas (m²)", price: "nuo 6 €" },
    { job: "Siūlių užtaisymas (m²)", price: "nuo 4 €" },
  ],
  faq: [
    {
      q: "Kiek kainuoja plytelių klijavimas Kaune?",
      a: "Kaina skaičiuojama už kvadratinį metrą: sienų plytelės — nuo ~18 €/m², grindų — nuo 16 €/m², mozaika — nuo 30 €/m². Galutinę kainą lemia plytelių formatas, raštas ir paviršiaus būklė. Tikslią sąmatą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Ar į kainą įeina medžiagos?",
      a: "Dažniausiai pateikiama darbų kaina, o plyteles, klijus ir glaistą perka klientas pagal meistro rekomendacijas. Tai aiškiai aptariama pasiūlyme.",
    },
    {
      q: "Ar reikia paruošti paviršių prieš klijavimą?",
      a: "Taip — kokybiškam rezultatui svarbu lygus, tvirtas ir (drėgnose patalpose) hidroizoliuotas pagrindas. Meistras įvertins paviršių ir, jei reikia, įtrauks paruošimą į pasiūlymą.",
    },
    {
      q: "Kiek laiko trunka vonios apdaila plytelėmis?",
      a: "Vidutinę vonią paklojama per kelias dienas iki savaitės, priklausomai nuo ploto, plytelių formato ir paruošiamųjų darbų. Terminus meistras nurodo pasiūlyme.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu meistru.",
    },
  ],
  request: {
    title: "Reikalingas plytelių klijavimas Kaune",
    description:
      "Ieškau patikimo plytelių klojėjo Kaune. Reikia paklijuoti plyteles — pavyzdžiui, vonioje, virtuvėje ar ant grindų. Prašau pateikti pasiūlymą su orientacine kaina už m² ir galimu darbų laiku.",
  },
  finalCtaTitle: "Reikia paklijuoti plyteles Kaune?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
