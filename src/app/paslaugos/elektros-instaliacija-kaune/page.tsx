import { Cable, Plug, Gauge, Lightbulb, FileText, ShieldCheck } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/elektros-instaliacija-kaune",
  city: "Kaunas",
  categorySlug: "pr-statybos-apdaila--elektrikai-elektros-darbai--elektros-instaliacija",
  serviceType: "Elektros instaliacijos paslaugos",
  seoTitle: "Elektros instaliacija Kaune — gaukite pasiūlymus",
  seoDescription:
    "Reikia elektros instaliacijos Kaune? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų elektrikų. Naujo būsto instaliacija, renovacija, skydinės, projektai.",
  heroBadge: "Elektros instaliacija Kaune",
  heroBadgeIcon: Cable,
  h1: "Elektros instaliacija Kaune — saugiai ir pagal projektą",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Kauno elektrikų. Naujo būsto ar renovuojamo objekto elektros instaliacija su skydine ir dokumentais — palyginkite kainas ir pasirinkite geriausią.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780140020/landing/elektros-instaliacija-kaune/da2p6eynlgxsio7udxvq.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780140051/landing/elektros-instaliacija-kaune/vdzsjkf1fgyrhjqxpyju.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780140078/landing/elektros-instaliacija-kaune/jskexw67cwinivqh9ifv.jpg",
  },
  imageAlts: {
    hero: "Elektrikas veda kabelius gofroje renovuojamo buto sienose Kaune",
    work: "Rankos jungia spalvotus kabelius į sieninę paskirstymo dėžutę",
    consult: "Elektrikas žymi rozečių vietas ant sienos aptardamas planą su klientu",
  },
  servicesHeading: "Kokius instaliacijos darbus galite užsakyti",
  servicesLead: "Kauno elektrikai platformoje atlieka pilną ir dalinę elektros instaliaciją.",
  services: [
    { icon: Cable, title: "Pilna instaliacija", text: "Naujo būsto ar namo elektros instaliacija nuo skydinės iki taškų." },
    { icon: Plug, title: "Dalinė / renovacija", text: "Senos instaliacijos keitimas, papildomi taškai renovuojant." },
    { icon: Gauge, title: "Skydinės surinkimas", text: "Skydinės komplektavimas, automatai, įžeminimas, RCD." },
    { icon: Lightbulb, title: "Apšvietimo linijos", text: "Apšvietimo grupės, valdikliai, paslėptas LED apšvietimas." },
    { icon: FileText, title: "Projektas ir schema", text: "Instaliacijos projektavimas ir vykdomoji dokumentacija." },
    { icon: ShieldCheck, title: "Matavimai ir aktai", text: "Varžų matavimai ir saugą patvirtinantys protokolai." },
  ],
  pricingHeading: "Kiek kainuoja elektros instaliacija Kaune",
  pricing: [
    { job: "Elektros taškas (rozetė/jungiklis su laidu)", price: "25–45 €" },
    { job: "Buto instaliacija (1–2 kambariai)", price: "nuo 600 €" },
    { job: "Namo instaliacija", price: "nuo 1500 €" },
    { job: "Skydinės surinkimas", price: "nuo 150 €" },
    { job: "Varžų matavimai su aktu", price: "nuo 60 €" },
    { job: "Instaliacijos projektas", price: "derinama" },
  ],
  insights: {
    heading: "Ką svarbu žinoti apie elektros instaliaciją",
    items: [
      { title: "Skaičiuojama dažnai už tašką", text: "Instaliacijos kaina dažnai vertinama pagal taškų (rozečių, jungiklių, šviestuvų) skaičių. Iš anksto apgalvokite, kiek ir kur jų norite — gausite tikslesnį pasiūlymą ir išvengsite priedų vėliau." },
      { title: "Skydinė ir apsaugos", text: "Šiuolaikinė skydinė turi turėti automatinius išjungiklius ir RCD (nuotėkio relę) saugumui. Paklauskite, ar į kainą įeina pilnas skydinės komplektavimas." },
      { title: "Slepiama instaliacija — laiku", text: "Kabeliai vedami štrobose prieš tinkavimą ir glaistymą, todėl instaliaciją reikia derinti su apdailos eiga. Per vėlu — teks ardyti sienas." },
      { title: "Matavimai ir dokumentai", text: "Naujai instaliacijai reikalingi varžų matavimai ir aktai — jų prašo ir tikrinančios institucijos. Patikslinkite, ar meistras juos atlieka." },
    ],
  },
  faq: [
    {
      q: "Kiek kainuoja elektros instaliacija Kaune?",
      a: "Vieno taško įrengimas — 25–45 €, buto instaliacija prasideda nuo ~600 €, namo — nuo 1500 €. Galutinę kainą lemia taškų skaičius, skydinė ir medžiagos. Tikslią sąmatą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Ar į kainą įeina medžiagos?",
      a: "Dažnai pateikiama darbų kaina, o kabelius, automatus ir dėžutes perka užsakovas pagal meistro sąrašą. Tai aiškiai nurodoma pasiūlyme.",
    },
    {
      q: "Ar gausiu varžų matavimų aktą?",
      a: "Taip — kokybiškai instaliacijai atliekami varžų matavimai ir išrašomi aktai, patvirtinantys saugą. Pažymėkite, kad reikia dokumentų.",
    },
    {
      q: "Kada planuoti instaliaciją renovacijoje?",
      a: "Elektros instaliacija atliekama prieš sienų apdailą (tinkavimą, glaistymą), nes kabeliai slepiami štrobose. Derinkite ją su bendra remonto eiga.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu elektriku.",
    },
  ],
  request: {
    title: "Reikalinga elektros instaliacija Kaune",
    description:
      "Ieškau elektriko elektros instaliacijai Kaune. Reikia atlikti būsto elektros instaliaciją (pilną ar dalinę) su skydine. Prašau pateikti pasiūlymą su orientacine kaina ir galimu darbų laiku.",
  },
  finalCtaTitle: "Reikia elektros instaliacijos Kaune?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
