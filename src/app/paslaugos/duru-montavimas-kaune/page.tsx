import { DoorOpen, DoorClosed, Ruler, Hammer, Lock, Square } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/duru-montavimas-kaune",
  city: "Kaunas",
  categorySlug: "pr-statybos-apdaila--langai-durys-gamyba-montavimas--duru-montavimas",
  serviceType: "Durų montavimo paslaugos",
  seoTitle: "Durų montavimas Kaune — gaukite pasiūlymus ir kainas",
  seoDescription:
    "Reikia sumontuoti duris Kaune? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų meistrų. Vidaus, lauko, šarvuotų durų montavimas ir reguliavimas.",
  heroBadge: "Durų montavimas Kaune",
  heroBadgeIcon: DoorOpen,
  h1: "Durų montavimas Kaune — tvarkingai ir tiksliai",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Kauno durų meistrų. Vidaus, lauko ar šarvuotų durų montavimas su tikslia apdaila — palyginkite kainas ir pasirinkite geriausią.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780126889/landing/duru-montavimas-kaune/frhk7h4gtgb20axxyfvh.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780126909/landing/duru-montavimas-kaune/z80fp0nb3fauiggdamet.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780126935/landing/duru-montavimas-kaune/mktmq6nqvbdya4x9ujnf.jpg",
  },
  imageAlts: {
    hero: "Staliaus meistras montuoja baltas vidaus duris angoje Kaune",
    work: "Rankos reguliuoja durų vyrį su atsuktuvu",
    consult: "Durų meistras rodo rankenų ir apdailos pavyzdžius klientui",
  },
  servicesHeading: "Kokius durų darbus galite užsakyti",
  servicesLead: "Kauno meistrai platformoje montuoja ir reguliuoja vidaus bei lauko duris.",
  services: [
    { icon: DoorClosed, title: "Vidaus durys", text: "Vidaus durų su stakta montavimas ir tikslus reguliavimas." },
    { icon: Lock, title: "Lauko ir šarvuotos durys", text: "Įėjimo ir šarvuotų durų montavimas, sandarinimas." },
    { icon: Square, title: "Slankiojančios durys", text: "Stumdomų ir slepiamų į sieną durų sistemos." },
    { icon: Ruler, title: "Angokraščiai ir apvadai", text: "Angos paruošimas, apvadų ir palangių montavimas." },
    { icon: Hammer, title: "Reguliavimas ir remontas", text: "Krintančių, girgždančių durų reguliavimas, vyrių keitimas." },
    { icon: DoorOpen, title: "Senų durų keitimas", text: "Senų durų demontavimas ir naujų montavimas." },
  ],
  pricingHeading: "Kiek kainuoja durų montavimas Kaune",
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
      q: "Kiek kainuoja durų montavimas Kaune?",
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
    title: "Reikalingas durų montavimas Kaune",
    description:
      "Ieškau patikimo meistro durų montavimui Kaune. Reikia sumontuoti duris (pvz. vidaus, lauko ar šarvuotas) su staktos surinkimu ir reguliavimu. Prašau pateikti pasiūlymą su orientacine kaina ir galimu darbų laiku.",
  },
  finalCtaTitle: "Reikia sumontuoti duris Kaune?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
