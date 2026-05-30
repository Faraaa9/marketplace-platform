import { Fence, Hammer, Ruler, Square, DoorOpen, Layers } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/tvoros-montavimas-vilniuje",
  city: "Vilnius",
  categorySlug: "pr-statybos-apdaila--tvoros-vartai-montavimas",
  serviceType: "Tvorų montavimo paslaugos",
  seoTitle: "Tvoros montavimas Vilniuje — gaukite pasiūlymus",
  seoDescription:
    "Reikia pastatyti tvorą Vilniuje? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų meistrų. Segmentinės, metalinės, medinės tvoros, vartai ir varteliai.",
  heroBadge: "Tvoros ir vartai Vilniuje",
  heroBadgeIcon: Fence,
  h1: "Tvoros montavimas Vilniuje — tvarkingas sklypo aptvėrimas",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Vilniaus tvorų meistrų. Segmentinės, metalinės ar medinės tvoros su vartais — palyginkite kainas ir pasirinkite geriausią.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780140442/landing/tvoros-montavimas-vilniuje/evbsrgpzbzrndwgsscqc.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780140472/landing/tvoros-montavimas-vilniuje/r3a7wgebhiph05aqbkg2.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780140517/landing/tvoros-montavimas-vilniuje/brol0yt8jgeb6umdeqia.jpg",
  },
  imageAlts: {
    hero: "Darbininkai montuoja modernią medinių tašelių tvorą sklype Vilniuje",
    work: "Rankos su gręžtuvu tvirtina medinę tvoros lentą prie tamsaus stulpo",
    consult: "Tvorų meistras su matavimo juosta aptaria tvoros stilių su klientu",
  },
  servicesHeading: "Kokius tvorų darbus galite užsakyti",
  servicesLead: "Vilniaus meistrai platformoje stato įvairias tvoras ir montuoja vartus.",
  services: [
    { icon: Square, title: "Segmentinės tvoros", text: "Suvirintų segmentų tvoros — populiarios ir tvirtos." },
    { icon: Fence, title: "Metalinės ir tinklinės", text: "Profilio, žvarbučio ar tinklinės tvoros sklypo aptvėrimui." },
    { icon: Layers, title: "Medinės tvoros", text: "Medinės ir kombinuotos tvoros estetiškam vaizdui." },
    { icon: DoorOpen, title: "Vartai ir varteliai", text: "Stumdomi, varstomi vartai, automatika ir varteliai." },
    { icon: Hammer, title: "Stulpų betonavimas", text: "Stulpų gręžimas ir betonavimas tvirtam pagrindui." },
    { icon: Ruler, title: "Senos tvoros keitimas", text: "Senos tvoros demontavimas ir naujos statymas." },
  ],
  pricingHeading: "Kiek kainuoja tvoros montavimas Vilniuje",
  offerPrice: "20",
  pricing: [
    { job: "Segmentinės tvoros montavimas (m)", price: "nuo 25 €" },
    { job: "Tinklinės tvoros montavimas (m)", price: "nuo 15 €" },
    { job: "Medinės tvoros montavimas (m)", price: "nuo 30 €" },
    { job: "Stulpo gręžimas ir betonavimas (vnt.)", price: "nuo 20 €" },
    { job: "Varstomų vartų montavimas", price: "nuo 150 €" },
    { job: "Stumdomų vartų su automatika", price: "nuo 600 €" },
  ],
  insights: {
    heading: "Į ką atkreipti dėmesį statant tvorą",
    items: [
      { title: "Sklypo ribos ir kaimynai", text: "Prieš statant tvorą ant ribos verta suderinti su kaimynais ir įsitikinti dėl tikslios ribos. Kai kuriais atvejais aukščiui ar tipui gali galioti reikalavimai — meistras patars." },
      { title: "Stulpų pagrindas — tvirtumo esmė", text: "Tvoros ilgaamžiškumą lemia teisingai įbetonuoti stulpai (pakankamas gylis, nepaveiktas šalčio). Sutaupius ant pagrindo, tvora ima svirti." },
      { title: "Vartų tipas ir vieta", text: "Stumdomiems vartams reikia vietos atstumti, varstomiems — laisvos erdvės atidaryti. Iš anksto apgalvokite įvažiavimą ir ar reikės automatikos." },
      { title: "Danga prieš koroziją", text: "Metalinės tvoros turi būti cinkuotos ir dažytos milteliniu būdu — kitaip greitai rūdija. Paklauskite apie dangą ir garantiją." },
    ],
  },
  faq: [
    {
      q: "Kiek kainuoja tvoros montavimas Vilniuje?",
      a: "Kaina už metrą: segmentinė tvora — nuo ~25 €/m, tinklinė — nuo 15 €/m, medinė — nuo 30 €/m. Vartai ir stulpų betonavimas skaičiuojami atskirai. Tikslią sąmatą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Ar į kainą įeina medžiagos?",
      a: "Priklauso nuo susitarimo. Dažnai pateikiama montavimo kaina, o tvoros segmentus, stulpus ir vartus perka užsakovas pagal meistro rekomendacijas. Tai aiškiai nurodoma pasiūlyme.",
    },
    {
      q: "Kada geriausia statyti tvorą?",
      a: "Sezonas nuo pavasario iki rudens, kol žemė neįšalusi (svarbu stulpų betonavimui). Vasarą meistrai užimti, todėl užklausą verta paskelbti iš anksto.",
    },
    {
      q: "Ar galima sumontuoti vartų automatiką?",
      a: "Taip — daug meistrų montuoja stumdomų ir varstomų vartų automatiką su nuotoliniu valdymu. Pažymėkite, kad reikia automatikos, ir specialistas pasiūlys sprendimą.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu meistru.",
    },
  ],
  request: {
    title: "Reikalingas tvoros montavimas Vilniuje",
    description:
      "Ieškau patikimo meistro tvoros montavimui Vilniuje. Reikia pastatyti tvorą (pvz. segmentinę, metalinę ar medinę) su stulpais ir vartais. Prašau pateikti pasiūlymą su orientacine kaina už metrą ir galimu darbų laiku.",
  },
  finalCtaTitle: "Reikia pastatyti tvorą Vilniuje?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
