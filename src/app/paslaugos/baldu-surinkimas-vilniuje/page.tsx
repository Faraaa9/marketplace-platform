import { Wrench, Package, Sofa, Hammer, Truck, Boxes } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/baldu-surinkimas-vilniuje",
  city: "Vilnius",
  categorySlug: "pr-buitines-paslaugos--meistrai-i-namus--baldu-surinkimas-isardymas",
  serviceType: "Baldų surinkimo paslaugos",
  seoTitle: "Baldų surinkimas Vilniuje — greitai ir tvarkingai",
  seoDescription:
    "Reikia surinkti baldus Vilniuje? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų meistrų. IKEA, spintų, virtuvių surinkimas ir tvirtinimas prie sienos.",
  heroBadge: "Baldų surinkimas Vilniuje",
  heroBadgeIcon: Sofa,
  h1: "Baldų surinkimas Vilniuje — surenka už jus",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Vilniaus meistrų. IKEA baldai, spintos, virtuvės ar lovos — palyginkite kainas ir pasirinkite geriausią, o baldus surinks už jus.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780127050/landing/baldu-surinkimas-vilniuje/w4emphv6rau0upf7ua2r.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780127081/landing/baldu-surinkimas-vilniuje/zndqqrxvarnva3vckr5u.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780127100/landing/baldu-surinkimas-vilniuje/xlgwy6vc1fhnb8bmvllq.jpg",
  },
  imageAlts: {
    hero: "Meistras surenka baltą spintą šešiakampiu raktu šviesiame Vilniaus miegamajame",
    work: "Rankos suka baldo ekscentrinį varžtą atsuktuvu",
    consult: "Meistras su gręžtuvu prie surinktos lentynos šviesiame kambaryje",
  },
  servicesHeading: "Kokius baldų surinkimo darbus galite užsakyti",
  servicesLead: "Vilniaus meistrai platformoje surenka įvairius baldus ir pritvirtina juos saugiai.",
  services: [
    { icon: Package, title: "IKEA ir flat-pack baldai", text: "IKEA, JYSK ir kitų supakuotų baldų surinkimas pagal instrukciją." },
    { icon: Boxes, title: "Spintos ir komodos", text: "Spintų, komodų, lentynų surinkimas ir durelių reguliavimas." },
    { icon: Sofa, title: "Sofos ir lovos", text: "Minkštų baldų, lovų ir čiužinių rėmų surinkimas." },
    { icon: Wrench, title: "Virtuvės baldai", text: "Virtuvės komplektų surinkimas ir pakabinimas." },
    { icon: Hammer, title: "Tvirtinimas prie sienos", text: "Aukštų baldų pritvirtinimas, kad neapvirstų — saugu vaikams." },
    { icon: Truck, title: "Išardymas perkraustant", text: "Baldų išardymas ir surinkimas naujoje vietoje." },
  ],
  pricingHeading: "Kiek kainuoja baldų surinkimas Vilniuje",
  pricing: [
    { job: "Spintos surinkimas (vnt.)", price: "nuo 25 €" },
    { job: "Komodos / lentynos surinkimas", price: "nuo 15 €" },
    { job: "Lovos surinkimas", price: "nuo 20 €" },
    { job: "Virtuvės komplektas (m)", price: "nuo 30 €" },
    { job: "Tvirtinimas prie sienos (vnt.)", price: "nuo 5 €" },
    { job: "Iškvietimas (minimali kaina)", price: "nuo 20 €" },
  ],
  insights: {
    heading: "Naudinga žinoti prieš užsakant baldų surinkimą",
    items: [
      { title: "Turėkite visas detales ir instrukciją", text: "Prieš atvykstant meistrui įsitikinkite, kad turite visas pakuotes, tvirtinimo detales ir instrukciją. Trūkstama detalė gali sustabdyti darbą — pravartu patikrinti iš anksto." },
      { title: "Aukštus baldus būtina tvirtinti", text: "Spintos ir lentynos turi būti pritvirtintos prie sienos, kad neapvirstų (ypač jei namuose vaikų). Paklauskite, ar tvirtinimas įskaičiuotas, ir nurodykite sienos tipą." },
      { title: "Kaina dažnai už vienetą", text: "Daugelis meistrų skaičiuoja už baldą arba taiko minimalų iškvietimo mokestį. Jei baldų keli — nurodykite kiekį ir modelius, gausite tikslesnį pasiūlymą." },
      { title: "Sienos tipas svarbus tvirtinimui", text: "Gipskartonio, betono ar plytų sienai reikia skirtingų kaiščių. Paminėkite sienos tipą, kad meistras turėtų tinkamus tvirtinimus." },
    ],
  },
  faq: [
    {
      q: "Kiek kainuoja baldų surinkimas Vilniuje?",
      a: "Spintos surinkimas prasideda nuo ~25 €, komodos ar lentynos — nuo 15 €, lovos — nuo 20 €. Dažnai taikomas minimalus iškvietimo mokestis. Tikslią kainą gausite pasiūlyme, kai nurodysite baldus. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Ar meistras turi savo įrankius?",
      a: "Taip, profesionalūs meistrai atvyksta su savo įrankiais (gręžtuvais, atsuktuvais). Jums tereikia turėti baldų pakuotes ir detales.",
    },
    {
      q: "Ar surenkate IKEA baldus?",
      a: "Taip — IKEA ir kitų prekių ženklų flat-pack baldai yra dažniausias užsakymas. Nurodykite modelį (pvz. PAX, MALM), kad meistras įvertintų apimtį.",
    },
    {
      q: "Ar galite ir pritvirtinti baldus prie sienos?",
      a: "Taip, aukšti baldai tvirtinami prie sienos saugumui. Pažymėkite, kad reikia tvirtinimo, ir nurodykite sienos tipą (gipskartonis, betonas, plyta).",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu meistru.",
    },
  ],
  request: {
    title: "Reikalingas baldų surinkimas Vilniuje",
    description:
      "Ieškau meistro baldų surinkimui Vilniuje. Reikia surinkti baldus (pvz. spintą, komodą ar lovą), pageidautina su pritvirtinimu prie sienos. Prašau pateikti pasiūlymą su orientacine kaina ir galimu atvykimo laiku.",
  },
  finalCtaTitle: "Reikia surinkti baldus Vilniuje?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
