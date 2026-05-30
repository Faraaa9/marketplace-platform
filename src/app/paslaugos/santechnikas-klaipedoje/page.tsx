import { Droplet, Wrench, ShowerHead, Waves, Flame, Gauge } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/santechnikas-klaipedoje",
  city: "Klaipėda",
  categorySlug: "pr-statybos-apdaila--santechnikai-santechnikos-darbai",
  serviceType: "Santechnikos paslaugos",
  seoTitle: "Santechnikas Klaipėdoje — gaukite pasiūlymus iš specialistų",
  seoDescription:
    "Reikia santechniko Klaipėdoje? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų santechnikų. Maišytuvai, vamzdynai, protėkiai, kanalizacija, skubus iškvietimas.",
  heroBadge: "Santechnikos paslaugos Klaipėdoje",
  heroBadgeIcon: Droplet,
  h1: "Santechnikas Klaipėdoje, kuriuo galite pasitikėti",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Klaipėdos santechnikų. Maišytuvų keitimas, vamzdynai, protėkiai ar skubus iškvietimas — palyginkite kainas ir pasirinkite geriausią specialistą.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780123489/landing/santechnikas-klaipedoje/stiwsdbf8xiwp0mysgmp.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780123522/landing/santechnikas-klaipedoje/hihxmcszv9eprjlwtbfh.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780123559/landing/santechnikas-klaipedoje/bzznr9kitbpceyyebx8j.jpg",
  },
  imageAlts: {
    hero: "Santechnikas Klaipėdoje prijungia vandens šildytuvą",
    work: "Santechniko rankos jungia žarną prie vandens šildytuvo",
    consult: "Santechnikas Klaipėdoje pateikia pasiūlymą klientams",
  },
  servicesHeading: "Kokius santechnikos darbus galite užsakyti",
  servicesLead: "Klaipėdos santechnikai platformoje atlieka tiek smulkius remontus, tiek didelius įrengimo darbus.",
  services: [
    { icon: Wrench, title: "Maišytuvai ir čiaupai", text: "Maišytuvų, čiaupų ir ventilių keitimas bei montavimas." },
    { icon: ShowerHead, title: "WC ir vonios įranga", text: "Klozetų, praustuvų, vonios ir dušo kabinų montavimas." },
    { icon: Droplet, title: "Vamzdynai", text: "Vandentiekio ir nuotekų vamzdynų montavimas ir keitimas." },
    { icon: Waves, title: "Protėkiai ir gedimai", text: "Protėkių paieška ir remontas, užsikimšimų šalinimas." },
    { icon: Flame, title: "Vandens šildytuvai", text: "Boilerių ir vandens kaitintuvų prijungimas bei keitimas." },
    { icon: Gauge, title: "Kanalizacijos valymas", text: "Užsikimšusios kanalizacijos pravalymas ir priežiūra." },
  ],
  pricingHeading: "Kiek kainuoja santechnikas Klaipėdoje",
  offerPrice: "25",
  pricing: [
    { job: "Maišytuvo keitimas", price: "nuo 25 €" },
    { job: "Klozeto / WC montavimas", price: "40–70 €" },
    { job: "Vamzdyno atkarpos keitimas", price: "nuo 30 €" },
    { job: "Protėkio paieška ir remontas", price: "nuo 25 €" },
    { job: "Kanalizacijos pravalymas", price: "30–60 €" },
    { job: "Skubus iškvietimas (tą pačią dieną)", price: "+20–50 %" },
  ],
  faq: [
    {
      q: "Kiek kainuoja santechniko paslaugos Klaipėdoje?",
      a: "Kaina priklauso nuo darbo: maišytuvo keitimas prasideda nuo ~25 €, klozeto montavimas — 40–70 €, protėkio remontas — nuo 25 €, kanalizacijos pravalymas — 30–60 €. Tikslią kainą gausite pasiūlyme, kai aprašysite konkretų darbą. Pasiūlymų gavimas platformoje nemokamas.",
    },
    {
      q: "Per kiek laiko atvyks santechnikas Klaipėdoje?",
      a: "Daugumą darbų uostamiestyje galima suderinti tą pačią arba kitą dieną. Skubiems atvejams (protėkis, užsikimšusi kanalizacija) santechnikai dažnai atvyksta per kelias valandas — pažymėkite, kad darbas skubus.",
    },
    {
      q: "Ką daryti, jei trūko vamzdis ar bėga vanduo?",
      a: "Pirmiausia užsukite vandens sklendę (dažniausiai prie skaitiklio), tada paskelbkite skubią užklausą. Klaipėdos santechnikai mato skubius darbus pirmumo tvarka ir greitai pateikia pasiūlymus.",
    },
    {
      q: "Kokius santechnikos darbus galima užsakyti?",
      a: "Maišytuvų ir čiaupų keitimas, klozetų ir vonios įrangos montavimas, vandentiekio ir nuotekų vamzdynai, protėkių remontas, vandens šildytuvų prijungimas, kanalizacijos valymas. Tiesiog aprašykite savo darbą.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu santechniku.",
    },
  ],
  request: {
    title: "Reikalingas santechnikas Klaipėdoje",
    description:
      "Ieškau patikimo santechniko Klaipėdoje. Reikia atlikti santechnikos darbus bute — pavyzdžiui, maišytuvo ar klozeto keitimas, vamzdyno remontas ar protėkio šalinimas. Prašau pateikti pasiūlymą su orientacine kaina ir galimu atvykimo laiku.",
  },
  finalCtaTitle: "Reikia santechniko Klaipėdoje jau dabar?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
