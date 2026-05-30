import { Snowflake, Wind, Fan, Wrench, Thermometer, RefreshCw } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/kondicionieriu-montavimas-kaune",
  city: "Kaunas",
  categorySlug: "pr-statybos-apdaila--ventiliacija-vedinimo-sistemos--kondicionieriu-montavimas",
  serviceType: "Kondicionierių montavimo paslaugos",
  seoTitle: "Kondicionierių montavimas Kaune — gaukite pasiūlymus",
  seoDescription:
    "Reikia sumontuoti kondicionierių Kaune? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų specialistų. Split sistemos, priežiūra, valymas, remontas.",
  heroBadge: "Kondicionavimas Kaune",
  heroBadgeIcon: Snowflake,
  h1: "Kondicionierių montavimas Kaune",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Kauno klimato sistemų specialistų. Naujo kondicionieriaus montavimas, priežiūra ar remontas — palyginkite kainas ir pasirinkite geriausią.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780121228/landing/kondicionieriu-montavimas-kaune/akkva2k7safrmkcgypkv.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780121257/landing/kondicionieriu-montavimas-kaune/fv0vhy9gsdp4svqonorx.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780121277/landing/kondicionieriu-montavimas-kaune/i3v7ylisyfokxodc47dq.jpg",
  },
  imageAlts: {
    hero: "Specialistė montuoja sieninį kondicionierių šviesiame kambaryje Kaune",
    work: "Rankos jungia kondicionieriaus vamzdelius prie lauko bloko",
    consult: "Klimato specialistas pristato kondicionierių variantus klientams Kaune",
  },
  servicesHeading: "Kokius kondicionavimo darbus galite užsakyti",
  servicesLead: "Kauno specialistai platformoje montuoja, prižiūri ir remontuoja kondicionierius.",
  services: [
    { icon: Snowflake, title: "Split sistemų montavimas", text: "Naujo sieninio kondicionieriaus montavimas bute ar name." },
    { icon: Wind, title: "Multi-split sistemos", text: "Kelių vidinių blokų sistemos visam butui ar namui." },
    { icon: Fan, title: "Valymas ir priežiūra", text: "Sezoninis valymas, dezinfekcija, filtrų keitimas." },
    { icon: RefreshCw, title: "Freono papildymas", text: "Šaltnešio lygio patikra ir papildymas." },
    { icon: Wrench, title: "Remontas", text: "Gedimų diagnostika ir kondicionierių remontas." },
    { icon: Thermometer, title: "Demontavimas, perkėlimas", text: "Senų įrenginių nuėmimas ir perkėlimas į kitą vietą." },
  ],
  pricingHeading: "Kiek kainuoja kondicionieriaus montavimas Kaune",
  offerPrice: "150",
  pricing: [
    { job: "Split kondicionieriaus montavimas", price: "nuo 150 €" },
    { job: "Multi-split (2+ vidiniai blokai)", price: "nuo 300 €" },
    { job: "Valymas ir priežiūra", price: "30–50 €" },
    { job: "Freono papildymas", price: "nuo 40 €" },
    { job: "Demontavimas / perkėlimas", price: "nuo 60 €" },
    { job: "Gedimo diagnostika", price: "nuo 30 €" },
  ],
  faq: [
    {
      q: "Kiek kainuoja kondicionieriaus montavimas Kaune?",
      a: "Standartinio sieninio (split) kondicionieriaus montavimas prasideda nuo ~150 €, multi-split sistemos — nuo 300 €. Kaina priklauso nuo trasos ilgio ir montavimo sudėtingumo. Tikslią sumą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Kokio galingumo kondicionieriaus reikia?",
      a: "Apytiksliai reikia ~100 W vėsinimo galios kvadratiniam metrui, bet tikslų galingumą lemia patalpos plotas, langų kiekis ir aukštas. Specialistas parinks tinkamą modelį pagal jūsų patalpą.",
    },
    {
      q: "Ar reikia leidimo kondicionieriui daugiabutyje?",
      a: "Lauko bloko montavimui ant daugiabučio fasado dažnai reikia bendrijos sutikimo. Specialistas patars dėl montavimo vietos ir reikalavimų jūsų name.",
    },
    {
      q: "Per kiek laiko sumontuojamas kondicionierius?",
      a: "Standartinį split kondicionierių paprastai sumontuoja per 3–5 valandas tą pačią dieną. Sudėtingesnės multi-split sistemos gali užtrukti ilgiau.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu specialistu.",
    },
  ],
  request: {
    title: "Reikalingas kondicionieriaus montavimas Kaune",
    description:
      "Ieškau specialisto kondicionieriaus montavimui Kaune. Norėčiau sumontuoti sieninį (split) kondicionierių bute / name. Prašau pateikti pasiūlymą su orientacine kaina, rekomenduojamu galingumu ir galimu montavimo laiku.",
  },
  finalCtaTitle: "Norite kondicionieriaus Kaune?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
