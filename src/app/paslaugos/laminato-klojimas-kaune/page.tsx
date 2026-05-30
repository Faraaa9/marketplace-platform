import { Layers, Ruler, Grid3x3, Scissors, Hammer, Sparkles } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/laminato-klojimas-kaune",
  city: "Kaunas",
  categorySlug: "pr-statybos-apdaila--vidaus-apdailos-darbai--laminato-klojimas",
  serviceType: "Laminato klojimo paslaugos",
  seoTitle: "Laminato klojimas Kaune — gaukite pasiūlymus ir kainas",
  seoDescription:
    "Reikia pakloti laminatą Kaune? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų meistrų. Laminato, vinilo ir SPC dangų klojimas su pagrindo paruošimu.",
  heroBadge: "Grindų danga Kaune",
  heroBadgeIcon: Layers,
  h1: "Laminato klojimas Kaune — tvarkingos grindys per dieną",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Kauno grindų meistrų. Laminatas, vinilas ar SPC danga su pagrindo paruošimu ir tvarkinga apdaila — palyginkite kainas ir pasirinkite geriausią.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780126640/landing/laminato-klojimas-kaune/vpfndclhet52hld7ahz3.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780126670/landing/laminato-klojimas-kaune/c7utgwk0dthfl79dobga.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780126703/landing/laminato-klojimas-kaune/rwjgmhpl0czqmwysbh1w.jpg",
  },
  imageAlts: {
    hero: "Meistras kloja ąžuolo spalvos laminatą šviesiame kambaryje Kaune",
    work: "Rankos prikala laminato lentą su prikalimo trinkele",
    consult: "Grindų specialistas rodo laminato pavyzdžius klientams",
  },
  servicesHeading: "Kokius grindų darbus galite užsakyti",
  servicesLead: "Kauno meistrai platformoje kloja laminatą ir kitas dangas butuose bei namuose.",
  services: [
    { icon: Layers, title: "Laminato klojimas", text: "Visų klasių laminato klojimas kambariuose ir koridoriuose." },
    { icon: Grid3x3, title: "Vinilas ir SPC", text: "Drėgmei atsparių vinilo ir SPC dangų klojimas." },
    { icon: Ruler, title: "Pagrindo lyginimas", text: "Nelygių grindų išlyginimas prieš klojimą." },
    { icon: Sparkles, title: "Garso pamušalas", text: "Tinkamo pamušalo parinkimas garsui ir šilumai." },
    { icon: Scissors, title: "Grindjuostės", text: "Grindjuosčių montavimas ir kampų apdaila." },
    { icon: Hammer, title: "Senos dangos keitimas", text: "Senų grindų demontavimas ir naujos dangos klojimas." },
  ],
  pricingHeading: "Kiek kainuoja laminato klojimas Kaune",
  offerPrice: "6",
  pricing: [
    { job: "Laminato klojimas (m²)", price: "nuo 6 €" },
    { job: "Klojimas įstrižai / raštu (m²)", price: "nuo 9 €" },
    { job: "Vinilo / SPC klojimas (m²)", price: "nuo 8 €" },
    { job: "Pagrindo lyginimas (m²)", price: "nuo 6 €" },
    { job: "Grindjuosčių montavimas (m)", price: "nuo 3 €" },
    { job: "Senos dangos demontavimas (m²)", price: "nuo 2 €" },
  ],
  insights: {
    heading: "Į ką atkreipti dėmesį klojant laminatą",
    items: [
      { title: "Pagrindo lygumas — svarbiausia", text: "Laminatas klojamas tik ant lygaus pagrindo. Jei grindys nelygios, danga „vaikšto“, girgžda ir greičiau dėvisi jungtys. Dažnai reikia išlyginamojo mišinio — patikslinkite, ar tai įskaičiuota." },
      { title: "Deformacinės siūlės", text: "Didesnėse patalpose ir tarp kambarių paliekamos temperatūrinės siūlės su slenksčiais — kitaip danga gali išsipūsti. Geras meistras tai numato iš anksto." },
      { title: "Laminato klasė pagal apkrovą", text: "Miegamajam pakanka 31–32 klasės, o koridoriui ar virtuvei verta rinktis 33 klasę. Drėgnoms zonoms geriau vinilas/SPC. Pasitarkite dėl tinkamos dangos." },
      { title: "Aklimatizacija prieš klojimą", text: "Laminatas turi 24–48 val. pabūti patalpoje, kad prisitaikytų prie temperatūros ir drėgmės. Kitaip po klojimo gali atsirasti tarpai ar išsipūtimai." },
    ],
  },
  faq: [
    {
      q: "Kiek kainuoja laminato klojimas Kaune?",
      a: "Standartinis klojimas — nuo ~6 €/m², įstrižai ar raštu — nuo 9 €/m². Pagrindo lyginimas ir grindjuostės skaičiuojami atskirai. Tikslią kainą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Ar reikia lyginti grindis prieš klojimą?",
      a: "Jei pagrindas nelygus — taip. Net nedideli nelygumai laikui bėgant sukelia girgždesį ir jungčių dilimą. Meistras įvertins grindis ir, jei reikia, įtrauks lyginimą į pasiūlymą.",
    },
    {
      q: "Ar laminatas tinka virtuvei ar voniai?",
      a: "Įprastas laminatas drėgmės nemėgsta. Virtuvei tinka atsparesnės klasės arba vinilas/SPC, o voniai — tik drėgmei atsparios dangos. Pasakykite, kuriai patalpai reikia.",
    },
    {
      q: "Kiek laiko trunka klojimas?",
      a: "Vidutinį kambarį paklojama per dieną, visą butą — per kelias dienas, priklausomai nuo ploto ir pagrindo paruošimo. Terminus meistras nurodo pasiūlyme.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu meistru.",
    },
  ],
  request: {
    title: "Reikalingas laminato klojimas Kaune",
    description:
      "Ieškau patikimo meistro laminato klojimui Kaune. Reikia pakloti laminatą (ar vinilą / SPC) kambariuose, su pagrindo paruošimu ir grindjuostėmis. Prašau pateikti pasiūlymą su orientacine kaina už m² ir galimu darbų laiku.",
  },
  finalCtaTitle: "Reikia pakloti laminatą Kaune?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
