import { Droplet, Wrench, ShowerHead, Waves, Flame, Gauge } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/santechnikas-siauliuose",
  city: "Šiauliai",
  categorySlug: "pr-statybos-apdaila--santechnikai-santechnikos-darbai",
  serviceType: "Santechnikos paslaugos",
  seoTitle: "Santechnikas Šiauliuose — gaukite pasiūlymus",
  seoDescription:
    "Reikia santechniko Šiauliuose? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų santechnikų. Maišytuvai, vamzdynai, protėkiai, kanalizacija, skubus iškvietimas.",
  heroBadge: "Santechnikos paslaugos Šiauliuose",
  heroBadgeIcon: Droplet,
  h1: "Santechnikas Šiauliuose, kuriuo galite pasitikėti",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Šiaulių santechnikų. Maišytuvų keitimas, vamzdynai, protėkiai ar skubus iškvietimas — palyginkite kainas ir pasirinkite geriausią.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780159066/landing/santechnikas-siauliuose/jsxjz4jpwomtg6drxfz3.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780159096/landing/santechnikas-siauliuose/cq2scu4ljd7ws9shmhw5.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780159115/landing/santechnikas-siauliuose/yiyvlragb9smix6rfzaw.jpg",
  },
  imageAlts: {
    hero: "Santechnikas Šiauliuose montuoja stiklinę dušo kabiną modernioje vonioje",
    work: "Rankos silikonu sandarina dušo padėklo kraštą",
    consult: "Santechnikas aptaria vonios renovacijos planą su klientu",
  },
  servicesHeading: "Kokius santechnikos darbus galite užsakyti",
  servicesLead: "Šiaulių santechnikai platformoje atlieka tiek smulkius remontus, tiek didelius įrengimo darbus.",
  services: [
    { icon: Wrench, title: "Maišytuvai ir čiaupai", text: "Maišytuvų, čiaupų ir ventilių keitimas bei montavimas." },
    { icon: ShowerHead, title: "WC ir vonios įranga", text: "Klozetų, praustuvų, vonios ir dušo kabinų montavimas." },
    { icon: Droplet, title: "Vamzdynai", text: "Vandentiekio ir nuotekų vamzdynų montavimas ir keitimas." },
    { icon: Waves, title: "Protėkiai ir gedimai", text: "Protėkių paieška ir remontas, užsikimšimų šalinimas." },
    { icon: Flame, title: "Vandens šildytuvai", text: "Boilerių ir vandens kaitintuvų prijungimas bei keitimas." },
    { icon: Gauge, title: "Kanalizacijos valymas", text: "Užsikimšusios kanalizacijos pravalymas ir priežiūra." },
  ],
  pricingHeading: "Kiek kainuoja santechnikas Šiauliuose",
  offerPrice: "25",
  pricing: [
    { job: "Maišytuvo keitimas", price: "nuo 25 €" },
    { job: "Klozeto / WC montavimas", price: "40–70 €" },
    { job: "Vamzdyno atkarpos keitimas", price: "nuo 30 €" },
    { job: "Protėkio paieška ir remontas", price: "nuo 25 €" },
    { job: "Kanalizacijos pravalymas", price: "30–60 €" },
    { job: "Skubus iškvietimas (tą pačią dieną)", price: "+20–50 %" },
  ],
  insights: {
    heading: "Naudinga žinoti renkantis santechniką",
    items: [
      { title: "Skubiems atvejams — vandens sklendė", text: "Jei bėga vanduo, pirmiausia užsukite vandens sklendę prie skaitiklio, tada skelbkite skubią užklausą. Tai sustabdo žalą, kol atvyks specialistas." },
      { title: "Kaina už darbą, medžiagos atskirai", text: "Dažnai pateikiama darbų kaina, o maišytuvus, klozetus ar vamzdžius perka klientas pagal santechniko rekomendaciją." },
      { title: "Senų vamzdynų niuansai", text: "Senuose namuose metaliniai vamzdžiai būna surūdiję — keičiant vieną atkarpą gali paaiškėti, kad reikia daugiau. Verta įvertinti būklę iš anksto." },
      { title: "Sandarumo patikra", text: "Po montavimo geras santechnikas patikrina jungtis dėl protėkių. Paklauskite, ar atliekama sandarumo patikra prieš baigiant darbą." },
    ],
  },
  faq: [
    {
      q: "Kiek kainuoja santechniko paslaugos Šiauliuose?",
      a: "Maišytuvo keitimas — nuo ~25 €, klozeto montavimas — 40–70 €, protėkio remontas — nuo 25 €, kanalizacijos pravalymas — 30–60 €. Tikslią kainą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Per kiek laiko atvyks santechnikas Šiauliuose?",
      a: "Daugumą darbų galima suderinti tą pačią arba kitą dieną. Skubiems atvejams santechnikai dažnai atvyksta per kelias valandas — pažymėkite skubą.",
    },
    {
      q: "Ką daryti, jei trūko vamzdis ar bėga vanduo?",
      a: "Pirmiausia užsukite vandens sklendę, tada paskelbkite skubią užklausą. Santechnikai mato skubius darbus pirmumo tvarka ir greitai pateikia pasiūlymus.",
    },
    {
      q: "Kokius santechnikos darbus galima užsakyti?",
      a: "Maišytuvų ir čiaupų keitimas, klozetų ir vonios įrangos montavimas, vandentiekio ir nuotekų vamzdynai, protėkių remontas, vandens šildytuvų prijungimas, kanalizacijos valymas.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu santechniku.",
    },
  ],
  request: {
    title: "Reikalingas santechnikas Šiauliuose",
    description:
      "Ieškau patikimo santechniko Šiauliuose. Reikia atlikti santechnikos darbus bute — pavyzdžiui, maišytuvo ar klozeto keitimas, vamzdyno remontas ar protėkio šalinimas. Prašau pateikti pasiūlymą su orientacine kaina ir galimu atvykimo laiku.",
  },
  finalCtaTitle: "Reikia santechniko Šiauliuose?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
