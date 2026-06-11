import { Home, Layers, CloudRain, Wrench, Shield, Ruler } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/stogo-dengimas-vilniuje",
  city: "Vilnius",
  categorySlug: "pr-statybos-apdaila--stogdengiai-stogo-darbai",
  serviceType: "Stogdengių paslaugos",
  seoTitle: "Stogo dengimas Vilniuje — gaukite pasiūlymus",
  seoDescription:
    "Reikia uždengti ar suremontuoti stogą Vilniuje? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų stogdengių. Čerpė, skarda, bituminė danga, remontas, latakai.",
  heroBadge: "Stogo darbai Vilniuje",
  heroBadgeIcon: Home,
  h1: "Stogo dengimas Vilniuje — patikimi stogdengiai",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Vilniaus stogdengių. Naujas stogas, dangos keitimas ar remontas — palyginkite kainas ir pasirinkite geriausią meistrą.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780127123/landing/stogo-dengimas-vilniuje/puelqla5xdimuxg0ojsr.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780127143/landing/stogo-dengimas-vilniuje/yrs8mfvzorjl8ratrrse.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780127174/landing/stogo-dengimas-vilniuje/qtfesq9hov0o8qhs47rm.jpg",
  },
  imageAlts: {
    hero: "Stogdengys tvirtina keramines čerpes ant šlaitinio stogo Vilniuje",
    work: "Rankos tiksliai deda ir tvirtina keraminę stogo čerpę",
    consult: "Stogdengys rodo stogo dangos pavyzdžius namo savininkui",
  },
  servicesHeading: "Kokius stogo darbus galite užsakyti",
  servicesLead: "Vilniaus stogdengiai platformoje dengia naujus stogus ir atlieka remontą.",
  services: [
    { icon: Layers, title: "Čerpė ir skarda", text: "Naujo stogo dengimas keramine, betonine čerpe ar skarda." },
    { icon: Home, title: "Bituminė ir ruloninė danga", text: "Plokščių ir nuolaidžių stogų dengimas bitumine danga." },
    { icon: Wrench, title: "Stogo remontas", text: "Pratekėjimų šalinimas, dangos lopymas, dalinis keitimas." },
    { icon: CloudRain, title: "Latakai ir lietvamzdžiai", text: "Lietaus nuvedimo sistemos montavimas ir keitimas." },
    { icon: Shield, title: "Pastogės šiltinimas", text: "Pastogės šiltinimas, garo ir vėjo izoliacija." },
    { icon: Ruler, title: "Demontavimas", text: "Senos dangos ir konstrukcijų nuardymas, paruošimas." },
  ],
  pricingHeading: "Kiek kainuoja stogo dengimas Vilniuje",
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
    heading: "Į ką atkreipti dėmesį dengiant stogą",
    items: [
      { title: "Danga pagal stogo nuolydį", text: "Statiems stogams tinka čerpė ir skarda, plokštiems — bituminė ar membraninė danga. Netinkama danga prie konkretaus nuolydžio gali pradėti pratekėti. Geras stogdengys pasiūlys tinkamiausią." },
      { title: "Po danga — svarbiausia paslėpta", text: "Garo izoliacija, vėjo plėvelė ir ventiliuojamas tarpas lemia, ar stogas „kvėpuos“ ir ar po juo nesikaups kondensatas. Paklauskite, kaip įrengiamas pastogės „pyragas“." },
      { title: "Latakai ir vandens nuvedimas", text: "Net geriausia danga prakiš, jei vanduo blogai nuvedamas. Tinkami latakai, lietvamzdžiai ir lašėjimo juostos — būtina viso stogo dalis." },
      { title: "Garantija ir oro sąlygos", text: "Patikslinkite darbų garantiją ir aptarkite, kuriuo metų laiku planuojami darbai — kai kurios dangos reikalauja teigiamos temperatūros." },
    ],
  },
  faq: [
    {
      q: "Kiek kainuoja stogo dengimas Vilniuje?",
      a: "Kaina už m² priklauso nuo dangos: čerpė — nuo ~14 €/m², skarda — nuo 12 €/m², bituminė danga — nuo 10 €/m². Remontas prasideda nuo 50 €. Tikslią sąmatą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Kokia stogo danga geriausia?",
      a: "Priklauso nuo stogo nuolydžio, biudžeto ir estetikos: čerpė ilgaamžė ir graži, skarda greitai montuojama, bituminė danga tinka sudėtingos formos stogams. Stogdengys pasiūlys tinkamiausią variantą.",
    },
    {
      q: "Per kiek laiko uždengiamas stogas?",
      a: "Vidutinio namo stogą uždengia per kelias dienas iki savaitės, priklausomai nuo ploto, dangos ir oro. Remontą galima suderinti greičiau — pažymėkite, jei skubu.",
    },
    {
      q: "Ar stogai dengiami žiemą?",
      a: "Dalis darbų atliekami ir šaltuoju metu, bet kai kurioms dangoms reikia tinkamos temperatūros. Stogdengys įvertins, ar verta dirbti dabar, ar palaukti.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu stogdengiu.",
    },
  ],
  request: {
    title: "Reikalingas stogdengys Vilniuje",
    description:
      "Ieškau patikimo stogdengio Vilniuje. Reikia uždengti arba suremontuoti stogą (pvz. čerpės ar skardos danga, pratekėjimo šalinimas, latakų montavimas). Prašau pateikti pasiūlymą su orientacine kaina ir galimu darbų laiku.",
  },
  finalCtaTitle: "Reikia stogdengio Vilniuje?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
