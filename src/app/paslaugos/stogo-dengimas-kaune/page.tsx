import { Home, Layers, CloudRain, Wrench, Shield, Ruler } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/stogo-dengimas-kaune",
  city: "Kaunas",
  categorySlug: "pr-statybos-apdaila--stogdengiai-stogo-darbai",
  serviceType: "Stogdengių paslaugos",
  seoTitle: "Stogo dengimas Kaune — gaukite pasiūlymus",
  seoDescription:
    "Reikia uždengti ar suremontuoti stogą Kaune? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų stogdengių. Metalo čerpė, bituminė danga, remontas, latakai.",
  heroBadge: "Stogo darbai Kaune",
  heroBadgeIcon: Home,
  h1: "Stogo dengimas Kaune — patikimi stogdengiai",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Kauno stogdengių. Naujas stogas, dangos keitimas ar remontas — palyginkite kainas ir pasirinkite geriausią meistrą.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780121024/landing/stogo-dengimas-kaune/jcltvvdf5fse65jpfalj.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780121053/landing/stogo-dengimas-kaune/jkd50sjiglcmc3tdshoj.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780121073/landing/stogo-dengimas-kaune/habngfx3dkq6pyb82sjq.jpg",
  },
  imageAlts: {
    hero: "Stogdengiai dengia metalo čerpės stogą name Kaune",
    work: "Stogdengio rankos tvirtina skardinę stogo dangą",
    consult: "Stogdengys aptaria stogo darbus su namo savininku Kaune",
  },
  servicesHeading: "Kokius stogo darbus galite užsakyti",
  servicesLead: "Kauno stogdengiai platformoje dengia naujus stogus ir atlieka remontą.",
  services: [
    { icon: Layers, title: "Metalo čerpė ir skarda", text: "Naujo stogo dengimas metalo čerpe, klasikine skarda ar falcine danga." },
    { icon: Home, title: "Bituminė ir ruloninė danga", text: "Plokščių ir nuolaidžių stogų dengimas bitumine danga." },
    { icon: Wrench, title: "Stogo remontas", text: "Pratekėjimų šalinimas, dangos lopymas, senos dangos keitimas." },
    { icon: CloudRain, title: "Latakai ir lietvamzdžiai", text: "Lietaus nuvedimo sistemos montavimas ir keitimas." },
    { icon: Shield, title: "Stogo šiltinimas", text: "Pastogės šiltinimas, garo ir vėjo izoliacija." },
    { icon: Ruler, title: "Demontavimas", text: "Senos dangos ir konstrukcijų nuardymas, paruošimas." },
  ],
  pricingHeading: "Kiek kainuoja stogo dengimas Kaune",
  pricing: [
    { job: "Stogo dengimas metalo čerpe (m²)", price: "nuo 12 €" },
    { job: "Bituminės dangos klojimas (m²)", price: "nuo 10 €" },
    { job: "Stogo remontas / lopymas", price: "nuo 50 €" },
    { job: "Latakų montavimas (m)", price: "nuo 8 €" },
    { job: "Pastogės šiltinimas (m²)", price: "nuo 8 €" },
    { job: "Senos dangos demontavimas (m²)", price: "nuo 4 €" },
  ],
  faq: [
    {
      q: "Kiek kainuoja stogo dengimas Kaune?",
      a: "Kaina skaičiuojama už kvadratinį metrą ir priklauso nuo dangos: metalo čerpė — nuo ~12 €/m², bituminė danga — nuo 10 €/m². Stogo remontas prasideda nuo 50 €. Tikslią sąmatą gausite pasiūlyme, kai aprašysite stogą. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Kokia stogo danga geriausia?",
      a: "Priklauso nuo stogo nuolydžio ir biudžeto: metalo čerpė populiari nuolaidiems stogams (ilgaamžė, greitai montuojama), bituminė danga tinka plokštiems ir sudėtingos formos stogams. Geras stogdengys pasiūlys tinkamiausią variantą jūsų namui.",
    },
    {
      q: "Per kiek laiko uždengiamas stogas?",
      a: "Vidutinio namo stogą dažniausiai uždengia per kelias dienas iki savaitės, priklausomai nuo ploto, dangos ir oro sąlygų. Remontą galima suderinti greičiau — pažymėkite, jei darbas skubus.",
    },
    {
      q: "Ar stogai dengiami žiemą?",
      a: "Dalis darbų atliekami ir šaltuoju metų laiku, bet kai kurioms dangoms (ypač bitumui) reikia tinkamos temperatūros. Stogdengys įvertins, ar darbą verta atlikti dabar, ar palaukti tinkamesnių sąlygų.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu stogdengiu.",
    },
  ],
  request: {
    title: "Reikalingas stogdengys Kaune",
    description:
      "Ieškau patikimo stogdengio Kaune. Reikia uždengti arba suremontuoti stogą — pavyzdžiui, metalo čerpės danga, bituminė danga, pratekėjimo šalinimas ar latakų montavimas. Prašau pateikti pasiūlymą su orientacine kaina ir galimu darbų laiku.",
  },
  finalCtaTitle: "Reikia stogdengio Kaune?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
