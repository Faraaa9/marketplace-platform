import { Truck, Package, Boxes, Sofa, Building2, ShieldCheck } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/perkraustymo-paslaugos-kaune",
  city: "Kaunas",
  categorySlug: "pr-transportas--perkraustymo-paslaugos",
  serviceType: "Perkraustymo paslaugos",
  seoTitle: "Perkraustymo paslaugos Kaune — gaukite pasiūlymus",
  seoDescription:
    "Reikia persikraustyti Kaune? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų krovėjų. Butų, namų, biurų kraustymas, krovikai, pakavimas, transportas.",
  heroBadge: "Perkraustymas Kaune",
  heroBadgeIcon: Truck,
  h1: "Perkraustymo paslaugos Kaune — be streso",
  heroLead:
    "Aprašykite kraustymą ir nemokamai gaukite pasiūlymus iš patikrintų Kauno krovėjų. Butų, namų ar biurų perkraustymas su transportu ir pakavimu — palyginkite kainas ir pasirinkite geriausią.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780158480/landing/perkraustymo-paslaugos-kaune/afkf46itouw1nsdjdq42.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780158501/landing/perkraustymo-paslaugos-kaune/kmjxjmbmshf5bqwdsg5l.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780158522/landing/perkraustymo-paslaugos-kaune/se0sc77lceupg4hlsj3i.jpg",
  },
  imageAlts: {
    hero: "Krovėjai neša supakuotą sofą iš daugiabučio į perkraustymo furgoną Kaune",
    work: "Rankos vynioja baldus į apsauginę plėvelę ir antklodes",
    consult: "Krovėjas su sąrašu skaičiuoja dėžes ir aptaria kraustymą su klientu",
  },
  servicesHeading: "Kokias kraustymo paslaugas galite užsakyti",
  servicesLead: "Kauno krovėjai platformoje perkrausto butus, namus ir biurus.",
  services: [
    { icon: Sofa, title: "Butų kraustymas", text: "Baldų ir daiktų pakrovimas, pervežimas ir iškrovimas." },
    { icon: Building2, title: "Biurų perkraustymas", text: "Įmonių, biurų inventoriaus kraustymas su minimaliu prastovu." },
    { icon: Package, title: "Pakavimas", text: "Daiktų supakavimas, baldų vyniojimas, dėžės ir medžiagos." },
    { icon: Boxes, title: "Baldų išardymas / surinkimas", text: "Baldų išardymas prieš kraustymą ir surinkimas naujoje vietoje." },
    { icon: Truck, title: "Transportas su krovikais", text: "Furgonas ir krovikai pagal daiktų kiekį." },
    { icon: ShieldCheck, title: "Sunkūs daiktai", text: "Pianinų, seifų, buitinės technikos atsargus gabenimas." },
  ],
  pricingHeading: "Kiek kainuoja perkraustymas Kaune",
  offerPrice: "25",
  pricing: [
    { job: "Krovėjo darbas (val.)", price: "nuo 15 €" },
    { job: "Furgonas su vairuotoju (val.)", price: "nuo 25 €" },
    { job: "1 kambario buto kraustymas", price: "nuo 80 €" },
    { job: "2–3 kambarių butas", price: "nuo 150 €" },
    { job: "Pakavimo medžiagos", price: "derinama" },
    { job: "Sunkūs daiktai (pianinas, seifas)", price: "nuo 60 €" },
  ],
  insights: {
    heading: "Į ką atkreipti dėmesį užsakant kraustymą",
    items: [
      { title: "Aukštas ir liftas", text: "Kaina priklauso nuo aukšto ir ar yra liftas — nešimas laiptais užtrunka ilgiau ir brangiau. Iš anksto nurodykite aukštą abiejose vietose." },
      { title: "Daiktų kiekis ir apimtis", text: "Kuo tiksliau aprašysite (kambarių skaičius, stambūs baldai, dėžių kiekis), tuo tikslesnį pasiūlymą ir tinkamo dydžio transportą gausite." },
      { title: "Pakavimas — laiko taupymas", text: "Profesionalus pakavimas apsaugo daiktus ir pagreitina kraustymą. Trapius daiktus verta pažymėti, kad būtų pakuojami atskirai." },
      { title: "Vertingiems daiktams — atsakomybė", text: "Dėl brangių ar trapių daiktų iš anksto aptarkite atsakomybę ir, jei reikia, draudimą. Patikimi krovėjai tai aiškiai įvardija." },
    ],
  },
  faq: [
    {
      q: "Kiek kainuoja perkraustymas Kaune?",
      a: "Krovėjo valanda — nuo ~15 €, furgonas su vairuotoju — nuo 25 €/val. 1 kambario buto kraustymas prasideda nuo ~80 €, 2–3 kambarių — nuo 150 €. Galutinę kainą lemia kiekis, aukštas ir atstumas. Tikslią kainą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Ar krovėjai patys pakuoja daiktus?",
      a: "Taip, daugelis siūlo pakavimo paslaugą ir medžiagas (dėžes, plėvelę, antklodes). Pažymėkite, jei norite, kad supakuotų — tai apsaugo daiktus ir pagreitina darbą.",
    },
    {
      q: "Ar perkrausto sunkius daiktus?",
      a: "Taip — pianinai, seifai, šaldytuvai gabenami atsargiai, kartais su papildoma įranga. Nurodykite tokius daiktus iš anksto, kad krovėjai pasiruoštų.",
    },
    {
      q: "Per kiek laiko galima suderinti kraustymą?",
      a: "Daugumą kraustymų galima suplanuoti per kelias dienas, o skubius — greičiau. Užsakymą verta pateikti iš anksto, ypač savaitgaliais ir mėnesio pabaigoje.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktais krovėjais.",
    },
  ],
  request: {
    title: "Reikalingos perkraustymo paslaugos Kaune",
    description:
      "Ieškau krovėjų perkraustymui Kaune. Reikia perkraustyti butą / namą (nurodysiu kambarių skaičių ir aukštą) su transportu, galbūt su pakavimu. Prašau pateikti pasiūlymą su orientacine kaina ir galimu laiku.",
  },
  finalCtaTitle: "Planuojate kraustymą Kaune?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
