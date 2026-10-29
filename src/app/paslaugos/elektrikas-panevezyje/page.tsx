import { Zap, Plug, Lightbulb, Wrench, Gauge, Camera, FileText } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/elektrikas-panevezyje",
  city: "Panevėžys",
  categorySlug: "pr-statybos-apdaila--elektrikai-elektros-darbai",
  serviceType: "Elektriko paslaugos",
  seoTitle: "Elektrikas Panevėžyje — gaukite pasiūlymus",
  seoDescription:
    "Reikia elektriko Panevėžyje? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų elektrikų. Instaliacija, rozetės, gedimai, skydinės, skubus iškvietimas.",
  heroBadge: "Elektros paslaugos Panevėžyje",
  heroBadgeIcon: Zap,
  h1: "Elektrikas Panevėžyje, kuriuo galite pasitikėti",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Panevėžio elektrikų. Rozetės, instaliacija, gedimai ar skubus iškvietimas — palyginkite kainas ir pasirinkite geriausią specialistą.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780158992/landing/elektrikas-panevezyje/kgb8gn9kue65laffqkow.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780159016/landing/elektrikas-panevezyje/gvx97qih01fs7hhpu1kk.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780159043/landing/elektrikas-panevezyje/kawzgrkwty08domcrz9y.jpg",
  },
  imageAlts: {
    hero: "Elektrikas Panevėžyje keičia seną skydinę nauja automatų dėže",
    work: "Rankos montuoja automatinius išjungiklius ant DIN bėgelio skydinėje",
    consult: "Elektrikas aiškina naujos skydinės išdėstymą namo savininkui",
  },
  servicesHeading: "Kokius elektros darbus galite užsakyti",
  servicesLead: "Panevėžio elektrikai platformoje atlieka tiek smulkius, tiek didelius darbus.",
  services: [
    { icon: Plug, title: "Rozetės ir jungikliai", text: "Naujų taškų įrengimas, keitimas, perkėlimas bute ar name." },
    { icon: Lightbulb, title: "Elektros instaliacija", text: "Pilna ar dalinė instaliacija renovuojant arba naujos statybos objekte." },
    { icon: Wrench, title: "Gedimų paieška ir remontas", text: "Dingusi elektra, trumpieji jungimai, automatų išsijungimas." },
    { icon: Gauge, title: "Skydinės ir varžų matavimai", text: "Skydinės surinkimas, automatų keitimas, varžų matavimo aktai." },
    { icon: Camera, title: "Signalizacija ir kameros", text: "Apsaugos sistemų, vaizdo kamerų prijungimas ir instaliacija." },
    { icon: FileText, title: "Elektros projektai", text: "Projektavimas ir derinimas didesniems objektams." },
  ],
  pricingHeading: "Kiek kainuoja elektrikas Panevėžyje",
  pricing: [
    { job: "Rozetės ar jungiklio montavimas", price: "nuo 15 €" },
    { job: "Elektros taško įrengimas (su laidais)", price: "25–45 €" },
    { job: "Skydinės automato keitimas", price: "20–40 €" },
    { job: "Gedimo paieška ir remontas", price: "nuo 30 €" },
    { job: "Buto instaliacija (1–2 kambariai)", price: "nuo 600 €" },
    { job: "Skubus iškvietimas (tą pačią dieną)", price: "+20–50 %" },
  ],
  insights: {
    heading: "Į ką atkreipti dėmesį renkantis elektriką",
    items: [
      { title: "Kvalifikacija svarbiems darbams", text: "Skydinės, įvado ir varžų matavimų darbams svarbu, kad elektrikas turėtų kvalifikaciją ir galėtų išrašyti aktą. Smulkiems darbams pakanka patyrusio meistro." },
      { title: "Skubus ar planinis", text: "Dingusi elektra ar kibirkščiuojanti rozetė — skubu ir pavojinga. Pažymėkite skubą, kad elektrikai matytų darbą pirmumo tvarka." },
      { title: "Senos instaliacijos rizika", text: "Senuose namuose aliuminio laidai ir perkrautos grupės dažnai būna gedimų priežastis. Verta įvertinti visą skydinę, o ne tik simptomą." },
      { title: "Kaina dažnai už tašką", text: "Instaliacijos darbai vertinami pagal taškų skaičių. Apgalvojus, kiek rozečių ir jungiklių reikia, gausite tikslesnį pasiūlymą." },
    ],
  },
  faq: [
    {
      q: "Kiek kainuoja elektriko paslaugos Panevėžyje?",
      a: "Atskiros rozetės montavimas — nuo ~15 €, elektros taško įrengimas su laidais — 25–45 €, gedimo paieška — nuo 30 €. Tikslią kainą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Per kiek laiko atvyks elektrikas Panevėžyje?",
      a: "Daugumą darbų galima suderinti tą pačią arba kitą dieną. Skubiems gedimams elektrikai dažnai atvyksta per kelias valandas — pažymėkite skubą.",
    },
    {
      q: "Ar elektrikai turi reikiamą kvalifikaciją?",
      a: "Rekomenduojame rinktis pagal įvertinimą, atsiliepimus ir patirtį. Skydinės bei varžų matavimų darbams prašykite kvalifikaciją patvirtinančių dokumentų.",
    },
    {
      q: "Kokius elektros darbus galima užsakyti?",
      a: "Rozetės ir jungikliai, elektros instaliacija, gedimų paieška, skydinės surinkimas, varžų matavimai, signalizacijos ir kamerų prijungimas, elektros projektai.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu elektriku.",
    },
  ],
  request: {
    title: "Reikalingas elektrikas Panevėžyje",
    description:
      "Ieškau patikimo elektriko Panevėžyje. Reikia atlikti elektros darbus — pavyzdžiui, rozečių montavimas, instaliacijos pataisymai, skydinės keitimas ar gedimo paieška. Prašau pateikti pasiūlymą su orientacine kaina ir galimu atvykimo laiku.",
  },
  finalCtaTitle: "Reikia elektriko Panevėžyje?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
