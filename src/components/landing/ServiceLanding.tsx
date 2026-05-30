import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  Clock,
  Wallet,
  CheckCircle2,
  PencilLine,
  Users,
  ThumbsUp,
  Phone,
  ArrowRight,
} from "lucide-react";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildPageSeo, BASE_URL } from "@/lib/seo/page-seo";

/**
 * Config-driven template for keyword-targeted service landing pages
 * (e.g. /paslaugos/elektrikas-kaune). One template, many pages: each page is a
 * thin config + AI images. Keeps SEO (title/canonical/robots/JSON-LD) and the
 * lead-gen flow (prefilled request) identical across the whole series.
 */
export interface ServiceLandingConfig {
  /** Absolute route path, e.g. "/paslaugos/elektrikas-kaune". */
  path: string;
  /** City served, e.g. "Kaunas". Used in copy, schema and the request prefill. */
  city: string;
  /** Provider category slug for the browse link + request prefill. */
  categorySlug: string;
  /** schema.org Service serviceType, e.g. "Elektriko paslaugos". */
  serviceType: string;

  seoTitle: string;
  seoDescription: string;

  heroBadge: string;
  heroBadgeIcon: LucideIcon;
  h1: string;
  heroLead: string;

  images: { hero: string; work: string; consult: string };
  imageAlts: { hero: string; work: string; consult: string };

  servicesHeading: string;
  servicesLead: string;
  services: { icon: LucideIcon; title: string; text: string }[];

  pricingHeading: string;
  pricing: { job: string; price: string }[];
  /** schema.org Offer lowest price, e.g. "15". */
  offerPrice: string;

  faq: { q: string; a: string }[];

  /** Prefilled, ready-to-post request. */
  request: { title: string; description: string };
  finalCtaTitle: string;
}

export function serviceLandingMetadata(config: ServiceLandingConfig): Metadata {
  return buildPageSeo({
    kind: "landing",
    title: config.seoTitle,
    description: config.seoDescription,
    path: config.path,
    heroImageUrl: config.images.hero,
  }).metadata;
}

const WHY_US: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: ShieldCheck, title: "Patikrinti meistrai", text: "Atsiliepimai ir įvertinimai padeda rinktis užtikrintai." },
  { icon: Wallet, title: "Skaidrios kainos", text: "Gaukite kelis pasiūlymus ir palyginkite be įsipareigojimų." },
  { icon: CheckCircle2, title: "Be tarpininkų", text: "Susisiekiate ir deratės tiesiogiai su specialistu." },
];

export function ServiceLanding({ config }: { config: ServiceLandingConfig }) {
  const { city } = config;
  const url = `${BASE_URL}${config.path}`;

  const requestHref =
    `/uzklausos/nauja?title=${encodeURIComponent(config.request.title)}` +
    `&category=${encodeURIComponent(config.categorySlug)}` +
    `&location=${encodeURIComponent(city)}` +
    `&description=${encodeURIComponent(config.request.description)}`;
  const browseHref = `/meistrai?category=${encodeURIComponent(config.categorySlug)}&location=${encodeURIComponent(city)}`;

  const steps: { icon: LucideIcon; title: string; text: string }[] = [
    { icon: PencilLine, title: "Aprašykite darbą", text: `Per 2 minutes nurodykite, ko reikia, ir savo rajoną ${city}e. Nemokamai.` },
    { icon: Users, title: "Gaukite pasiūlymus", text: "Patikrinti specialistai patys pateikia kainas ir terminus." },
    { icon: ThumbsUp, title: "Pasirinkite geriausią", text: "Palyginkite atsiliepimus bei kainas ir susisiekite tiesiogiai." },
  ];

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: config.serviceType,
    name: `${config.serviceType} ${city}e`,
    description: config.seoDescription,
    url,
    areaServed: { "@type": "City", name: city, containedInPlace: { "@type": "Country", name: "Lietuva" } },
    provider: { "@type": "Organization", name: "paslaugurinka.lt", url: BASE_URL },
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: config.offerPrice,
      description: `${config.serviceType} ${city}e nuo ${config.offerPrice} €. Pasiūlymų gavimas nemokamas.`,
    },
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Pradžia", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Paslaugos", item: `${BASE_URL}/paslaugos` },
      { "@type": "ListItem", position: 3, name: config.h1, item: url },
    ],
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: config.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const BadgeIcon = config.heroBadgeIcon;

  return (
    <div className="min-h-screen bg-white dark:bg-surface-950">
      <JsonLd schema={serviceSchema} />
      <JsonLd schema={breadcrumbSchema} />
      <JsonLd schema={faqSchema} />

      <nav aria-label="Naršymo kelias" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-6">
        <ol className="flex flex-wrap items-center gap-1.5 text-body-sm text-surface-500 dark:text-surface-400">
          <li><Link href="/" className="hover:text-brand-600 transition-colors">Pradžia</Link></li>
          <li aria-hidden className="text-surface-300">/</li>
          <li className="text-surface-700 dark:text-surface-300">{config.h1}</li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-body-sm font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              <BadgeIcon className="h-3.5 w-3.5" /> {config.heroBadge}
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-[-0.03em] text-surface-900 sm:text-[44px] sm:leading-[1.05] dark:text-white">
              {config.h1}
            </h1>
            <p className="mt-4 max-w-xl text-body text-surface-600 dark:text-surface-300">{config.heroLead}</p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href={requestHref} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-body font-semibold text-white shadow-sm transition-shadow hover:shadow-md">
                Gauti pasiūlymus nemokamai
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href={browseHref} className="inline-flex items-center justify-center gap-2 rounded-xl border border-surface-200 bg-white px-6 py-3 text-body font-semibold text-surface-800 transition-shadow hover:shadow-sm dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100">
                Naršyti specialistus
              </Link>
            </div>

            <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-body-sm text-surface-600 dark:text-surface-300">
              <li className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-brand-600" /> Patikrinti specialistai</li>
              <li className="inline-flex items-center gap-1.5"><Wallet className="h-4 w-4 text-brand-600" /> Nemokami pasiūlymai</li>
              <li className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-brand-600" /> Atsakymai tą pačią dieną</li>
            </ul>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-3xl shadow-sm ring-1 ring-surface-200/60 dark:ring-surface-800">
              <Image src={config.images.hero} alt={config.imageAlts.hero} width={1536} height={1024} priority className="h-full w-full object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-surface-100 bg-surface-50/60 dark:border-surface-800 dark:bg-surface-900/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-14">
          <h2 className="text-center text-2xl font-bold tracking-[-0.02em] text-surface-900 sm:text-3xl dark:text-white">Kaip tai veikia</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-body text-surface-500 dark:text-surface-400">Nuo užklausos iki pasirinkto specialisto — per kelias valandas.</p>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-surface-200/60 bg-white p-6 dark:border-surface-700/50 dark:bg-surface-900/50">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300"><step.icon className="h-5 w-5" /></div>
                <div className="mt-4 text-body-sm font-semibold text-brand-600">{i + 1} žingsnis</div>
                <h3 className="mt-1 text-body font-semibold text-surface-900 dark:text-white">{step.title}</h3>
                <p className="mt-1.5 text-body-sm text-surface-600 dark:text-surface-300">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="order-2 overflow-hidden rounded-3xl shadow-sm ring-1 ring-surface-200/60 dark:ring-surface-800 lg:order-1">
            <Image src={config.images.work} alt={config.imageAlts.work} width={1024} height={1024} className="h-full w-full object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-2xl font-bold tracking-[-0.02em] text-surface-900 sm:text-3xl dark:text-white">{config.servicesHeading}</h2>
            <p className="mt-2 text-body text-surface-600 dark:text-surface-300">{config.servicesLead}</p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {config.services.map((s) => (
                <div key={s.title} className="rounded-2xl border border-surface-200/60 bg-white p-5 transition-shadow hover:shadow-sm dark:border-surface-700/50 dark:bg-surface-900/50">
                  <s.icon className="h-5 w-5 text-brand-600" />
                  <h3 className="mt-3 text-body font-semibold text-surface-900 dark:text-white">{s.title}</h3>
                  <p className="mt-1 text-body-sm text-surface-600 dark:text-surface-300">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-y border-surface-100 bg-surface-50/60 dark:border-surface-800 dark:bg-surface-900/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold tracking-[-0.02em] text-surface-900 sm:text-3xl dark:text-white">{config.pricingHeading}</h2>
              <p className="mt-2 text-body text-surface-600 dark:text-surface-300">Orientacinės kainos. Tikslią sumą specialistas nurodo pasiūlyme, kai mato konkretų darbą.</p>
              <div className="mt-6 overflow-hidden rounded-2xl border border-surface-200/60 bg-white dark:border-surface-700/50 dark:bg-surface-900/50">
                <table className="w-full text-left text-body-sm">
                  <tbody>
                    {config.pricing.map((row, i) => (
                      <tr key={row.job} className={i % 2 ? "bg-surface-50/50 dark:bg-surface-800/30" : ""}>
                        <td className="px-5 py-3 text-surface-700 dark:text-surface-200">{row.job}</td>
                        <td className="px-5 py-3 text-right font-semibold text-surface-900 dark:text-white whitespace-nowrap">{row.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-body-sm text-surface-500 dark:text-surface-400">Kainos pateiktos kaip orientyras ir gali skirtis pagal objektą bei medžiagas.</p>
            </div>
            <div className="overflow-hidden rounded-3xl shadow-sm ring-1 ring-surface-200/60 dark:ring-surface-800">
              <Image src={config.images.consult} alt={config.imageAlts.consult} width={1024} height={1024} className="h-full w-full object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
            </div>
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-center text-2xl font-bold tracking-[-0.02em] text-surface-900 sm:text-3xl dark:text-white">Kodėl ieškoti čia</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {WHY_US.map((b) => (
            <div key={b.title} className="rounded-2xl border border-surface-200/60 bg-white p-6 dark:border-surface-700/50 dark:bg-surface-900/50">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300"><b.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 text-body font-semibold text-surface-900 dark:text-white">{b.title}</h3>
              <p className="mt-1.5 text-body-sm text-surface-600 dark:text-surface-300">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-surface-100 dark:border-surface-800">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold tracking-[-0.02em] text-surface-900 sm:text-3xl dark:text-white">Dažni klausimai</h2>
          <div className="mt-8 divide-y divide-surface-100 dark:divide-surface-800">
            {config.faq.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-body font-semibold text-surface-900 dark:text-white">
                  {item.q}
                  <span className="text-surface-400 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-body-sm leading-relaxed text-surface-600 dark:text-surface-300">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-3xl bg-brand-600 px-6 py-12 text-center sm:px-12">
          <h2 className="text-2xl font-bold tracking-[-0.02em] text-white sm:text-3xl">{config.finalCtaTitle}</h2>
          <p className="mx-auto mt-2 max-w-xl text-body text-white/90">Aprašykite darbą per 2 minutes ir gaukite pasiūlymus iš patikrintų specialistų. Nemokamai.</p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={requestHref} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3 text-body font-semibold text-brand-700 shadow-sm transition-shadow hover:shadow-md">
              Paskelbti užklausą
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/kontaktai" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/30 px-7 py-3 text-body font-semibold text-white transition-colors hover:bg-white/10">
              <Phone className="h-4 w-4" /> Susisiekti
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
