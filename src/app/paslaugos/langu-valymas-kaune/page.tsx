import { Sparkles, Building2, Home, Wind, Droplets, Sun } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/langu-valymas-kaune",
  city: "Kaunas",
  categorySlug: "pr-buitines-paslaugos--valymo-paslaugos--langu-valymas",
  serviceType: "Langų valymo paslaugos",
  seoTitle: "Langų valymas Kaune — gaukite pasiūlymus ir kainas",
  seoDescription:
    "Reikia nuvalyti langus Kaune? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų specialistų. Butų, namų, balkonų ir biurų langų valymas be dryžių.",
  heroBadge: "Langų valymas Kaune",
  heroBadgeIcon: Sparkles,
  h1: "Langų valymas Kaune — skaidrūs langai be dryžių",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Kauno langų valytojų. Butai, namai, balkonai ar biurai — palyginkite kainas ir pasirinkite geriausią specialistą.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780126317/landing/langu-valymas-kaune/qzul5qasf922mouq2e3w.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780126336/landing/langu-valymas-kaune/qxyop18rxcwxl2a4wtxy.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780126361/landing/langu-valymas-kaune/erh65vzgattg2rtpr6ec.jpg",
  },
  imageAlts: {
    hero: "Specialistas valo didelį langą valytuvu šviesiame bute Kaune",
    work: "Ranka braukia valytuvą per muiluotą stiklą",
    consult: "Langų valymo specialistas su įranga šviesiame kambaryje",
  },
  servicesHeading: "Kokius langų valymo darbus galite užsakyti",
  servicesLead: "Kauno specialistai platformoje valo langus butuose, namuose ir komercinėse patalpose.",
  services: [
    { icon: Home, title: "Butų ir namų langai", text: "Vidinė ir išorinė langų pusė, rėmai ir palangės." },
    { icon: Sun, title: "Balkonų stiklinimas", text: "Balkono ir terasos stiklų valymas iš abiejų pusių." },
    { icon: Building2, title: "Biurų ir vitrinų langai", text: "Komercinių patalpų, vitrinų ir stiklinių fasadų valymas." },
    { icon: Wind, title: "Po remonto", text: "Dažų, klijų ir statybinių dulkių šalinimas nuo stiklų." },
    { icon: Droplets, title: "Tarpsezoninis valymas", text: "Pavasario ir rudens generalinis langų valymas." },
    { icon: Sparkles, title: "Tinkleliai ir žaliuzės", text: "Apsauginių tinklelių ir žaliuzių valymas kartu su langais." },
  ],
  pricingHeading: "Kiek kainuoja langų valymas Kaune",
  pricing: [
    { job: "Lango valymas (1 vnt., abi pusės)", price: "nuo 4 €" },
    { job: "Buto langų valymas (1–2 kambariai)", price: "nuo 30 €" },
    { job: "Balkono stiklų valymas", price: "nuo 20 €" },
    { job: "Po remonto (su priemaišomis)", price: "+30–50 %" },
    { job: "Biuro / vitrinų valymas (m²)", price: "nuo 2 €" },
    { job: "Tinklelių valymas (vnt.)", price: "nuo 2 €" },
  ],
  insights: {
    heading: "Naudinga žinoti prieš užsakant langų valymą",
    items: [
      { title: "Kaina dažnai už langą, ne už valandą", text: "Daugelis specialistų skaičiuoja už lango vienetą arba m². Iš anksto suskaičiuokite langus ir nurodykite jų tipą (varstomi, dideli stikliniai) — gausite tikslesnį pasiūlymą." },
      { title: "Aukštis ir pasiekiamumas", text: "Sunkiai pasiekiamiems ar aukštai esantiems langams reikia teleskopinių kočėlų ar pramoninių alpinistų — tai brangiau. Paminėkite aukštą ir ar langai atsidaro." },
      { title: "Po remonto — atskira paslauga", text: "Dažų taškai, silikonas ar statybinės dulkės valomi atsargiai, kad nesubraižytų stiklo. Tai užtrunka ilgiau ir kainuoja daugiau nei įprastas valymas." },
      { title: "Geriausia debesuotą dieną", text: "Tiesioginiuose saulės spinduliuose valiklis greitai džiūsta ir palieka dryžius. Specialistai dažnai renkasi debesuotą orą geriausiam rezultatui." },
    ],
  },
  faq: [
    {
      q: "Kiek kainuoja langų valymas Kaune?",
      a: "Vieno lango valymas (abi pusės) prasideda nuo ~4 €, buto langų komplektas — nuo 30 €. Po remonto ar sunkiai pasiekiamiems langams taikomi priedai. Tikslią kainą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Ar valoma ir išorinė langų pusė aukštuose?",
      a: "Taip, bet aukštai esantiems langams gali prireikti specialios įrangos (teleskopinių kočėlų ar alpinistų). Nurodykite aukštą — specialistas pasiūlys tinkamą sprendimą ir kainą.",
    },
    {
      q: "Ar naudojamos saugios priemonės?",
      a: "Profesionalai naudoja stiklui skirtus valiklius ir minkštas gumas, kurios nepalieka dryžių ir nesubraižo. Jei langai su specialia danga, paminėkite tai iš anksto.",
    },
    {
      q: "Kaip dažnai verta valyti langus?",
      a: "Butuose dažniausiai pakanka 2 kartų per metus (pavasarį ir rudenį). Prie judrių gatvių ar po statybų — dažniau. Specialistas patars pagal jūsų situaciją.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu specialistu.",
    },
  ],
  request: {
    title: "Reikalingas langų valymas Kaune",
    description:
      "Ieškau specialisto langų valymui Kaune. Reikia nuvalyti langus (pvz. bute, name ar balkone), iš abiejų pusių. Prašau pateikti pasiūlymą su orientacine kaina ir galimu atvykimo laiku.",
  },
  finalCtaTitle: "Reikia nuvalyti langus Kaune?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
