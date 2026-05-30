import { Grid3x3, ShowerHead, Ruler, Layers, Hammer, Droplet } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/plyteliu-klijavimas-vilniuje",
  city: "Vilnius",
  categorySlug: "pr-statybos-apdaila--vidaus-apdailos-darbai--plyteliu-klijavimas",
  serviceType: "Plytelių klijavimo paslaugos",
  seoTitle: "Plytelių klijavimas Vilniuje — gaukite pasiūlymus",
  seoDescription:
    "Reikia paklijuoti plyteles Vilniuje? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų plytelių klojėjų. Vonios, virtuvės, grindų plytelės, mozaika.",
  heroBadge: "Plytelių klijavimas Vilniuje",
  heroBadgeIcon: Grid3x3,
  h1: "Plytelių klijavimas Vilniuje — patikimi meistrai",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Vilniaus plytelių klojėjų. Vonia, virtuvė, grindys ar mozaika — palyginkite kainas ir pasirinkite geriausią meistrą.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780140938/landing/plyteliu-klijavimas-vilniuje/ytzrsycbbhugyq3odxki.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780140959/landing/plyteliu-klijavimas-vilniuje/ngktoveipp8fgf7lrmgc.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780140987/landing/plyteliu-klijavimas-vilniuje/w4rlcjy0rbbt4y7ssbap.jpg",
  },
  imageAlts: {
    hero: "Plytelių klojėjas kloja dideles grindų plyteles šviesioje Vilniaus virtuvėje",
    work: "Rankos deda didelę grindų plytelę ant klijų su lyginimo spaustukais",
    consult: "Plytelių meistras aptaria išklotinę su klientu virtuvėje",
  },
  servicesHeading: "Kokius plytelių darbus galite užsakyti",
  servicesLead: "Vilniaus plytelių klojėjai platformoje atlieka tiek smulkius, tiek pilnos apdailos darbus.",
  services: [
    { icon: ShowerHead, title: "Vonios plytelės", text: "Sienų ir grindų plytelių klijavimas vonioje ir tualete." },
    { icon: Droplet, title: "Virtuvės plytelės", text: "Virtuvės sienelės (fartuko) ir grindų plytelės." },
    { icon: Layers, title: "Grindų plytelės", text: "Koridorių, holų ir kitų patalpų grindų plytelės." },
    { icon: Grid3x3, title: "Mozaika ir dekorai", text: "Mozaikos, dekoratyvinių elementų klijavimas." },
    { icon: Ruler, title: "Pagrindo paruošimas", text: "Paviršiaus lyginimas, hidroizoliacija prieš klijavimą." },
    { icon: Hammer, title: "Senų plytelių keitimas", text: "Senų plytelių demontavimas ir naujų klijavimas." },
  ],
  pricingHeading: "Kiek kainuoja plytelių klijavimas Vilniuje",
  offerPrice: "16",
  pricing: [
    { job: "Sienų plytelių klijavimas (m²)", price: "nuo 18 €" },
    { job: "Grindų plytelių klijavimas (m²)", price: "nuo 16 €" },
    { job: "Mozaikos klijavimas (m²)", price: "nuo 30 €" },
    { job: "Vonios pilna apdaila plytelėmis (m²)", price: "nuo 25 €" },
    { job: "Senų plytelių demontavimas (m²)", price: "nuo 6 €" },
    { job: "Siūlių užtaisymas (m²)", price: "nuo 4 €" },
  ],
  insights: {
    heading: "Į ką atkreipti dėmesį klijuojant plyteles",
    items: [
      { title: "Pagrindas ir hidroizoliacija", text: "Drėgnose patalpose (vonia, dušas) prieš plyteles būtina hidroizoliacija, o paviršius turi būti lygus ir tvirtas. Paklauskite, ar tai įskaičiuota — nuo to priklauso ilgaamžiškumas." },
      { title: "Plytelių formatas lemia kainą", text: "Didelio formato ar mozaikos plytelės klojamos lėčiau ir reikalauja itin lygaus pagrindo, todėl kainuoja brangiau nei standartinės. Nurodykite plytelių dydį." },
      { title: "Išklotinė ir pjūviai", text: "Gražus rezultatas priklauso nuo apgalvotos išklotinės (kur prasideda eilė, kaip išdėstomi pjūviai). Geras meistras tai aptaria iš anksto." },
      { title: "Siūlės ir silikonas", text: "Tinkamas glaistas ir silikonas kampuose apsaugo nuo drėgmės ir pelėsio. Patikslinkite, ar siūlių užtaisymas įeina į kainą." },
    ],
  },
  faq: [
    {
      q: "Kiek kainuoja plytelių klijavimas Vilniuje?",
      a: "Sienų plytelės — nuo ~18 €/m², grindų — nuo 16 €/m², mozaika — nuo 30 €/m². Galutinę kainą lemia plytelių formatas, raštas ir paviršiaus būklė. Tikslią sąmatą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
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
    title: "Reikalingas plytelių klijavimas Vilniuje",
    description:
      "Ieškau patikimo plytelių klojėjo Vilniuje. Reikia paklijuoti plyteles — pavyzdžiui, vonioje, virtuvėje ar ant grindų. Prašau pateikti pasiūlymą su orientacine kaina už m² ir galimu darbų laiku.",
  },
  finalCtaTitle: "Reikia paklijuoti plyteles Vilniuje?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
