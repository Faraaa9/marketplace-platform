import { Waves, Wrench, Gauge, Droplet, AlertTriangle, Search } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/kanalizacijos-valymas-kaune",
  city: "Kaunas",
  categorySlug: "pr-statybos-apdaila--santechnikai-santechnikos-darbai--kanalizacijos-valymas",
  serviceType: "Kanalizacijos valymo paslaugos",
  seoTitle: "Kanalizacijos valymas Kaune — greitas iškvietimas",
  seoDescription:
    "Užsikimšo kanalizacija Kaune? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų specialistų. Vamzdžių pravalymas, hidrodinaminis plovimas, skubus iškvietimas.",
  heroBadge: "Kanalizacijos valymas Kaune",
  heroBadgeIcon: Waves,
  h1: "Kanalizacijos valymas Kaune — greitai ir švariai",
  heroLead:
    "Užsikimšo vamzdis ar kanalizacija? Aprašykite problemą ir nemokamai gaukite pasiūlymus iš patikrintų Kauno specialistų. Mechaninis pravalymas, hidrodinaminis plovimas ar skubus iškvietimas — palyginkite ir pasirinkite.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780123920/landing/kanalizacijos-valymas-kaune/tgcokp5jjquwjxojxmjz.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780123942/landing/kanalizacijos-valymas-kaune/bxz5fywiqcai8xykvxep.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780123973/landing/kanalizacijos-valymas-kaune/cpzyrvxykzyfspcyasm5.jpg",
  },
  imageAlts: {
    hero: "Specialistas valo kanalizaciją spiraline mašina Kaune",
    work: "Rankos leidžia plieninį trosą į vamzdį",
    consult: "Kanalizacijos specialistas aiškina sprendimą klientui",
  },
  servicesHeading: "Kokius kanalizacijos darbus galite užsakyti",
  servicesLead: "Kauno specialistai platformoje valo vamzdynus, šalina užsikimšimus ir prižiūri kanalizaciją.",
  services: [
    { icon: Wrench, title: "Mechaninis pravalymas", text: "Vamzdžių valymas spiraline mašina ir trosu." },
    { icon: Droplet, title: "Hidrodinaminis plovimas", text: "Aukšto slėgio vandens srove išplaunami nuosėdos ir riebalai." },
    { icon: AlertTriangle, title: "Skubus užsikimšimas", text: "Greitas iškvietimas, kai nuteka vanduo ar kvepia kanalizacija." },
    { icon: Search, title: "Vaizdo inspekcija", text: "Vamzdyno apžiūra kamera gedimo vietai nustatyti." },
    { icon: Gauge, title: "Riebalų gaudyklės", text: "Riebalų gaudyklių ir šulinių valymas, priežiūra." },
    { icon: Waves, title: "Profilaktinis valymas", text: "Reguliari priežiūra, kad vamzdynas neužsikimštų." },
  ],
  pricingHeading: "Kiek kainuoja kanalizacijos valymas Kaune",
  offerPrice: "30",
  pricing: [
    { job: "Vamzdžio pravalymas (spiralė)", price: "nuo 30 €" },
    { job: "Hidrodinaminis plovimas", price: "nuo 50 €" },
    { job: "Vaizdo inspekcija kamera", price: "nuo 40 €" },
    { job: "Riebalų gaudyklės valymas", price: "nuo 40 €" },
    { job: "Profilaktinis valymas", price: "nuo 35 €" },
    { job: "Skubus iškvietimas (tą pačią dieną)", price: "+20–50 %" },
  ],
  faq: [
    {
      q: "Kiek kainuoja kanalizacijos valymas Kaune?",
      a: "Mechaninis vamzdžio pravalymas prasideda nuo ~30 €, hidrodinaminis plovimas — nuo 50 €, vaizdo inspekcija — nuo 40 €. Galutinę kainą lemia užsikimšimo vieta ir sudėtingumas. Tikslią kainą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Per kiek laiko atvyks specialistas?",
      a: "Skubius užsikimšimus Kaune dažnai išsprendžia tą pačią dieną, neretai per kelias valandas. Paskelbdami užklausą pažymėkite, kad atvejis skubus — specialistai jį matys pirmumo tvarka.",
    },
    {
      q: "Ką daryti, kol atvyks specialistas?",
      a: "Nustokite naudoti užsikimšusį vamzdyną (neleiskite vandens), kad neperpiltumėte. Stiprių chemikalų pilti nerekomenduojama — jie gali pakenkti vamzdžiams ir apsunkinti darbą.",
    },
    {
      q: "Ar galima išvengti pasikartojančių užsikimšimų?",
      a: "Taip — padeda profilaktinis valymas ir vaizdo inspekcija, kuri parodo, ar nėra nuolydžio defektų, įaugusių šaknų ar nuosėdų. Specialistas patars dėl tinkamo grafiko.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu specialistu.",
    },
  ],
  request: {
    title: "Reikalingas kanalizacijos valymas Kaune",
    description:
      "Ieškau specialisto kanalizacijos valymui Kaune. Užsikimšo vamzdis / kanalizacija (pvz. virtuvėje, vonioje ar lauko šulinyje). Prašau pateikti pasiūlymą su orientacine kaina ir galimu atvykimo laiku.",
  },
  finalCtaTitle: "Užsikimšo kanalizacija Kaune?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
