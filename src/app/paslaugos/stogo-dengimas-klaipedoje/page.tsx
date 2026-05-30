import { Home, Layers, CloudRain, Wrench, Shield, Ruler } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/stogo-dengimas-klaipedoje",
  city: "Klaipėda",
  categorySlug: "pr-statybos-apdaila--stogdengiai-stogo-darbai",
  serviceType: "Stogdengių paslaugos",
  seoTitle: "Stogo dengimas Klaipėdoje — gaukite pasiūlymus",
  seoDescription:
    "Reikia uždengti ar suremontuoti stogą Klaipėdoje? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų stogdengių. Čerpė, skarda, bituminė danga, remontas, latakai.",
  heroBadge: "Stogo darbai Klaipėdoje",
  heroBadgeIcon: Home,
  h1: "Stogo dengimas Klaipėdoje — patikimi stogdengiai",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Klaipėdos stogdengių. Naujas stogas, dangos keitimas ar remontas — palyginkite kainas ir pasirinkite geriausią meistrą.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780159266/landing/stogo-dengimas-klaipedoje/tdxchl08hsn3wvaeeriv.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780159285/landing/stogo-dengimas-klaipedoje/jok6gw1fokrrwbkmeuqs.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780159307/landing/stogo-dengimas-klaipedoje/q52t0fjocqhtkdulk6zr.jpg",
  },
  imageAlts: {
    hero: "Stogdengiai dengia falcinę skardos dangą pajūrio namo stoge Klaipėdoje",
    work: "Rankos užspaudžia dviejų skardos lakštų falcą sandarinimo įrankiu",
    consult: "Stogdengys aptaria vėjui atsparią dangą su namo savininku",
  },
  servicesHeading: "Kokius stogo darbus galite užsakyti",
  servicesLead: "Klaipėdos stogdengiai platformoje dengia naujus stogus ir atlieka remontą.",
  services: [
    { icon: Layers, title: "Čerpė ir skarda", text: "Naujo stogo dengimas keramine, betonine čerpe ar skarda." },
    { icon: Home, title: "Bituminė ir ruloninė danga", text: "Plokščių ir nuolaidžių stogų dengimas bitumine danga." },
    { icon: Wrench, title: "Stogo remontas", text: "Pratekėjimų šalinimas, dangos lopymas, dalinis keitimas." },
    { icon: CloudRain, title: "Latakai ir lietvamzdžiai", text: "Lietaus nuvedimo sistemos montavimas ir keitimas." },
    { icon: Shield, title: "Pastogės šiltinimas", text: "Pastogės šiltinimas, garo ir vėjo izoliacija." },
    { icon: Ruler, title: "Demontavimas", text: "Senos dangos ir konstrukcijų nuardymas, paruošimas." },
  ],
  pricingHeading: "Kiek kainuoja stogo dengimas Klaipėdoje",
  offerPrice: "10",
  pricing: [
    { job: "Stogo dengimas čerpe (m²)", price: "nuo 14 €" },
    { job: "Skardinės dangos klojimas (m²)", price: "nuo 12 €" },
    { job: "Bituminės dangos klojimas (m²)", price: "nuo 10 €" },
    { job: "Stogo remontas / lopymas", price: "nuo 50 €" },
    { job: "Latakų montavimas (m)", price: "nuo 8 €" },
    { job: "Senos dangos demontavimas (m²)", price: "nuo 4 €" },
  ],
  insights: {
    heading: "Į ką atkreipti dėmesį pajūryje dengiant stogą",
    items: [
      { title: "Vėjo apkrova prie jūros", text: "Klaipėdos regione stipresni vėjai, todėl danga ir tvirtinimas turi būti atsparesni. Aptarkite su stogdengiu vėjui atsparius sprendimus ir tvirtinimo tankį." },
      { title: "Danga pagal nuolydį", text: "Statiems stogams tinka čerpė ir skarda, plokštiems — bituminė ar membraninė danga. Netinkama danga prie nuolydžio pradeda pratekėti." },
      { title: "Drėgmė ir ventiliacija", text: "Pajūrio drėgmė reikalauja gero pastogės vėdinimo ir izoliacijos, kad nesikauptų kondensatas. Paklauskite, kaip įrengiamas pastogės „pyragas“." },
      { title: "Latakai ir vandens nuvedimas", text: "Tinkami latakai ir lietvamzdžiai būtini — be jų net gera danga sukels problemų. Tai viso stogo darbo dalis." },
    ],
  },
  faq: [
    {
      q: "Kiek kainuoja stogo dengimas Klaipėdoje?",
      a: "Kaina už m²: čerpė — nuo ~14 €/m², skarda — nuo 12 €/m², bituminė danga — nuo 10 €/m². Remontas prasideda nuo 50 €. Tikslią sąmatą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Kokia danga geriausia pajūrio klimatui?",
      a: "Svarbu atsparumas vėjui ir drėgmei. Kokybiška skarda ar čerpė su patikimu tvirtinimu tinka gerai. Stogdengys pasiūlys variantą pagal jūsų stogą ir vietą.",
    },
    {
      q: "Per kiek laiko uždengiamas stogas?",
      a: "Vidutinio namo stogą uždengia per kelias dienas iki savaitės, priklausomai nuo ploto, dangos ir oro. Remontą galima suderinti greičiau.",
    },
    {
      q: "Ar stogai dengiami žiemą?",
      a: "Dalis darbų atliekami ir šaltuoju metu, bet kai kurioms dangoms reikia tinkamos temperatūros. Stogdengys įvertins, ar verta dirbti dabar.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu stogdengiu.",
    },
  ],
  request: {
    title: "Reikalingas stogdengys Klaipėdoje",
    description:
      "Ieškau patikimo stogdengio Klaipėdoje. Reikia uždengti arba suremontuoti stogą (pvz. čerpės ar skardos danga, pratekėjimo šalinimas, latakų montavimas). Prašau pateikti pasiūlymą su orientacine kaina ir galimu darbų laiku.",
  },
  finalCtaTitle: "Reikia stogdengio Klaipėdoje?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
