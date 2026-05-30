import {
  Droplet,
  Wrench,
  ShowerHead,
  Waves,
  Flame,
  Gauge,
} from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/santechnikas-kaune",
  city: "Kaunas",
  categorySlug: "pr-statybos-apdaila--santechnikai-santechnikos-darbai",
  serviceType: "Santechnikos paslaugos",
  seoTitle: "Santechnikas Kaune — gaukite pasiūlymus iš patikimų specialistų",
  seoDescription:
    "Reikia santechniko Kaune? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų santechnikų. Maišytuvai, vamzdynai, protėkiai, kanalizacija, skubus iškvietimas.",
  heroBadge: "Santechnikos paslaugos Kaune",
  heroBadgeIcon: Droplet,
  h1: "Santechnikas Kaune, kuriuo galite pasitikėti",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Kauno santechnikų. Maišytuvų keitimas, vamzdynai, protėkiai ar skubus iškvietimas — palyginkite kainas ir pasirinkite geriausią specialistą.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780120419/landing/santechnikas-kaune/hkfftr9golwcetfcaae5.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780120437/landing/santechnikas-kaune/zxcjib5ukuvzwyhl8eng.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780120457/landing/santechnikas-kaune/rqqzv07qrdac1unnioil.jpg",
  },
  imageAlts: {
    hero: "Santechnikas Kaune taiso vamzdyną po praustuvu modernioje vonioje",
    work: "Santechnikas montuoja chromuotą maišytuvą ant baltos kriauklės Kaune",
    consult: "Santechnikas Kaune aptaria vonios santechnikos darbų planą su klientu",
  },
  servicesHeading: "Kokius santechnikos darbus galite užsakyti",
  servicesLead: "Kauno santechnikai platformoje atlieka tiek smulkius remontus, tiek didelius įrengimo darbus.",
  services: [
    { icon: Wrench, title: "Maišytuvai ir čiaupai", text: "Maišytuvų, čiaupų ir ventilių keitimas bei montavimas." },
    { icon: ShowerHead, title: "WC ir vonios įranga", text: "Klozetų, praustuvų, vonios ir dušo kabinų montavimas." },
    { icon: Droplet, title: "Vamzdynai", text: "Vandentiekio ir nuotekų vamzdynų montavimas ir keitimas." },
    { icon: Waves, title: "Protėkiai ir gedimai", text: "Protėkių paieška ir remontas, užsikimšimų šalinimas." },
    { icon: Flame, title: "Vandens šildytuvai", text: "Boilerių ir vandens kaitintuvų prijungimas bei keitimas." },
    { icon: Gauge, title: "Kanalizacijos valymas", text: "Užsikimšusios kanalizacijos pravalymas ir priežiūra." },
  ],
  pricingHeading: "Kiek kainuoja santechnikas Kaune",
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
      q: "Kiek kainuoja santechniko paslaugos Kaune?",
      a: "Kaina priklauso nuo darbo: maišytuvo keitimas prasideda nuo ~25 €, klozeto montavimas — 40–70 €, protėkio remontas — nuo 25 €, kanalizacijos pravalymas — 30–60 €. Tikslią kainą gausite pasiūlyme, kai aprašysite konkretų darbą. Pasiūlymų gavimas platformoje nemokamas.",
    },
    {
      q: "Per kiek laiko atvyks santechnikas?",
      a: "Daugumą darbų Kaune galima suderinti tą pačią arba kitą dieną. Skubiems atvejams (protėkis, užsikimšusi kanalizacija) santechnikai dažnai atvyksta per kelias valandas — pažymėkite, kad darbas skubus.",
    },
    {
      q: "Ką daryti, jei trūko vamzdis ar bėga vanduo?",
      a: "Pirmiausia užsukite vandens sklendę (dažniausiai prie skaitiklio), tada paskelbkite skubią užklausą. Kauno santechnikai mato skubius darbus pirmumo tvarka ir greitai pateikia pasiūlymus.",
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
    title: "Reikalingas santechnikas Kaune",
    description:
      "Ieškau patikimo santechniko Kaune. Reikia atlikti santechnikos darbus bute — pavyzdžiui, maišytuvo ar klozeto keitimas, vamzdyno remontas ar protėkio šalinimas. Prašau pateikti pasiūlymą su orientacine kaina ir galimu atvykimo laiku.",
  },
  finalCtaTitle: "Reikia santechniko Kaune jau dabar?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
