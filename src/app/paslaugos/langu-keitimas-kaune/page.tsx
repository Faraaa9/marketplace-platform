import { AppWindow, Ruler, Wrench, Thermometer, Hammer, ShieldCheck } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/langu-keitimas-kaune",
  city: "Kaunas",
  categorySlug: "pr-statybos-apdaila--langai-durys-gamyba-montavimas--langu-montavimas",
  serviceType: "Langų keitimo paslaugos",
  seoTitle: "Langų keitimas Kaune — gaukite pasiūlymus ir kainas",
  seoDescription:
    "Reikia pakeisti langus Kaune? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų meistrų. Plastikinių, medinių langų keitimas, montavimas, angokraščiai.",
  heroBadge: "Langų keitimas Kaune",
  heroBadgeIcon: AppWindow,
  h1: "Langų keitimas Kaune — šilčiau ir tyliau",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Kauno langų meistrų. Senų langų keitimas, naujų montavimas su angokraščiais ir palangėmis — palyginkite kainas ir pasirinkite geriausią.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780158687/landing/langu-keitimas-kaune/l7uvol0f9yrtalslphpy.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780158716/landing/langu-keitimas-kaune/uxmkit3hg0m0yyzvepfs.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780158737/landing/langu-keitimas-kaune/koydkqr968flpydrnbts.jpg",
  },
  imageAlts: {
    hero: "Montuotojai stato naują plastikinį langą buto angoje Kaune",
    work: "Rankos purškia montavimo putas ir tvirtina lango rėmo inkarą",
    consult: "Langų specialistas matuoja angą ir aptaria variantus su klientu",
  },
  servicesHeading: "Kokius langų darbus galite užsakyti",
  servicesLead: "Kauno meistrai platformoje keičia ir montuoja langus butuose ir namuose.",
  services: [
    { icon: AppWindow, title: "Plastikiniai langai", text: "Senų langų keitimas naujais PVC langais." },
    { icon: Hammer, title: "Mediniai langai", text: "Medinių ir aluminio langų montavimas." },
    { icon: Ruler, title: "Angokraščiai ir palangės", text: "Vidinių ir išorinių angokraščių, palangių įrengimas." },
    { icon: Thermometer, title: "Sandarinimas", text: "Tinkamas montavimas su garo ir vėjo izoliacija." },
    { icon: Wrench, title: "Tarpinių keitimas / reguliavimas", text: "Langų reguliavimas, tarpinių ir furnitūros keitimas." },
    { icon: ShieldCheck, title: "Senų langų išėmimas", text: "Senų langų demontavimas ir išvežimas." },
  ],
  pricingHeading: "Kiek kainuoja langų keitimas Kaune",
  pricing: [
    { job: "Lango keitimas (montavimas, vnt.)", price: "nuo 40 €" },
    { job: "Su angokraščiais (vnt.)", price: "nuo 70 €" },
    { job: "Palangės montavimas (vnt.)", price: "nuo 20 €" },
    { job: "Senų langų išėmimas (vnt.)", price: "nuo 10 €" },
    { job: "Tarpinių keitimas (vnt.)", price: "nuo 15 €" },
    { job: "Lango reguliavimas (vnt.)", price: "nuo 10 €" },
  ],
  insights: {
    heading: "Į ką atkreipti dėmesį keičiant langus",
    items: [
      { title: "Montavimas svarbiau už patį langą", text: "Net geriausias langas „kvėpuos“ pro plyšius, jei blogai sumontuotas. Svarbu tinkamas tvirtinimas, putos ir garo/vėjo izoliacinės juostos. Paklauskite, ar naudojamas „šiltas montažas“." },
      { title: "Tikslus matavimas", text: "Langai užsakomi pagal angą, todėl tikslus matavimas būtinas. Daug meistrų atvyksta pamatuoti prieš užsakymą — verta tuo pasinaudoti." },
      { title: "Angokraščiai užbaigia darbą", text: "Po lango keitimo lieka apardyti angokraščiai. Patikslinkite, ar jų apdaila ir palangės įskaičiuotos — be jų darbas atrodo nebaigtas." },
      { title: "Stiklo paketas pagal poreikį", text: "Dviejų ar trijų stiklų paketai skiriasi šiluma ir garso izoliacija. Prie judrios gatvės verta rinktis geresnę garso izoliaciją." },
    ],
  },
  faq: [
    {
      q: "Kiek kainuoja langų keitimas Kaune?",
      a: "Vieno lango montavimas prasideda nuo ~40 €, su angokraščiais — nuo 70 €. Senų langų išėmimas ir palangės skaičiuojami atskirai. Pačius langus dažniausiai perka užsakovas. Tikslią kainą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Ar meistras atvyksta pamatuoti?",
      a: "Dažnai taip — tikslus angos matavimas svarbus, kad langas tiktų. Kai kurie meistrai matuoja nemokamai prieš užsakymą. Pažymėkite, jei reikia matavimo.",
    },
    {
      q: "Ar į kainą įeina langai?",
      a: "Paprastai pateikiama montavimo kaina, o langus perka užsakovas pagal meistro rekomendacijas. Kai kurie meistrai gali ir parūpinti langus — tai aptariama pasiūlyme.",
    },
    {
      q: "Ar galima tik pakeisti tarpines, nekeičiant lango?",
      a: "Taip — jei rėmas geras, dažnai pakanka tarpinių ar furnitūros keitimo ir reguliavimo. Tai nebrangu ir grąžina sandarumą. Aprašykite problemą.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu meistru.",
    },
  ],
  request: {
    title: "Reikalingas langų keitimas Kaune",
    description:
      "Ieškau meistro langų keitimui Kaune. Reikia pakeisti / sumontuoti langus (nurodysiu kiekį ir tipą) su angokraščiais ir palangėmis. Prašau pateikti pasiūlymą su orientacine kaina ir galimu darbų laiku.",
  },
  finalCtaTitle: "Reikia pakeisti langus Kaune?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
