import { Zap, Plug, Lightbulb, Wrench, Gauge, Camera, FileText } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/elektrikas-vilniuje",
  city: "Vilnius",
  categorySlug: "pr-statybos-apdaila--elektrikai-elektros-darbai",
  serviceType: "Elektriko paslaugos",
  seoTitle: "Elektrikas Vilniuje — gaukite pasiūlymus",
  seoDescription:
    "Reikia elektriko Vilniuje? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų elektrikų. Instaliacija, rozetės, gedimai, šviestuvai, skubus iškvietimas.",
  heroBadge: "Elektros paslaugos Vilniuje",
  heroBadgeIcon: Zap,
  h1: "Elektrikas Vilniuje, kuriuo galite pasitikėti",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Vilniaus elektrikų. Rozetės, instaliacija, šviestuvai, gedimai ar skubus iškvietimas — palyginkite kainas ir pasirinkite geriausią specialistą.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780123583/landing/elektrikas-vilniuje/ighhzj53fqyh42pnaby5.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780123604/landing/elektrikas-vilniuje/jv1tvaiu7jiivmgeyrro.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780123635/landing/elektrikas-vilniuje/ek4ozugxumvds7vyvm9t.jpg",
  },
  imageAlts: {
    hero: "Elektrikas Vilniuje montuoja lubinį šviestuvą šviesiame kambaryje",
    work: "Elektriko rankos jungia šviestuvo laidus",
    consult: "Elektrikas Vilniuje aptaria elektros schemą su klientu",
  },
  servicesHeading: "Kokius elektros darbus galite užsakyti",
  servicesLead: "Vilniaus elektrikai platformoje atlieka tiek smulkius, tiek didelius darbus.",
  services: [
    { icon: Plug, title: "Rozetės ir jungikliai", text: "Naujų taškų įrengimas, keitimas, perkėlimas bute ar name." },
    { icon: Lightbulb, title: "Elektros instaliacija", text: "Pilna ar dalinė instaliacija renovuojant arba naujos statybos objekte." },
    { icon: Wrench, title: "Gedimų paieška ir remontas", text: "Dingusi elektra, trumpieji jungimai, automatų išsijungimas." },
    { icon: Gauge, title: "Skydinės ir varžų matavimai", text: "Skydinės surinkimas, automatų keitimas, varžų matavimo aktai." },
    { icon: Camera, title: "Signalizacija ir kameros", text: "Apsaugos sistemų, vaizdo kamerų prijungimas ir instaliacija." },
    { icon: FileText, title: "Elektros projektai", text: "Projektavimas ir derinimas didesniems objektams." },
  ],
  pricingHeading: "Kiek kainuoja elektrikas Vilniuje",
  pricing: [
    { job: "Rozetės ar jungiklio montavimas", price: "nuo 15 €" },
    { job: "Elektros taško įrengimas (su laidais)", price: "25–45 €" },
    { job: "Šviestuvo pakabinimas", price: "nuo 20 €" },
    { job: "Gedimo paieška ir remontas", price: "nuo 30 €" },
    { job: "Buto instaliacija (1–2 kambariai)", price: "nuo 600 €" },
    { job: "Skubus iškvietimas (tą pačią dieną)", price: "+20–50 %" },
  ],
  faq: [
    {
      q: "Kiek kainuoja elektriko paslaugos Vilniuje?",
      a: "Kaina priklauso nuo darbo: atskiros rozetės montavimas prasideda nuo ~15 €, elektros taško įrengimas su laidais — 25–45 €, gedimo paieška — nuo 30 €. Tikslią kainą gausite pasiūlyme, kai aprašysite konkretų darbą. Pasiūlymų gavimas platformoje nemokamas.",
    },
    {
      q: "Per kiek laiko atvyks elektrikas Vilniuje?",
      a: "Daugumą darbų sostinėje galima suderinti tą pačią arba kitą dieną. Skubiems gedimams (dingusi elektra, trumpasis jungimas) elektrikai dažnai atvyksta per kelias valandas — pažymėkite, kad darbas skubus.",
    },
    {
      q: "Ar elektrikai turi reikiamą kvalifikaciją?",
      a: "Platformoje rekomenduojame rinktis specialistus pagal įvertinimą, atsiliepimus ir patirtį. Elektros darbams (ypač skydinės, varžų matavimai) prašykite kvalifikaciją patvirtinančių dokumentų — patikimi meistrai juos pateikia be problemų.",
    },
    {
      q: "Kokius elektros darbus galima užsakyti?",
      a: "Rozetės ir jungikliai, elektros instaliacija, šviestuvų montavimas, gedimų paieška, skydinės surinkimas, varžų matavimai, signalizacijos ir vaizdo kamerų prijungimas, elektros projektai. Tiesiog aprašykite savo darbą.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu elektriku.",
    },
  ],
  request: {
    title: "Reikalingas elektrikas Vilniuje",
    description:
      "Ieškau patikimo elektriko Vilniuje. Reikia atlikti elektros darbus bute — pavyzdžiui, rozečių ar jungiklių montavimas, šviestuvų pakabinimas, instaliacijos pataisymai ar gedimo paieška. Prašau pateikti pasiūlymą su orientacine kaina ir galimu atvykimo laiku.",
  },
  finalCtaTitle: "Reikia elektriko Vilniuje jau dabar?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
