import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Phone, ShieldCheck } from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildPageSeo, BASE_URL } from "@/lib/seo/page-seo";

const PATH = "/straipsniai/stogo-darbai";
const H1 = "Patikimi stogdengiai ir profesionalūs stogo darbai: ką žinoti prieš pradedant";
const PUBLISHED = "2026-06-01";

const HERO_IMAGE =
  "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780121024/landing/stogo-dengimas-kaune/jcltvvdf5fse65jpfalj.jpg";
const HERO_ALT = "Stogdengiai dengia metalo čerpių stogą";
const WORK_IMAGE =
  "https://res.cloudinary.com/dvpmupqbb/image/upload/v1780121053/landing/stogo-dengimas-kaune/jkd50sjiglcmc3tdshoj.jpg";
const WORK_ALT = "Stogdengys tvirtina skardinę stogo dangą";

// Roofer category in the unified taxonomy (same slug the /paslaugos/stogo-* pages use).
const ROOFER_CATEGORY = "pr-statybos-apdaila--stogdengiai-stogo-darbai";
const browseRoofersHref = `/meistrai?category=${encodeURIComponent(ROOFER_CATEGORY)}`;
const requestHref =
  `/uzklausos/nauja?title=${encodeURIComponent("Reikalingi stogo darbai")}` +
  `&category=${encodeURIComponent(ROOFER_CATEGORY)}` +
  `&description=${encodeURIComponent(
    "Ieškau patikimų stogdengių stogo darbams. Prašau pateikti pasiūlymą su orientacine kaina ir galimu atvykimo laiku.",
  )}`;

const PRICING: { type: string; what: string }[] = [
  {
    type: "Stogo darbai",
    what: "Konstrukcija, šiltinimas, plėvelių klojimas ir dangos montavimas.",
  },
  {
    type: "Stogo pakalimo darbai",
    what: "Karkaso paruošimas ir pasirinktų lentelių ar skardos montavimas.",
  },
  {
    type: "Plokščių stogų dengimas",
    what: "Prilydoma stogo danga: pagrindo paruošimas, gruntavimas ir prilydymas keliais sluoksniais.",
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Kiek kainuoja stogo dengimo darbai?",
    a: "Stogo dengimo darbų kaina priklauso nuo stogo ploto, konstrukcijos sudėtingumo ir pasirinktos dangos. Tiksliausią sumą gausite, kai keli stogdengiai pateiks pasiūlymus pagal jūsų objektą — užklausos paskelbimas ir pasiūlymų gavimas platformoje nemokami.",
  },
  {
    q: "Nuo ko priklauso stogo darbų kaina?",
    a: "Pagrindiniai veiksniai: stogo konstrukcija (šlaitinis ar plokščias), pasirinktos medžiagos (čerpės, skarda ar prilydoma danga), bendras plotas bei kampų skaičius ir sezoniškumas su regionu.",
  },
  {
    q: "Kas yra stogo pakalimo darbai?",
    a: "Stogo pakalimo darbai — tai stogo iškyšų (karnizų) apdaila lentelėmis ar skarda. Tvarkingas pakalimas suteikia pastatui vizualinį vientisumą ir apsaugo konstrukcijas nuo paukščių bei graužikų patekimo.",
  },
  {
    q: "Ar verta rinktis pigiausią pasiūlymą?",
    a: "Ne visada. Pigiausi pasiūlymai dažnai slepia nepatyrusių meistrų klaidas, kurias ištaisyti vėliau kainuoja dvigubai brangiau. Vertinkite atsiliepimus, patirtį ir kainos sudėtį, ne tik galutinę sumą.",
  },
];

export const metadata = buildPageSeo({
  kind: "article",
  title: "Stogo darbai: kaina, etapai ir kaip rinktis stogdengius",
  description:
    "Kiek kainuoja stogo dengimo darbai, nuo ko priklauso stogo darbų kaina ir kaip pasirinkti patikimus stogdengius — etapai, įkainiai ir patarimai.",
  path: PATH,
  heroImageUrl: HERO_IMAGE,
}).metadata;

export default function Page() {
  const url = `${BASE_URL}${PATH}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: H1,
    description:
      "Kiek kainuoja stogo dengimo darbai, nuo ko priklauso stogo darbų kaina ir kaip pasirinkti patikimus stogdengius.",
    image: HERO_IMAGE,
    datePublished: PUBLISHED,
    dateModified: PUBLISHED,
    author: { "@type": "Organization", name: "paslaugurinka.lt", url: BASE_URL },
    publisher: { "@type": "Organization", name: "paslaugurinka.lt", url: BASE_URL },
    mainEntityOfPage: url,
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Pradžia", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Stogo darbai", item: url },
    ],
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="min-h-screen bg-white dark:bg-surface-950">
      <JsonLd schema={articleSchema} />
      <JsonLd schema={breadcrumbSchema} />
      <JsonLd schema={faqSchema} />

      <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10">
        <nav aria-label="Naršymo kelias">
          <ol className="flex flex-wrap items-center gap-1.5 text-body-sm text-surface-500 dark:text-surface-400">
            <li><Link href="/" className="hover:text-brand-600 transition-colors">Pradžia</Link></li>
            <li aria-hidden className="text-surface-300">/</li>
            <li className="text-surface-500 dark:text-surface-400">Straipsniai</li>
            <li aria-hidden className="text-surface-300">/</li>
            <li className="text-surface-700 dark:text-surface-300">Stogo darbai</li>
          </ol>
        </nav>

        <h1 className="mt-6 text-3xl font-bold tracking-[-0.03em] text-surface-900 sm:text-[40px] sm:leading-[1.1] dark:text-white">
          {H1}
        </h1>

        <p className="mt-5 text-body-lg leading-relaxed text-surface-700 dark:text-surface-200">
          Stogas yra vienas svarbiausių namo konstrukcinių elementų — saugo pastatą nuo drėgmės,
          aplinkos poveikio ir šilumos praradimo. Kad investicija atsipirktų, o rezultatas
          džiugintų dešimtmečius, kokybiški <strong>stogo darbai</strong> turi būti patikėti
          tik savo srities profesionalams. Patyrę{" "}
          <Link href={browseRoofersHref} className="text-brand-700 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-600 dark:text-brand-300">
            stogdengiai
          </Link>{" "}
          padeda pasirinkti tinkamas medžiagas ir užtikrina, kad visi procesai — nuo konstrukcijos
          montavimo iki apdailos — bus atlikti be klaidų.
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl shadow-sm ring-1 ring-surface-200/60 dark:ring-surface-800">
          <Image
            src={HERO_IMAGE}
            alt={HERO_ALT}
            width={1536}
            height={1024}
            priority
            className="h-full w-full object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>

        <p className="mt-6 text-body leading-relaxed text-surface-600 dark:text-surface-300">
          Šiame straipsnyje aptarsime, kaip formuojama <strong>stogo darbų kaina</strong>, į ką
          atkreipti dėmesį renkantis meistrus ir kokie etapai lemia galutines išlaidas.
        </p>

        {/* Kaina */}
        <h2 className="mt-12 text-2xl font-bold tracking-[-0.02em] text-surface-900 sm:text-3xl dark:text-white">
          Nuo ko priklauso stogo darbų kaina?
        </h2>
        <p className="mt-3 text-body leading-relaxed text-surface-600 dark:text-surface-300">
          Planuojant biudžetą natūraliai kyla klausimas — kokie yra preliminarūs stogo darbų
          įkainiai? Vieno universalaus atsakymo nėra: galutinę sąmatą lemia objekto sudėtingumas,
          stogo plotas, pasirinkta danga ir papildomi elementai.
        </p>
        <ul className="mt-5 space-y-4">
          <li className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <span className="text-body leading-relaxed text-surface-700 dark:text-surface-200">
              <strong>Stogo konstrukcija.</strong> Šlaitinio stogo dengimas skiriasi nuo plokščiojo,
              o sudėtingi, daug kampų turintys projektai reikalauja daugiau laiko ir kruopštumo.
            </span>
          </li>
          <li className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <span className="text-body leading-relaxed text-surface-700 dark:text-surface-200">
              <strong>Medžiagų pasirinkimas.</strong> Klasikinės čerpės, skarda ar prilydoma danga
              reikalauja skirtingos specifikos — prilydomos stogo dangos darbų kaina dažniausiai
              skiriasi nuo modulinių skardinių stogų montavimo įkainių.
            </span>
          </li>
          <li className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <span className="text-body leading-relaxed text-surface-700 dark:text-surface-200">
              <strong>Sezoniškumas ir lokacija.</strong> Regionas taip pat turi įtakos: pavyzdžiui,{" "}
              <Link href="/paslaugos/stogo-dengimas-vilniuje" className="text-brand-700 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-600 dark:text-brand-300">
                stogo darbai Vilniuje
              </Link>{" "}
              ir kituose didžiuosiuose miestuose gali turėti kiek kitokią kainodarą dėl didesnės
              paklausos ir meistrų užimtumo.
            </span>
          </li>
        </ul>

        {/* Etapai */}
        <h2 className="mt-12 text-2xl font-bold tracking-[-0.02em] text-surface-900 sm:text-3xl dark:text-white">
          Pagrindiniai stogo dengimo darbai: etapai ir procesai
        </h2>
        <p className="mt-3 text-body leading-relaxed text-surface-600 dark:text-surface-300">
          Profesionaliai atliekami <strong>stogo dengimo darbai</strong> susideda iš kelių etapų.
          Kiekvienas jų kritiškai svarbus pastato ilgaamžiškumui.
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl shadow-sm ring-1 ring-surface-200/60 dark:ring-surface-800">
          <Image
            src={WORK_IMAGE}
            alt={WORK_ALT}
            width={1024}
            height={1024}
            className="h-full w-full object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
          />
        </div>

        <h3 className="mt-8 text-xl font-semibold text-surface-900 dark:text-white">
          1. Senos dangos keitimas arba naujos montavimas
        </h3>
        <p className="mt-2 text-body leading-relaxed text-surface-600 dark:text-surface-300">
          Jei atliekama renovacija, pirmiausia skaičiuojama stogo keitimo darbų kaina. Procesas
          apima senos dangos demontavimą, konstrukcijos patikrinimą ir, jei reikia, jos stiprinimą.
          Naujos statybos atveju pradedama nuo murlotų ir gegnių sistemos montavimo.
        </p>

        <h3 className="mt-6 text-xl font-semibold text-surface-900 dark:text-white">
          2. Izoliacija ir dengimas
        </h3>
        <p className="mt-2 text-body leading-relaxed text-surface-600 dark:text-surface-300">
          Šiame etape klojamos hidroizoliacinės bei difuzinės plėvelės, montuojami grebėstai ir
          dengiama pasirinkta danga. Jei pastatui reikalingas plokščias stogas, svarbu pasidomėti,
          kokios rinkoje yra prilydomos stogo dangos darbų kainos — teisingai prilydyta
          hidroizoliacija apsaugo pastatą nuo pratekėjimų rizikos.
        </p>

        <h3 className="mt-6 text-xl font-semibold text-surface-900 dark:text-white">
          3. Apdailos ir stogo pakalimo darbai
        </h3>
        <p className="mt-2 text-body leading-relaxed text-surface-600 dark:text-surface-300">
          Uždėjus pagrindinę dangą procesas nesibaigia. Kad stogas atrodytų estetiškai ir būtų
          pilnai apsaugotas, atliekami <strong>stogo pakalimo darbai</strong>. Tvarkingas pakalimas
          ne tik suteikia pastatui vizualinį vientisumą, bet ir apsaugo konstrukcijas nuo paukščių
          ar smulkių graužikų patekimo.
        </p>

        {/* Kaina / lentelė */}
        <h2 className="mt-12 text-2xl font-bold tracking-[-0.02em] text-surface-900 sm:text-3xl dark:text-white">
          Kiek kainuoja stogo dengimo darbai ir kaip sutaupyti?
        </h2>
        <p className="mt-3 text-body leading-relaxed text-surface-600 dark:text-surface-300">
          Svarstant, kiek kainuoja stogo dengimo darbai, svarbu vertinti ne tik momentines
          išlaidas, bet ir ilgalaikę perspektyvą. Toliau — iš ko susideda dažniausių darbų kaina.
        </p>

        <div className="mt-6 overflow-hidden rounded-2xl border border-surface-200/60 dark:border-surface-700/50">
          <table className="w-full text-left text-body-sm">
            <thead>
              <tr className="bg-surface-50 dark:bg-surface-900/50">
                <th className="px-5 py-3 font-semibold text-surface-900 dark:text-white">Darbų tipas</th>
                <th className="px-5 py-3 font-semibold text-surface-900 dark:text-white">Kas sudaro kainą</th>
              </tr>
            </thead>
            <tbody>
              {PRICING.map((row, i) => (
                <tr key={row.type} className={i % 2 ? "bg-surface-50/50 dark:bg-surface-800/30" : ""}>
                  <td className="px-5 py-3 align-top font-medium text-surface-900 dark:text-white whitespace-nowrap">{row.type}</td>
                  <td className="px-5 py-3 text-surface-700 dark:text-surface-200">{row.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-body-sm text-surface-500 dark:text-surface-400">
          Pigiausi pasiūlymai dažnai slepia nepatyrusių meistrų klaidas, kurias ištaisyti kainuoja
          dvigubai brangiau. Palyginkite kelis pasiūlymus ir vertinkite kainos sudėtį, ne tik sumą.
        </p>

        {/* Vidiniai linkai į miestus */}
        <div className="mt-10 rounded-2xl bg-surface-50/70 p-5 dark:bg-surface-900/40">
          <p className="text-body-sm font-semibold text-surface-900 dark:text-white">Stogo dengimo darbai pagal miestą</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            <li>
              <Link href="/paslaugos/stogo-dengimas-kaune" className="inline-flex items-center rounded-full border border-surface-200 bg-white px-3.5 py-1.5 text-body-sm text-surface-700 transition-shadow hover:shadow-sm dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200">
                Stogo dengimas Kaune
              </Link>
            </li>
            <li>
              <Link href="/paslaugos/stogo-dengimas-vilniuje" className="inline-flex items-center rounded-full border border-surface-200 bg-white px-3.5 py-1.5 text-body-sm text-surface-700 transition-shadow hover:shadow-sm dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200">
                Stogo dengimas Vilniuje
              </Link>
            </li>
            <li>
              <Link href="/paslaugos/stogo-dengimas-klaipedoje" className="inline-flex items-center rounded-full border border-surface-200 bg-white px-3.5 py-1.5 text-body-sm text-surface-700 transition-shadow hover:shadow-sm dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200">
                Stogo dengimas Klaipėdoje
              </Link>
            </li>
          </ul>
        </div>

        {/* FAQ */}
        <h2 className="mt-12 text-2xl font-bold tracking-[-0.02em] text-surface-900 sm:text-3xl dark:text-white">
          Dažni klausimai
        </h2>
        <div className="mt-6 divide-y divide-surface-100 dark:divide-surface-800">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-body font-semibold text-surface-900 dark:text-white">
                {item.q}
                <span className="text-surface-400 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-body-sm leading-relaxed text-surface-600 dark:text-surface-300">{item.a}</p>
            </details>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 rounded-3xl bg-brand-600 px-6 py-10 text-center sm:px-10">
          <h2 className="text-2xl font-bold tracking-[-0.02em] text-white sm:text-3xl">
            Reikia patikimų stogdengių?
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-body text-white/90">
            Aprašykite stogo darbus per 2 minutes ir nemokamai gaukite pasiūlymus iš patikrintų
            specialistų. Palyginkite kainas ir pasirinkite geriausią.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={requestHref} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3 text-body font-semibold text-brand-700 shadow-sm transition-shadow hover:shadow-md">
              Gauti pasiūlymus nemokamai
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href={browseRoofersHref} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-7 py-3 text-body font-semibold text-white transition-colors hover:bg-white/10">
              Naršyti stogdengius
            </Link>
          </div>
          <p className="mt-5 flex items-center justify-center gap-1.5 text-body-sm text-white/80">
            <ShieldCheck className="h-4 w-4" /> Patikrinti specialistai
            <span className="mx-1">·</span>
            <Phone className="h-4 w-4" /> Atsakymai tą pačią dieną
          </p>
        </div>
      </article>
    </div>
  );
}
