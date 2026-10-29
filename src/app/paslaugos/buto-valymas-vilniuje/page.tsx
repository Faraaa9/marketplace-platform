import { Sparkles, Home, Building2, Wind, Droplets, Brush } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/buto-valymas-vilniuje",
  city: "Vilnius",
  categorySlug: "pr-buitines-paslaugos--valymo-paslaugos",
  serviceType: "Valymo paslaugos",
  seoTitle: "Buto valymas Vilniuje — gaukite pasiūlymus ir kainas",
  seoDescription:
    "Reikia išvalyti butą Vilniuje? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų valytojų. Generalinis, po remonto, reguliarus butų ir namų valymas.",
  heroBadge: "Valymo paslaugos Vilniuje",
  heroBadgeIcon: Sparkles,
  h1: "Buto valymas Vilniuje — švara be rūpesčių",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Vilniaus valytojų. Generalinis, po remonto ar reguliarus valymas — palyginkite kainas ir pasirinkite geriausią specialistą.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780158611/landing/buto-valymas-vilniuje/cn1gwf2us7n5agrfai48.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780158637/landing/buto-valymas-vilniuje/zsrfgfvdaiy9hqia1yxx.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780158657/landing/buto-valymas-vilniuje/wplun9ck4xe3yyhwewa9.jpg",
  },
  imageAlts: {
    hero: "Profesionali valytoja tvarko ir siurbia šviesų modernų butą Vilniuje",
    work: "Ranka su pirštine valo virtuvės paviršių mikropluošto šluoste",
    consult: "Draugiška valytoja su priemonėmis tvarkingame šviesiame kambaryje",
  },
  servicesHeading: "Kokį valymą galite užsakyti",
  servicesLead: "Vilniaus valytojai platformoje valo butus, namus ir komercines patalpas.",
  services: [
    { icon: Home, title: "Generalinis valymas", text: "Nuodugnus viso būsto valymas iki smulkmenų." },
    { icon: Brush, title: "Po remonto", text: "Statybinių dulkių, dažų ir nešvarumų šalinimas po remonto." },
    { icon: Sparkles, title: "Reguliarus valymas", text: "Periodinis būsto tvarkymas pagal grafiką." },
    { icon: Droplets, title: "Virtuvė ir vonia", text: "Riebalų, kalkių ir apnašų šalinimas drėgnose zonose." },
    { icon: Wind, title: "Langai ir baldai", text: "Langų, minkštų baldų ir kilimų valymas pagal poreikį." },
    { icon: Building2, title: "Biurai ir patalpos", text: "Komercinių patalpų valymas vienkartinis ar reguliarus." },
  ],
  pricingHeading: "Kiek kainuoja buto valymas Vilniuje",
  pricing: [
    { job: "Reguliarus valymas (m²)", price: "nuo 3 €" },
    { job: "Generalinis valymas (m²)", price: "nuo 5 €" },
    { job: "Po remonto (m²)", price: "nuo 6 €" },
    { job: "1 kambario butas (generalinis)", price: "nuo 50 €" },
    { job: "Minkštų baldų valymas (vnt.)", price: "nuo 25 €" },
    { job: "Langų valymas (vnt.)", price: "nuo 4 €" },
  ],
  insights: {
    heading: "Naudinga žinoti užsakant valymą",
    items: [
      { title: "Generalinis ar reguliarus", text: "Generalinis valymas nuodugnesnis (po jo lengviau palaikyti reguliariu). Jei tvarkotės reguliariai, pakanka palaikomojo valymo — pigiau. Pasakykite, ko tikitės." },
      { title: "Po remonto — atskira kategorija", text: "Statybinės dulkės skverbiasi visur ir reikalauja kelių valymo etapų bei specialių priemonių, todėl kainuoja daugiau nei įprastas valymas." },
      { title: "Priemonės — kieno", text: "Patikslinkite, ar valytojas atsiveža priemones ir įrangą, ar naudoja jūsų. Daugelis profesionalų turi savo, bet alergiškiems verta aptarti, kokius vaiklius naudoja." },
      { title: "Kaina už m² ar už darbą", text: "Vieni skaičiuoja už m², kiti — fiksuotai už butą. Nurodykite plotą ir kambarių skaičių, kad pasiūlymas būtų tikslus." },
    ],
  },
  faq: [
    {
      q: "Kiek kainuoja buto valymas Vilniuje?",
      a: "Reguliarus valymas — nuo ~3 €/m², generalinis — nuo 5 €/m², po remonto — nuo 6 €/m². 1 kambario buto generalinis valymas prasideda nuo ~50 €. Tikslią kainą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Ar valytojas atsiveža priemones?",
      a: "Dauguma profesionalų atvyksta su savo priemonėmis ir įranga. Jei turite pageidavimų (pvz. bekvapės ar ekologiškos priemonės), pažymėkite užklausoje.",
    },
    {
      q: "Kuo skiriasi generalinis ir reguliarus valymas?",
      a: "Generalinis — nuodugnus valymas iki smulkmenų (už spintelių, plytelių siūlės, buitinė technika). Reguliarus — palaikomasis tvarkymas. Po generalinio švarą lengviau palaikyti reguliariu.",
    },
    {
      q: "Ar galima užsakyti valymą po remonto?",
      a: "Taip — tai populiari paslauga. Statybinės dulkės valomos etapais su specialiomis priemonėmis. Pažymėkite, kad valymas po remonto, kad meistras tinkamai pasiruoštų.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu specialistu.",
    },
  ],
  request: {
    title: "Reikalingas buto valymas Vilniuje",
    description:
      "Ieškau valytojo Vilniuje. Reikia išvalyti butą (nurodysiu plotą / kambarių skaičių) — generalinis, po remonto ar reguliarus valymas. Prašau pateikti pasiūlymą su orientacine kaina ir galimu laiku.",
  },
  finalCtaTitle: "Reikia išvalyti butą Vilniuje?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
