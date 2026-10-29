import { Zap, Plug, Lightbulb, Wrench, Gauge, Camera, FileText } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/elektrikas-klaipedoje",
  city: "Klaipėda",
  categorySlug: "pr-statybos-apdaila--elektrikai-elektros-darbai",
  serviceType: "Elektriko paslaugos",
  seoTitle: "Elektrikas Klaipėdoje — gaukite pasiūlymus",
  seoDescription:
    "Reikia elektriko Klaipėdoje? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų elektrikų. Instaliacija, rozetės, įkrovimo stotelės, gedimai, skubus iškvietimas.",
  heroBadge: "Elektros paslaugos Klaipėdoje",
  heroBadgeIcon: Zap,
  h1: "Elektrikas Klaipėdoje, kuriuo galite pasitikėti",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Klaipėdos elektrikų. Rozetės, instaliacija, elektromobilių įkrovimas, gedimai ar skubus iškvietimas — palyginkite kainas ir pasirinkite geriausią.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780123663/landing/elektrikas-klaipedoje/doeruebaptpi09brg1t5.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780123699/landing/elektrikas-klaipedoje/hdf04qoktx4wd7hmezdd.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780123723/landing/elektrikas-klaipedoje/wy2myxjqen6fh8g4gwgn.jpg",
  },
  imageAlts: {
    hero: "Elektrikas Klaipėdoje montuoja elektromobilio įkrovimo stotelę",
    work: "Elektriko rankos dirba prie elektros skaitiklio spintos",
    consult: "Elektrikas Klaipėdoje konsultuoja namų savininką prie skydinės",
  },
  servicesHeading: "Kokius elektros darbus galite užsakyti",
  servicesLead: "Klaipėdos elektrikai platformoje atlieka tiek smulkius, tiek didelius darbus.",
  services: [
    { icon: Plug, title: "Rozetės ir jungikliai", text: "Naujų taškų įrengimas, keitimas, perkėlimas bute ar name." },
    { icon: Lightbulb, title: "Elektros instaliacija", text: "Pilna ar dalinė instaliacija renovuojant arba naujos statybos objekte." },
    { icon: Wrench, title: "Gedimų paieška ir remontas", text: "Dingusi elektra, trumpieji jungimai, automatų išsijungimas." },
    { icon: Gauge, title: "Skydinės ir varžų matavimai", text: "Skydinės surinkimas, automatų keitimas, varžų matavimo aktai." },
    { icon: Camera, title: "Signalizacija ir kameros", text: "Apsaugos sistemų, vaizdo kamerų prijungimas ir instaliacija." },
    { icon: FileText, title: "Įkrovimo stotelės", text: "Elektromobilių įkrovimo stotelių montavimas namuose." },
  ],
  pricingHeading: "Kiek kainuoja elektrikas Klaipėdoje",
  pricing: [
    { job: "Rozetės ar jungiklio montavimas", price: "nuo 15 €" },
    { job: "Elektros taško įrengimas (su laidais)", price: "25–45 €" },
    { job: "Skydinės automato keitimas", price: "20–40 €" },
    { job: "Gedimo paieška ir remontas", price: "nuo 30 €" },
    { job: "Įkrovimo stotelės montavimas", price: "nuo 150 €" },
    { job: "Skubus iškvietimas (tą pačią dieną)", price: "+20–50 %" },
  ],
  faq: [
    {
      q: "Kiek kainuoja elektriko paslaugos Klaipėdoje?",
      a: "Kaina priklauso nuo darbo: atskiros rozetės montavimas prasideda nuo ~15 €, elektros taško įrengimas su laidais — 25–45 €, gedimo paieška — nuo 30 €. Tikslią kainą gausite pasiūlyme, kai aprašysite konkretų darbą. Pasiūlymų gavimas platformoje nemokamas.",
    },
    {
      q: "Per kiek laiko atvyks elektrikas Klaipėdoje?",
      a: "Daugumą darbų uostamiestyje galima suderinti tą pačią arba kitą dieną. Skubiems gedimams (dingusi elektra, trumpasis jungimas) elektrikai dažnai atvyksta per kelias valandas — pažymėkite, kad darbas skubus.",
    },
    {
      q: "Ar galima sumontuoti elektromobilio įkrovimo stotelę?",
      a: "Taip, daug Klaipėdos elektrikų montuoja namų įkrovimo stoteles. Aprašykite, kokį automobilį ir kur norite krauti — specialistas parinks tinkamą sprendimą ir pateiks kainą.",
    },
    {
      q: "Ar elektrikai turi reikiamą kvalifikaciją?",
      a: "Platformoje rekomenduojame rinktis specialistus pagal įvertinimą, atsiliepimus ir patirtį. Elektros darbams (ypač skydinės, varžų matavimai) prašykite kvalifikaciją patvirtinančių dokumentų — patikimi meistrai juos pateikia be problemų.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu elektriku.",
    },
  ],
  request: {
    title: "Reikalingas elektrikas Klaipėdoje",
    description:
      "Ieškau patikimo elektriko Klaipėdoje. Reikia atlikti elektros darbus — pavyzdžiui, rozečių montavimas, instaliacijos pataisymai, gedimo paieška ar įkrovimo stotelės montavimas. Prašau pateikti pasiūlymą su orientacine kaina ir galimu atvykimo laiku.",
  },
  finalCtaTitle: "Reikia elektriko Klaipėdoje jau dabar?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
