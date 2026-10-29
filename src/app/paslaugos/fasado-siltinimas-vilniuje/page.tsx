import { Thermometer, Layers, PaintRoller, Home, Ruler, Snowflake } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/fasado-siltinimas-vilniuje",
  city: "Vilnius",
  categorySlug: "pr-statybos-apdaila--apsiltinimas-siltinimas",
  serviceType: "Fasado šiltinimo paslaugos",
  seoTitle: "Fasado šiltinimas Vilniuje — gaukite pasiūlymus",
  seoDescription:
    "Reikia apšiltinti fasadą Vilniuje? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų meistrų. Sienų šiltinimas polistirolu ar akmens vata su dekoratyviniu tinku.",
  heroBadge: "Fasado šiltinimas Vilniuje",
  heroBadgeIcon: Thermometer,
  h1: "Fasado šiltinimas Vilniuje — šiltesni namai, mažesnės sąskaitos",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Vilniaus fasadų meistrų. Sienų šiltinimas polistirolu ar akmens vata su dekoratyviniu tinku — palyginkite kainas ir pasirinkite geriausią.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780140379/landing/fasado-siltinimas-vilniuje/fxgn6bigt9iufqsabj8m.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780140399/landing/fasado-siltinimas-vilniuje/vyhlmh1kzcj1gxuwwwfa.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780140418/landing/fasado-siltinimas-vilniuje/xhtnpz3uukfk1ukadkve.jpg",
  },
  imageAlts: {
    hero: "Darbininkas ant pastolių užneša dekoratyvinį tinką ant apšiltinto fasado Vilniuje",
    work: "Plieniniu glaistikliu skleidžiamas dekoratyvinis tinkas ant tinklelio",
    consult: "Fasado meistras rodo tinko spalvų pavyzdžius namo savininkui",
  },
  servicesHeading: "Kokius šiltinimo darbus galite užsakyti",
  servicesLead: "Vilniaus meistrai platformoje šiltina namų ir pastatų fasadus bei kitas konstrukcijas.",
  services: [
    { icon: Home, title: "Sienų šiltinimas", text: "Fasadų šiltinimas polistirolu (EPS) arba akmens vata." },
    { icon: PaintRoller, title: "Dekoratyvinis tinkas", text: "Armavimas ir dekoratyvinio tinko užnešimas, dažymas." },
    { icon: Layers, title: "Cokolio šiltinimas", text: "Cokolio ir pamatų šiltinimas atsparia drėgmei plokšte." },
    { icon: Snowflake, title: "Stogo / pastogės", text: "Pastogių ir perdangų šiltinimas mineraline vata." },
    { icon: Ruler, title: "Angokraščiai", text: "Langų ir durų angokraščių apdaila po šiltinimo." },
    { icon: Thermometer, title: "Konsultacija dėl medžiagų", text: "Tinkamo storio ir medžiagos parinkimas pagal pastatą." },
  ],
  pricingHeading: "Kiek kainuoja fasado šiltinimas Vilniuje",
  pricing: [
    { job: "Fasado šiltinimas polistirolu (m²)", price: "nuo 22 €" },
    { job: "Šiltinimas akmens vata (m²)", price: "nuo 30 €" },
    { job: "Dekoratyvinis tinkas (m²)", price: "nuo 12 €" },
    { job: "Cokolio šiltinimas (m²)", price: "nuo 25 €" },
    { job: "Angokraščių apdaila (m)", price: "nuo 8 €" },
    { job: "Pastolių nuoma ir montavimas", price: "derinama" },
  ],
  insights: {
    heading: "Ką svarbu žinoti prieš šiltinant fasadą",
    items: [
      { title: "Polistirolas ar akmens vata", text: "EPS pigesnis ir lengvesnis, akmens vata — nedegi ir geriau praleidžia garą (svarbu mediniams ar drėgniems pastatams). Meistras padės parinkti pagal jūsų sienų tipą." },
      { title: "Storis lemia efektą", text: "Šiltinimo nauda priklauso nuo sluoksnio storio (dažnai 10–20 cm). Per plonas sluoksnis sutaupys mažiau, nei tikitės. Aptarkite tikslą — komfortas ar maksimalus taupymas." },
      { title: "Šiltinama šiltuoju sezonu", text: "Klijai ir tinkas reikalauja teigiamos temperatūros, todėl fasadai dažniausiai šiltinami nuo pavasario iki rudens. Užklausą verta paskelbti iš anksto." },
      { title: "Svarbios detalės", text: "Tinkamai įrengti angokraščiai, palangės ir cokolis lemia, ar nebus „šalčio tiltelių“ ir drėgmės. Paklauskite, kaip meistras sprendžia šias vietas." },
    ],
  },
  faq: [
    {
      q: "Kiek kainuoja fasado šiltinimas Vilniuje?",
      a: "Šiltinimas polistirolu prasideda nuo ~22 €/m², akmens vata — nuo 30 €/m² (su armavimu ir tinku gali būti daugiau). Galutinę kainą lemia plotas, aukštis ir medžiaga. Tikslią sąmatą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Kuri medžiaga geresnė — polistirolas ar vata?",
      a: "Polistirolas (EPS) pigesnis ir paprastesnis, akmens vata nedegi ir geriau „kvėpuoja“. Pasirinkimą lemia sienų tipas, biudžetas ir priešgaisriniai reikalavimai. Meistras patars konkrečiu atveju.",
    },
    {
      q: "Ar reikia leidimo šiltinti daugiabutį?",
      a: "Viso daugiabučio fasado šiltinimui paprastai reikia bendrijos sprendimo ir projekto. Individualaus namo šiltinimui leidimo dažniausiai nereikia. Specialistas patars dėl jūsų situacijos.",
    },
    {
      q: "Per kiek laiko atsiperka šiltinimas?",
      a: "Priklauso nuo pastato būklės ir energijos kainų, bet kokybiškas fasado šiltinimas dažnai gerokai sumažina šildymo sąskaitas ir pagerina komfortą. Tiksliau įvertins specialistas pagal jūsų namą.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu meistru.",
    },
  ],
  request: {
    title: "Reikalingas fasado šiltinimas Vilniuje",
    description:
      "Ieškau patikimo meistro fasado šiltinimui Vilniuje. Reikia apšiltinti namo / pastato sienas (polistirolu ar akmens vata) su dekoratyviniu tinku. Prašau pateikti pasiūlymą su orientacine kaina už m² ir galimu darbų laiku.",
  },
  finalCtaTitle: "Reikia apšiltinti fasadą Vilniuje?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
