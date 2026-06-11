import { Grid3x3, Ruler, Layers, Hammer, Truck, Route } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/trinkeliu-klojimas-kaune",
  city: "Kaunas",
  categorySlug: "pr-aplinka-sodas--trinkeliu-klojimas",
  serviceType: "Trinkelių klojimo paslaugos",
  seoTitle: "Trinkelių klojimas Kaune — gaukite pasiūlymus",
  seoDescription:
    "Reikia pakloti trinkeles Kaune? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų meistrų. Kiemų, takų, įvažiavimų trinkelių klojimas su pagrindo paruošimu.",
  heroBadge: "Trinkelių klojimas Kaune",
  heroBadgeIcon: Grid3x3,
  h1: "Trinkelių klojimas Kaune — patikimi meistrai",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Kauno trinkelių klojimo meistrų. Kiemai, takai, įvažiavimai su tinkamu pagrindo paruošimu — palyginkite kainas ir pasirinkite geriausią.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780123761/landing/trinkeliu-klojimas-kaune/qiv6lnwbczz9ntkmg7sb.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780123783/landing/trinkeliu-klojimas-kaune/ol8mzwk9bkkzwceev8ah.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780123807/landing/trinkeliu-klojimas-kaune/qlopo3aumcfl3pbboelz.jpg",
  },
  imageAlts: {
    hero: "Meistrai kloja betonines trinkeles įvažiavime prie namo Kaune",
    work: "Rankos deda pilką trinkelę į smėlio pagrindą",
    consult: "Trinkelių klojimo meistras aptaria kiemo planą su klientu",
  },
  servicesHeading: "Kokius trinkelių darbus galite užsakyti",
  servicesLead: "Kauno meistrai platformoje kloja trinkeles kiemuose, takuose ir įvažiavimuose.",
  services: [
    { icon: Route, title: "Įvažiavimai ir kiemai", text: "Automobilių įvažiavimų ir kiemų klojimas tvirtu pagrindu." },
    { icon: Grid3x3, title: "Takai ir terasos", text: "Sodo takų, terasų ir pėsčiųjų zonų trinkelės." },
    { icon: Layers, title: "Pagrindo paruošimas", text: "Iškasimas, geotekstilė, skalda ir smėlio sluoksniai." },
    { icon: Hammer, title: "Borteliai ir kraštai", text: "Vejos ir kelio bortelių montavimas, kraštų tvirtinimas." },
    { icon: Truck, title: "Medžiagų pristatymas", text: "Trinkelių ir pagrindo medžiagų užsakymas bei pristatymas." },
    { icon: Ruler, title: "Senos dangos keitimas", text: "Senų trinkelių ar asfalto demontavimas ir perklojimas." },
  ],
  pricingHeading: "Kiek kainuoja trinkelių klojimas Kaune",
  offerPrice: "12",
  pricing: [
    { job: "Trinkelių klojimas (m²)", price: "nuo 12 €" },
    { job: "Klojimas su pagrindo paruošimu (m²)", price: "nuo 20 €" },
    { job: "Pagrindo paruošimas (m²)", price: "nuo 8 €" },
    { job: "Bortelių montavimas (m)", price: "nuo 6 €" },
    { job: "Senos dangos demontavimas (m²)", price: "nuo 4 €" },
    { job: "Trinkelių valymas ir priežiūra (m²)", price: "nuo 3 €" },
  ],
  faq: [
    {
      q: "Kiek kainuoja trinkelių klojimas Kaune?",
      a: "Kaina skaičiuojama už kvadratinį metrą: vien klojimas — nuo ~12 €/m², o su pilnu pagrindo paruošimu — nuo 20 €/m². Galutinę kainą lemia plotas, pagrindo būklė ir trinkelių tipas. Tikslią sąmatą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Ar į kainą įeina pagrindo paruošimas?",
      a: "Ne visada — kartais pateikiama tik klojimo kaina, o pagrindo paruošimas (iškasimas, skalda, smėlis) skaičiuojamas atskirai. Geras pasiūlymas aiškiai nurodo, kas įskaičiuota, kad nebūtų netikėtumų.",
    },
    {
      q: "Kada geriausia kloti trinkeles?",
      a: "Sezonas Lietuvoje paprastai trunka nuo pavasario iki rudens, kol nėra šalčio. Vasara — patogiausias metas. Užklausą verta paskelbti iš anksto, nes vasarą meistrai užimti.",
    },
    {
      q: "Kiek laiko trunka darbai?",
      a: "Vidutinį kiemą ar įvažiavimą paklojama per kelias dienas, priklausomai nuo ploto ir pagrindo darbų. Meistras pateiks terminus pasiūlyme.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu meistru.",
    },
  ],
  request: {
    title: "Reikalingas trinkelių klojimas Kaune",
    description:
      "Ieškau patikimo meistro trinkelių klojimui Kaune. Reikia pakloti trinkeles — pavyzdžiui, kieme, take ar įvažiavime, su pagrindo paruošimu. Prašau pateikti pasiūlymą su orientacine kaina už m² ir galimu darbų laiku.",
  },
  finalCtaTitle: "Reikia pakloti trinkeles Kaune?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
