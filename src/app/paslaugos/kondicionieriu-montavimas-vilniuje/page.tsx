import { Snowflake, Wind, Fan, Wrench, Thermometer, RefreshCw } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/kondicionieriu-montavimas-vilniuje",
  city: "Vilnius",
  categorySlug: "pr-statybos-apdaila--ventiliacija-vedinimo-sistemos--kondicionieriu-montavimas",
  serviceType: "Kondicionierių montavimo paslaugos",
  seoTitle: "Kondicionierių montavimas Vilniuje — gaukite pasiūlymus",
  seoDescription:
    "Reikia sumontuoti kondicionierių Vilniuje? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų specialistų. Split sistemos, priežiūra, valymas, remontas.",
  heroBadge: "Kondicionavimas Vilniuje",
  heroBadgeIcon: Snowflake,
  h1: "Kondicionierių montavimas Vilniuje",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Vilniaus klimato sistemų specialistų. Naujo kondicionieriaus montavimas, priežiūra ar remontas — palyginkite kainas ir pasirinkite geriausią.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780158763/landing/kondicionieriu-montavimas-vilniuje/ru5osrea0lkckgvnjaq9.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780158788/landing/kondicionieriu-montavimas-vilniuje/f3dkn52uognfn0hyikq7.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780158816/landing/kondicionieriu-montavimas-vilniuje/gzz7du9jhwudllt8tdn5.jpg",
  },
  imageAlts: {
    hero: "Specialistas montuoja sieninį kondicionierių aukštai ant sienos Vilniuje",
    work: "Rankos gręžia angą ir veda varinius vamzdelius pro sieną",
    consult: "Klimato specialistas aiškina kondicionieriaus vietą klientui",
  },
  servicesHeading: "Kokius kondicionavimo darbus galite užsakyti",
  servicesLead: "Vilniaus specialistai platformoje montuoja, prižiūri ir remontuoja kondicionierius.",
  services: [
    { icon: Snowflake, title: "Split sistemų montavimas", text: "Naujo sieninio kondicionieriaus montavimas bute ar name." },
    { icon: Wind, title: "Multi-split sistemos", text: "Kelių vidinių blokų sistemos visam butui ar namui." },
    { icon: Fan, title: "Valymas ir priežiūra", text: "Sezoninis valymas, dezinfekcija, filtrų keitimas." },
    { icon: RefreshCw, title: "Freono papildymas", text: "Šaltnešio lygio patikra ir papildymas." },
    { icon: Wrench, title: "Remontas", text: "Gedimų diagnostika ir kondicionierių remontas." },
    { icon: Thermometer, title: "Demontavimas, perkėlimas", text: "Senų įrenginių nuėmimas ir perkėlimas į kitą vietą." },
  ],
  pricingHeading: "Kiek kainuoja kondicionieriaus montavimas Vilniuje",
  offerPrice: "150",
  pricing: [
    { job: "Split kondicionieriaus montavimas", price: "nuo 150 €" },
    { job: "Multi-split (2+ vidiniai blokai)", price: "nuo 300 €" },
    { job: "Valymas ir priežiūra", price: "30–50 €" },
    { job: "Freono papildymas", price: "nuo 40 €" },
    { job: "Demontavimas / perkėlimas", price: "nuo 60 €" },
    { job: "Gedimo diagnostika", price: "nuo 30 €" },
  ],
  insights: {
    heading: "Ką verta žinoti prieš montuojant kondicionierių",
    items: [
      { title: "Galingumas pagal patalpą", text: "Apytiksliai reikia ~100 W vėsinimo galios kvadratiniam metrui, bet tikslų galingumą lemia plotas, langai ir aukštas. Per silpnas įrenginys dirbs nuolat ir greičiau dėvėsis." },
      { title: "Lauko bloko vieta", text: "Daugiabutyje lauko bloko montavimui ant fasado dažnai reikia bendrijos sutikimo. Apgalvokite vietą, kad būtų patogu aptarnauti ir netriukšmautų po langais." },
      { title: "Trasos ilgis veikia kainą", text: "Atstumas tarp vidinio ir lauko bloko (vamzdžių trasa) lemia darbo apimtį ir kainą. Iš anksto apgalvokite, kur stovės abu blokai." },
      { title: "Priežiūra pratęsia tarnavimą", text: "Reguliarus valymas ir filtrų keitimas palaiko našumą ir oro švarą. Verta tai daryti bent kartą per metus." },
    ],
  },
  faq: [
    {
      q: "Kiek kainuoja kondicionieriaus montavimas Vilniuje?",
      a: "Standartinio split kondicionieriaus montavimas — nuo ~150 €, multi-split — nuo 300 €. Kaina priklauso nuo trasos ilgio ir montavimo sudėtingumo. Tikslią sumą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Kokio galingumo kondicionieriaus reikia?",
      a: "Apytiksliai ~100 W kvadratiniam metrui, bet tikslų galingumą lemia plotas, langų kiekis ir aukštas. Specialistas parinks tinkamą modelį pagal patalpą.",
    },
    {
      q: "Ar reikia leidimo daugiabutyje?",
      a: "Lauko bloko montavimui ant daugiabučio fasado dažnai reikia bendrijos sutikimo. Specialistas patars dėl vietos ir reikalavimų.",
    },
    {
      q: "Per kiek laiko sumontuojama?",
      a: "Standartinį split kondicionierių paprastai sumontuoja per 3–5 valandas tą pačią dieną. Multi-split sistemos užtrunka ilgiau.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu specialistu.",
    },
  ],
  request: {
    title: "Reikalingas kondicionieriaus montavimas Vilniuje",
    description:
      "Ieškau specialisto kondicionieriaus montavimui Vilniuje. Norėčiau sumontuoti sieninį (split) kondicionierių bute / name. Prašau pateikti pasiūlymą su orientacine kaina, rekomenduojamu galingumu ir galimu montavimo laiku.",
  },
  finalCtaTitle: "Norite kondicionieriaus Vilniuje?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
