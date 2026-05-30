import { DoorOpen, DoorClosed, Ruler, Hammer, Lock, Square } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/duru-montavimas-vilniuje",
  city: "Vilnius",
  categorySlug: "pr-statybos-apdaila--langai-durys-gamyba-montavimas--duru-montavimas",
  serviceType: "Durų montavimo paslaugos",
  seoTitle: "Durų montavimas Vilniuje — gaukite pasiūlymus",
  seoDescription:
    "Reikia sumontuoti duris Vilniuje? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų meistrų. Vidaus, lauko, šarvuotų durų montavimas ir reguliavimas.",
  heroBadge: "Durų montavimas Vilniuje",
  heroBadgeIcon: DoorOpen,
  h1: "Durų montavimas Vilniuje — tvarkingai ir tiksliai",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Vilniaus durų meistrų. Vidaus, lauko ar šarvuotų durų montavimas su tikslia apdaila — palyginkite kainas ir pasirinkite geriausią.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780140865/landing/duru-montavimas-vilniuje/sdhd3krrc9q1cs1q7rmf.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780140885/landing/duru-montavimas-vilniuje/d4mrlrru6u4puuqzeoed.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780140905/landing/duru-montavimas-vilniuje/r4gsfhqksegmna3bnpsq.jpg",
  },
  imageAlts: {
    hero: "Staliaus meistras montuoja tamsias lauko įėjimo duris namo Vilniuje",
    work: "Rankos montuoja nerūdijančio plieno spyną į įėjimo duris",
    consult: "Durų meistras rodo įėjimo durų apdailas ir rankenas klientui",
  },
  servicesHeading: "Kokius durų darbus galite užsakyti",
  servicesLead: "Vilniaus meistrai platformoje montuoja ir reguliuoja vidaus bei lauko duris.",
  services: [
    { icon: DoorClosed, title: "Vidaus durys", text: "Vidaus durų su stakta montavimas ir tikslus reguliavimas." },
    { icon: Lock, title: "Lauko ir šarvuotos durys", text: "Įėjimo ir šarvuotų durų montavimas, sandarinimas." },
    { icon: Square, title: "Slankiojančios durys", text: "Stumdomų ir slepiamų į sieną durų sistemos." },
    { icon: Ruler, title: "Angokraščiai ir apvadai", text: "Angos paruošimas, apvadų ir palangių montavimas." },
    { icon: Hammer, title: "Reguliavimas ir remontas", text: "Krintančių, girgždančių durų reguliavimas, vyrių keitimas." },
    { icon: DoorOpen, title: "Senų durų keitimas", text: "Senų durų demontavimas ir naujų montavimas." },
  ],
  pricingHeading: "Kiek kainuoja durų montavimas Vilniuje",
  offerPrice: "40",
  pricing: [
    { job: "Vidaus durų montavimas (vnt.)", price: "nuo 45 €" },
    { job: "Su staktos surinkimu (vnt.)", price: "nuo 60 €" },
    { job: "Lauko durų montavimas", price: "nuo 80 €" },
    { job: "Šarvuotų durų montavimas", price: "nuo 70 €" },
    { job: "Durų reguliavimas / remontas", price: "nuo 20 €" },
    { job: "Senų durų demontavimas", price: "nuo 10 €" },
  ],
  insights: {
    heading: "Į ką atkreipti dėmesį montuojant duris",
    items: [
      { title: "Tikslus angos matavimas", text: "Durys užsakomos pagal angos matmenis, todėl tikslus matavimas — kritiškai svarbus. Daug meistrų atvyksta pamatuoti prieš užsakymą. Geriau pamatuoti du kartus, nei perdaryti angą." },
      { title: "Staktos surinkimas ir putos", text: "Kokybiškam montavimui svarbu lygiai sustatyta stakta ir tolygus putų sluoksnis — kitaip durys kris arba blogai užsidarys. Paklauskite, ar įskaičiuotas reguliavimas." },
      { title: "Garso ir šilumos sandarumas", text: "Miegamojo ar buto įėjimo durims svarbu tarpinės ir slenkstis. Lauko durims — termoizoliacija. Pasakykite, ko tikitės iš sandarumo." },
      { title: "Apdaila po montavimo", text: "Patikslinkite, ar į kainą įeina angokraščių ir apvadų apdaila — neretai tai skaičiuojama atskirai, o be jos durys atrodo nebaigtos." },
    ],
  },
  faq: [
    {
      q: "Kiek kainuoja durų montavimas Vilniuje?",
      a: "Vidaus durų montavimas prasideda nuo ~45 €/vnt. (su staktos surinkimu — nuo 60 €), lauko ir šarvuotų durų — nuo 70–80 €. Galutinę kainą lemia durų tipas ir angos paruošimas. Tikslią kainą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Ar meistras atvyksta pamatuoti?",
      a: "Dažnai taip — tikslus angos matavimas svarbus, kad durys tiktų. Kai kurie meistrai matuoja nemokamai prieš užsakymą. Pažymėkite, jei reikia matavimo.",
    },
    {
      q: "Ar į kainą įeina durys?",
      a: "Paprastai pateikiama tik montavimo kaina, o duris perka užsakovas. Kai kurie meistrai gali ir parūpinti duris — tai aptariama pasiūlyme.",
    },
    {
      q: "Ką daryti, jei durys krenta ar blogai užsidaro?",
      a: "Tai dažnai išsprendžiama vyrių ir staktos reguliavimu — atskira nebrangi paslauga. Aprašykite problemą ir meistras pasiūlys sprendimą.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu meistru.",
    },
  ],
  request: {
    title: "Reikalingas durų montavimas Vilniuje",
    description:
      "Ieškau patikimo meistro durų montavimui Vilniuje. Reikia sumontuoti duris (pvz. vidaus, lauko ar šarvuotas) su staktos surinkimu ir reguliavimu. Prašau pateikti pasiūlymą su orientacine kaina ir galimu darbų laiku.",
  },
  finalCtaTitle: "Reikia sumontuoti duris Vilniuje?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
