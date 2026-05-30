import { Flame, Wind, ShieldCheck, Search, Brush, AlertTriangle } from "lucide-react";
import {
  ServiceLanding,
  serviceLandingMetadata,
  type ServiceLandingConfig,
} from "@/components/landing/ServiceLanding";

const config: ServiceLandingConfig = {
  path: "/paslaugos/kaminu-valymas-kaune",
  city: "Kaunas",
  categorySlug: "pr-statybos-apdaila--statybos-darbai--kaminai-kaminu-ideklai-valymas",
  serviceType: "Kaminų valymo paslaugos",
  seoTitle: "Kaminų valymas Kaune — kaminkrėtys su aktu",
  seoDescription:
    "Reikia išvalyti kaminą Kaune? Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų kaminkrėčių. Dūmtraukių valymas, apžiūra ir pažyma draudimui.",
  heroBadge: "Kaminų valymas Kaune",
  heroBadgeIcon: Flame,
  h1: "Kaminų valymas Kaune — saugus ir traukiantis dūmtraukis",
  heroLead:
    "Aprašykite darbą ir nemokamai gaukite pasiūlymus iš patikrintų Kauno kaminkrėčių. Dūmtraukių valymas, apžiūra ir pažyma — palyginkite kainas ir pasirinkite geriausią specialistą.",
  images: {
    hero: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780126957/landing/kaminu-valymas-kaune/h6a1odym6gmsvtqnznpw.jpg",
    work: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780126978/landing/kaminu-valymas-kaune/armze3cs1nw604uyocs6.jpg",
    consult: "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780127004/landing/kaminu-valymas-kaune/vqb0alyyea1vzbdumhh4.jpg",
  },
  imageAlts: {
    hero: "Kaminkrėtys valo mūrinį kaminą šepečiu ant namo stogo Kaune",
    work: "Rankos leidžia apvalų kamino valymo šepetį į dūmtraukį",
    consult: "Kaminkrėtys kalbasi su namo savininku prie krosnies",
  },
  servicesHeading: "Kokius kaminų darbus galite užsakyti",
  servicesLead: "Kauno kaminkrėčiai platformoje valo ir tikrina dūmtraukius bei krosnis.",
  services: [
    { icon: Brush, title: "Kaminų valymas", text: "Suodžių ir nuosėdų šalinimas iš dūmtraukio mechaniškai." },
    { icon: Search, title: "Apžiūra ir diagnostika", text: "Dūmtraukio būklės įvertinimas, įtrūkimų ir sandarumo patikra." },
    { icon: ShieldCheck, title: "Pažyma / aktas", text: "Kamino valymo pažyma, kurios prašo draudikai ir bendrijos." },
    { icon: Wind, title: "Traukos patikra", text: "Traukos matavimas, kad krosnis ar katilas dirbtų saugiai." },
    { icon: AlertTriangle, title: "Degėsių pašalinimas", text: "Susikaupusių dervų ir degėsių, keliančių gaisro riziką, valymas." },
    { icon: Flame, title: "Krosnių ir katilų priežiūra", text: "Židinių, krosnių ir kietojo kuro katilų dūmtraukių valymas." },
  ],
  pricingHeading: "Kiek kainuoja kaminų valymas Kaune",
  offerPrice: "30",
  pricing: [
    { job: "Kamino valymas (1 dūmtraukis)", price: "nuo 30 €" },
    { job: "Su valymo pažyma / aktu", price: "nuo 40 €" },
    { job: "Dūmtraukio apžiūra / diagnostika", price: "nuo 30 €" },
    { job: "Židinio / krosnies valymas", price: "nuo 35 €" },
    { job: "Sudervėjusio kamino valymas", price: "nuo 50 €" },
    { job: "Traukos patikra", price: "nuo 20 €" },
  ],
  insights: {
    heading: "Ką verta žinoti apie kaminų valymą",
    items: [
      { title: "Reguliarumas — saugumo klausimas", text: "Aktyviai naudojamą kietojo kuro kaminą rekomenduojama valyti bent kartą per metus, prieš šildymo sezoną. Susikaupę suodžiai ir derva — pagrindinė kaminų gaisrų priežastis." },
      { title: "Pažyma draudimui", text: "Draudimo bendrovės ir bendrijos dažnai prašo kamino valymo pažymos. Jei jos reikia, iš karto pažymėkite — meistras išrašys aktą po darbo." },
      { title: "Derva — atskiras atvejis", text: "Jei kūrenama drėgna mediena ar smilkstama, dūmtraukyje susidaro kieta derva, kurią valyti sunkiau ir brangiau. Aprašykite, kuo kūrenate." },
      { title: "Traukos problemos", text: "Jei rūksta į vidų ar prastai kūrenasi, gali būti ne tik užsikimšimas, bet ir traukos ar sandarumo problema. Geras kaminkrėtys patikrina ir tai." },
    ],
  },
  faq: [
    {
      q: "Kiek kainuoja kaminų valymas Kaune?",
      a: "Vieno dūmtraukio valymas prasideda nuo ~30 €, su pažyma — nuo 40 €, sudervėjusio kamino — nuo 50 €. Galutinę kainą lemia kamino būklė ir aukštis. Tikslią kainą gausite pasiūlyme. Pasiūlymų gavimas nemokamas.",
    },
    {
      q: "Kaip dažnai reikia valyti kaminą?",
      a: "Aktyviai kūrenamą kietojo kuro kaminą — bent kartą per metus, geriausia prieš šildymo sezoną. Intensyviai naudojant — dažniau. Kaminkrėtys patars pagal jūsų situaciją.",
    },
    {
      q: "Ar gausiu valymo pažymą?",
      a: "Taip, daug kaminkrėčių išrašo kamino valymo aktą / pažymą, kurios prašo draudikai ir bendrijos. Pažymėkite užklausoje, kad reikia pažymos.",
    },
    {
      q: "Iš kur valomas kaminas — iš viršaus ar iš apačios?",
      a: "Priklauso nuo kamino — valoma iš stogo arba iš apačios per pravalymo angą. Specialistas parinks saugų ir tinkamą būdą jūsų dūmtraukiui.",
    },
    {
      q: "Ar tikrai nemokama?",
      a: "Taip. Užklausos paskelbimas ir pasiūlymų gavimas pirkėjui nemokami. Mokate tik už atliktą darbą tiesiogiai susitarę su pasirinktu specialistu.",
    },
  ],
  request: {
    title: "Reikalingas kaminų valymas Kaune",
    description:
      "Ieškau kaminkrėčio Kaune. Reikia išvalyti kaminą / dūmtraukį (kūrenu kietuoju kuru), pageidautina su valymo pažyma. Prašau pateikti pasiūlymą su orientacine kaina ir galimu atvykimo laiku.",
  },
  finalCtaTitle: "Reikia išvalyti kaminą Kaune?",
};

export const metadata = serviceLandingMetadata(config);

export default function Page() {
  return <ServiceLanding config={config} />;
}
