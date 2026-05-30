import {
  Zap,
  Plug,
  Lightbulb,
  Wrench,
  Gauge,
  Camera,
  FileText,
} from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/elektrikas-kaune",
  city: "Kaunas",
  categorySlug: "pr-statybos-apdaila--elektrikai-elektros-darbai",
  serviceType: "Elektriko paslaugos",
  seoTitle: "Elektrikas Kaune — gaukite pasiūlymus iš patikimų specialistų",
  seoDescription:
    "Reikia elektriko Kaune? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų elektrikų. Instaliacija, rozetės, gedimai, skubus iškvietimas.",
  heroBadge: "Elektros paslaugos Kaune",
  heroBadgeIcon: Zap,
  h1: "Elektrikas Kaune, kuriuo galite pasitikėti",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Kauno elektrikų. Rozetės, instaliacija, gedimai ar skubus iškvietimas — palyginkite kainas ir pasirinkite geriausią specialistą.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780113964/landing/elektrikas-kaune/da2l9yvhlvbk6h0rr1kv.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780113985/landing/elektrikas-kaune/sg2vocbdeot0ic3xejop.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780114006/landing/elektrikas-kaune/xwpgos97mutdjjznlpaj.jpg",
  },
  imageAlts: {
    hero: "Elektrikas Kaune dirba prie modernios elektros skydinės bute",
    work: "Elektrikas montuoja sieninę rozetę Kaune",
    consult: "Elektrikas Kaune aptaria elektros darbų planą su klientais",
  },
  servicesHeading: "Kokius elektros darbus galite užsakyti",
  servicesLead: "Kauno elektrikai platformoje atlieka tiek smulkius, tiek didelius darbus.",
  services: [
    { icon: Plug, title: "Rozetės ir jungikliai", text: "Naujų taškų įrengimas, keitimas, perkėlimas bute ar name." },
    { icon: Lightbulb, title: "Elektros instaliacija", text: "Pilna ar dalinė instaliacija renovuojant arba naujos statybos objekte." },
    { icon: Wrench, title: "Gedimų paieška ir remontas", text: "Dingusi elektra, trumpieji jungimai, automatų išsijungimas." },
    { icon: Gauge, title: "Skydinės ir varžų matavimai", text: "Skydinės surinkimas, automatų keitimas, varžų matavimo aktai." },
    { icon: Camera, title: "Signalizacija ir kameros", text: "Apsaugos sistemų, vaizdo kamerų prijungimas ir instaliacija." },
    { icon: FileText, title: "Elektros projektai", text: "Projektavimas ir derinimas didesniems objektams." },
  ],
  pricingHeading: "Kiek kainuoja elektrikas Kaune",
  offerPrice: "15",
  pricing: [
    { job: "Rozetės ar jungiklio montavimas", price: "nuo 15 €" },
    { job: "Elektros taško įrengimas (su laidais)", price: "25–45 €" },
    { job: "Skydinės automato keitimas", price: "20–40 €" },
    { job: "Gedimo paieška ir remontas", price: "nuo 30 €" },
    { job: "Buto instaliacija (1–2 kambariai)", price: "nuo 600 €" },
    { job: "Skubus iškvietimas (tą pačią dieną)", price: "+20–50 %" },
  ],
  faq: [
    {
      q: "Kiek kainuoja elektriko paslaugos Kaune?",
      a: "Kaina priklauso nuo darbo: atskiros rozetės montavimas prasideda nuo ~15 €, elektros taško įrengimas su laidais — 25–45 €, gedimo paieška — nuo 30 €. Tikslią kainą gausite pasiūlyme, kai aprašysite konkretų darbą. Pasiūlymų gavimas platformoje nemokamas.",
    },
    {
      q: "Per kiek laiko atvyks elektrikas?",
      a: "Daugumą darbų Kaune galima suderinti tą pačią arba kitą dieną. Skubiems gedimams (dingusi elektra, trumpasis jungimas) elektrikai dažnai atvyksta per kelias valandas — pažymėkite, kad darbas skubus.",
    },
    {
      q: "Ar elektrikai turi reikiamą kvalifikaciją?",
      a: "Platformoje rekomenduojame rinktis specialistus pagal įvertinimą, atsiliepimus ir patirtį. Elektros darbams (ypač skydinės, varžų matavimai) prašykite kvalifikaciją patvirtinančių dokumentų — patikimi meistrai juos pateikia be problemų.",
    },
    {
      q: "Kokius elektros darbus galima užsakyti?",
      a: "Rozetės ir jungikliai, elektros instaliacija, gedimų paieška, skydinės surinkimas ir automatų keitimas, varžų matavimai, signalizacijos ir vaizdo kamerų prijungimas, elektros projektai. Tiesiog aprašykite savo darbą.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu elektriku.",
    },
  ],
  request: {
    title: "Reikalingas elektrikas Kaune",
    description:
      "Ieškau patikimo elektriko Kaune. Reikia atlikti elektros darbus bute — pavyzdžiui, rozečių ar jungiklių montavimas, instaliacijos pataisymai ar gedimo paieška. Prašau pateikti pasiūlymą su orientacine kaina ir galimu atvykimo laiku.",
  },
  finalCtaTitle: "Reikia elektriko Kaune jau dabar?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
