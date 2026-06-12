import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import HeroSearch from "@/components/marketing/HeroSearch";
import ProviderCtaLink from "@/components/marketing/ProviderCtaLink";
import RecentRequestBanner from "@/components/guest/RecentRequestBanner";
import { prisma } from "@/lib/prisma";
import { formatRelativeDate, truncate } from "@/lib/utils";
import { BUDGET_OPTIONS } from "@/lib/constants";
import {
  getServiceCategoryGroups,
} from "@/lib/service-categories";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sparkles, ArrowRight, MapPin, Clock,
  MessageSquare, FileText, Users, ShieldCheck, Check, Package, Maximize2, Search, Tag,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Raskite geriausius paslaugų tiekėjus Lietuvoje",
  description:
    "PaslaugųRinka – patikima platforma paslaugų paieškai. Pateikite užklausą ir gaukite pasiūlymus iš patikrintų specialistų per kelias minutes.",
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL || "https://paslaugurinka.lt",
  },
};

const AVATARS = [
  { initials: "JK", color: "#C25E3A" },
  { initials: "RM", color: "#5E8C50" },
  { initials: "AB", color: "#5A79A4" },
  { initials: "GT", color: "#7C6AA6" },
  { initials: "VL", color: "#B08A2E" },
  { initials: "DP", color: "#9A6440" },
];

const HOW_IT_WORKS = [
  {
    title: "Aprašyk užduotį",
    desc: "Užpildyk trumpą formą — ką reikia padaryti, kur ir kada.",
    icon: <FileText className="h-7 w-7" />,
  },
  {
    title: "Gauk pasiūlymus",
    desc: "Patikrinti specialistai peržiūri tavo užklausą ir atsiunčia pasiūlymus.",
    icon: <Users className="h-7 w-7" />,
  },
  {
    title: "Pasirink geriausią",
    desc: "Palygink kainas bei atsiliepimus ir susisiek tiesiogiai.",
    icon: <ShieldCheck className="h-7 w-7" />,
  },
];

const HOME_PAGE_FALLBACK_DATA = {
  recentRequests: [] as Array<{
    id: string;
    title: string;
    description: string;
    categoryRef: { name: string; slug: string } | null;
    location: string;
    budget: string | null;
    createdAt: Date;
    _count: { responses: number };
  }>,
  providerCount: 0,
  requestCount: 0,
  responseCount: 0,
};

const FAQ_ITEMS = [
  {
    value: "free",
    question: "Ar klientams platforma nemokama?",
    answer:
      "Taip. Užklausą galite pateikti nemokamai ir be įsipareigojimo. Pirmiausia gaunate pasiūlymus, o tik tada sprendžiate ar norite tęsti su pasirinktu tiekėju.",
  },
  {
    value: "speed",
    question: "Per kiek laiko gausiu pasiūlymų?",
    answer:
      "Dažniausiai pirmų atsakymų sulaukiama tą pačią dieną, o skubesnėse kategorijose ir greičiau. Tikslus greitis priklauso nuo miesto, kategorijos ir užklausos aiškumo.",
  },
  {
    value: "registration",
    question: "Ar reikia registracijos, kad pateikčiau užklausą?",
    answer:
      "Ne būtinai. Užklausą galite pateikti ir be pilnos registracijos, tačiau paskyra leidžia patogiau sekti savo užklausas, pasiūlymus ir žinutes vienoje vietoje.",
  },
  {
    value: "providers",
    question: "Kaip tiekėjai gauna užklausas?",
    answer:
      "Tiekėjai mato užklausas pagal savo specializacijas ir vietovę. Tai reiškia, kad santechnikas nemato elektros darbų kaip tinkamų atsakymui, o klientai gauna labiau taiklius pasiūlymus.",
  },
  {
    value: "contacts",
    question: "Kada tiekėjas mato mano kontaktus?",
    answer:
      "Kontaktų matomumas priklauso nuo tiekėjo plano ir konkretaus platformos flow. Pagrindinis tikslas yra pirmiausia leisti gauti pasiūlymą, o tada pereiti prie tiesioginio kontakto tada, kai yra realus susidomėjimas.",
  },
  {
    value: "trust",
    question: "Kaip žinoti, ar tiekėjas patikimas?",
    answer:
      "Platformoje galite matyti tiekėjo profilį, aprašymą, specializacijas, darbų pavyzdžius, planą ir atsiliepimus. Ilgainiui tai padeda greičiau atsirinkti patikimiausius specialistus.",
  },
];

async function getHomePageData() {
  "use cache";
  cacheLife({ revalidate: 60 });
  cacheTag("home-data", "providers", "requests");

  try {
    const [recentRequests, providerCount, requestCount, responseCount] = await Promise.all([
      prisma.serviceRequest.findMany({
        where: { status: "OPEN", moderationStatus: "APPROVED" },
        select: {
          id: true,
          title: true,
          description: true,
          categoryRef: { select: { name: true, slug: true } },
          location: true,
          budget: true,
          createdAt: true,
          _count: { select: { responses: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      prisma.user.count({
        where: {
          role: "PROVIDER",
          emailVerified: { not: null },
          providerProfile: { isActive: true, moderationStatus: "APPROVED" },
        },
      }),
      prisma.serviceRequest.count(),
      prisma.response.count(),
    ]);

    return {
      recentRequests,
      providerCount,
      requestCount,
      responseCount,
    };
  } catch (error) {
    console.error("Home page data error:", error);
    return HOME_PAGE_FALLBACK_DATA;
  }
}

export default function HomePage() {
  // Cache Components: the page body fetches data + formats relative dates
  // (new Date()) — stream it inside a Suspense so the rest of the layout
  // can prerender.
  return (
    // Reserve the hero's viewport height while the dynamic content streams in.
    // With fallback={null} the prerendered shell had an empty <main>, so the
    // footer painted near the top and then jumped a full viewport down once the
    // content arrived — a ~0.84 layout shift. Reserving the height keeps the
    // footer below the fold from first paint, so CLS stays ~0.
    <Suspense fallback={<div className="min-h-[calc(100svh-72px)]" aria-hidden />}>
      <HomePageContent />
    </Suspense>
  );
}

async function HomePageContent() {
  await connection();
  const [
    { recentRequests, providerCount, requestCount, responseCount },
    categoryGroups,
  ] = await Promise.all([getHomePageData(), getServiceCategoryGroups()]);

  // Depth-1 categories are the granular services users actually pick — the
  // roots are just group headers, so they don't count toward the stat.
  const categoryCount = categoryGroups.reduce(
    (sum, group) => sum + group.categories.length,
    0,
  );

  const budgetLabel = (val: string) =>
    BUDGET_OPTIONS.find((b) => b.value === val)?.label || val;

  const trustCount = Math.max(providerCount, requestCount);
  const trustText =
    trustCount >= 25
      ? `Mumis pasitiki ${Math.floor(trustCount / 10) * 10}+ žmonių visoje Lietuvoje`
      : "Patikrinti specialistai iš visos Lietuvos";

  const stats = [
    { value: providerCount || 1, label: "Specialistų" },
    { value: requestCount || 1, label: "Pateiktų užklausų" },
    { value: responseCount || 1, label: "Pateiktų pasiūlymų" },
    { value: categoryCount || 1, label: "Kategorijų" },
  ];

  return (
    <div>
      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="relative flex min-h-[calc(100svh-72px)] flex-col overflow-hidden">
        {/* Warm glow behind the headline */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[38%] h-[440px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface-50/75 blur-3xl dark:bg-surface-800/30"
        />

        {/* Floating decorations (wide screens only) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[5] hidden xl:block">
          {/* Left — dashed journey path with nodes */}
          <div className="absolute left-[1.5%] top-[15%] h-[70%] w-[360px]">
            <svg viewBox="0 0 360 600" className="h-full w-full" fill="none">
              <path
                d="M250,28 C200,140 108,180 106,308 C104,438 168,500 212,576"
                className="stroke-surface-300 dark:stroke-surface-800"
                strokeWidth="2"
                strokeDasharray="5 7"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute" style={{ left: "69%", top: "5%", transform: "translate(-50%,-50%)" }}>
              <div className="grid h-[58px] w-[58px] place-items-center rounded-full bg-brand-100 ring-1 ring-brand-100 dark:bg-brand-600 dark:ring-brand-600">
                <Package className="h-6 w-6 text-brand-500 dark:text-brand-300" />
              </div>
            </div>
            <div className="absolute" style={{ left: "30%", top: "52%", transform: "translate(-50%,-50%)" }}>
              <div className="relative grid h-[58px] w-[58px] place-items-center rounded-full bg-success-soft ring-1 ring-success/30 dark:bg-success/10 dark:ring-success/25">
                <Search className="h-6 w-6 text-success dark:text-success" />
                <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 translate-y-full rounded-md bg-surface-700 px-2 py-[3px] text-micro font-medium text-white">
                  Tu
                </span>
              </div>
            </div>
            <div className="absolute" style={{ left: "58%", top: "96%", transform: "translate(-50%,-50%)" }}>
              <div className="grid h-[58px] w-[58px] place-items-center rounded-full bg-surface-200 ring-1 ring-surface-200 dark:bg-surface-800 dark:ring-surface-700">
                <Check className="h-6 w-6 text-surface-500 dark:text-surface-300" />
              </div>
            </div>
          </div>

          {/* Right — sample request card */}
          <div className="absolute right-[2.5%] top-[16%] w-[256px] rotate-[2.5deg]">
            <div className="rounded-2xl border border-surface-100 bg-surface-50 p-4 shadow-lg dark:border-surface-800 dark:bg-surface-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-surface-500 dark:text-surface-400">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="text-micro font-medium">Nauja užklausa</span>
                </div>
                <Maximize2 className="h-3 w-3 text-surface-400 dark:text-surface-500" />
              </div>
              <p className="mt-2.5 text-caption font-semibold leading-snug text-surface-900 dark:text-surface-100">
                Vonios kambario remontas — Vilnius
              </p>
              <div className="mt-3 space-y-1.5">
                <div className="h-1.5 w-full rounded-full bg-surface-0 dark:bg-surface-800" />
                <div className="h-1.5 w-3/4 rounded-full bg-surface-0 dark:bg-surface-800" />
              </div>
              <div className="mt-3.5 flex items-center justify-between border-t border-surface-0 pt-2.5 dark:border-surface-800">
                <span className="text-micro text-surface-500 dark:text-surface-400">6 specialistai atsakė</span>
                <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-500 text-micro font-bold text-white">
                  P
                </span>
              </div>
            </div>
          </div>

          {/* Right — sticky note tip + hand-drawn arrow pointing at the AI button */}
          <div className="absolute right-[4%] top-[45%] w-[242px] -rotate-[5deg]">
            <div className="rounded-xl bg-warning/20 p-4 shadow-lg">
              <p className="text-caption leading-relaxed text-warning-strong">
                <span className="font-bold">Patarimas:</span> nežinai, kaip
                aprašyti? Spausk{" "}
                {/* eslint-disable-next-line react/no-unescaped-entities */}
                <span className="font-semibold">"Sutvarkyti aprašymą"</span> —
                dirbtinis intelektas sutvarkys tekstą ir patars, ką dar pridėti.
              </p>
            </div>
          </div>

          {/* Hand-drawn arrow from the tip down to the AI button */}
          <div className="absolute left-[62%] top-[58%] h-[185px] w-[300px]">
            <svg
              viewBox="0 0 300 185"
              className="h-full w-full stroke-brand-500"
              fill="none"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M256,28 C240,82 214,110 122,128" />
              <path d="M137,132 L122,128 L135,118" />
            </svg>
          </div>
        </div>

        {/* Centered content */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pt-12 pb-10">
          <span className="mb-7 inline-flex items-center rounded-full bg-surface-900 px-3.5 py-1.5 text-xs font-medium tracking-wide text-surface-0 dark:bg-surface-800 dark:text-surface-200">
            Paslaugų rinka
          </span>
          <h1 className="text-center text-display font-bold leading-[1.05] tracking-tight text-surface-900 dark:text-surface-50 sm:text-display-xl lg:text-display-xl">
            Rask specialistą,
            <br />
            kurio tikrai reikia
          </h1>
          <p className="mt-5 max-w-xl text-center text-lg leading-relaxed text-surface-500 dark:text-surface-300">
            Aprašyk paprastais žodžiais, ko reikia, ir gauk pasiūlymų iš
            specialistų visoje Lietuvoje.
          </p>
          <div className="mt-9 flex w-full justify-center">
            <HeroSearch />
          </div>
        </div>

        {/* Social proof */}
        <div className="relative z-10 flex justify-center px-6 pb-12">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {AVATARS.map((a) => (
                <span
                  key={a.initials}
                  className="grid h-9 w-9 place-items-center rounded-full text-micro font-semibold text-white ring-2 ring-surface-0 dark:ring-surface-900"
                  style={{ backgroundColor: a.color }}
                >
                  {a.initials}
                </span>
              ))}
            </div>
            <span className="text-sm text-surface-500 dark:text-surface-300">{trustText}</span>
          </div>
        </div>
      </section>

      {/* Guest request recovery */}
      <div className="mx-auto max-w-2xl px-6 [&:not(:empty)]:py-8">
        <RecentRequestBanner />
      </div>

      {/* ──────────────────── Recent requests ──────────────────── */}
      {recentRequests.length > 0 && (
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-6">
            <div className="mb-12 text-center">
              <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-wider text-brand-500 dark:text-brand-400">
                Naujausi darbai
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50 sm:text-4xl">
                Ką šiuo metu ieško klientai
              </h2>
              <p className="mt-3 text-surface-500 dark:text-surface-300">
                Peržiūrėk naujausias užklausas ir pateik savo pasiūlymą
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {recentRequests.map((r) => (
                <Link
                  key={r.id}
                  href="/uzklausos"
                  className="group rounded-2xl border border-surface-100 bg-surface-50 p-5 transition-all hover:-translate-y-0.5 hover:border-surface-200 hover:shadow-lg dark:border-surface-800 dark:bg-surface-900 dark:hover:border-surface-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-1 font-semibold text-surface-900 dark:text-surface-100">
                      {r.title}
                    </h3>
                    {r.budget && (
                      <span className="shrink-0 text-sm font-semibold text-brand-500 dark:text-brand-400">
                        {budgetLabel(r.budget)}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-surface-500 dark:text-surface-400">
                    {truncate(r.description, 100)}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {r.categoryRef?.name && (
                      <span className="rounded-lg bg-surface-100 px-2.5 py-1 text-xs font-medium text-brand-600 dark:bg-brand-950/60 dark:text-brand-300">
                        {r.categoryRef.name}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400">
                      <MapPin className="h-3 w-3" />
                      {r.location}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3 border-t border-surface-0 pt-3 text-xs text-surface-500 dark:border-surface-800 dark:text-surface-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatRelativeDate(r.createdAt)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {r._count.responses} pasiūl.
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                href="/uzklausos"
                className="group inline-flex items-center gap-2 rounded-full border border-surface-200 bg-surface-50 px-5 py-2.5 text-sm font-semibold text-surface-900 transition-colors hover:bg-white dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:hover:bg-surface-700"
              >
                Visos užklausos
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ───────────────────── How it works ───────────────────── */}
      <section id="kaip-veikia" className="scroll-mt-24 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-wider text-brand-500 dark:text-brand-400">
              Kaip tai veikia
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50 sm:text-4xl">
              Trys paprasti žingsniai
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((item, idx) => (
              <div
                key={item.title}
                className="relative rounded-2xl border border-surface-100 bg-surface-50 p-8 dark:border-surface-800 dark:bg-surface-900"
              >
                <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-brand-500 text-lg font-bold text-white">
                  {idx + 1}
                </div>
                <div className="absolute right-6 top-6 text-surface-100 dark:text-surface-700">
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-surface-500 dark:text-surface-400">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────── Categories ────────────────────── */}
      <section id="kategorijos" className="scroll-mt-24 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-wider text-brand-500 dark:text-brand-400">
              Kategorijos
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50 sm:text-4xl">
              Paslaugų kategorijos
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
            {categoryGroups.map((group) => (
              <Link
                key={group.root.id}
                href={`/meistrai?category=${group.root.slug}`}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-surface-100 bg-surface-50 p-6 text-center transition-all hover:-translate-y-0.5 hover:border-surface-200 hover:shadow-lg dark:border-surface-800 dark:bg-surface-900 dark:hover:border-surface-700"
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-surface-100 text-brand-500 dark:bg-brand-950/60 dark:text-brand-300">
                  <Tag className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  {group.root.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────────── Stats ───────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="rounded-3xl border border-surface-100 bg-surface-50 p-10 dark:border-surface-800 dark:bg-surface-900">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-4xl font-bold text-brand-500 sm:text-display dark:text-brand-400">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-sm font-medium text-surface-500 dark:text-surface-400">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────  FAQ  ──────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <span className="mb-3 inline-block text-sm font-semibold uppercase tracking-wider text-brand-500 dark:text-brand-400">
                Klausimai ir atsakymai
              </span>
              <h2 className="text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50 sm:text-4xl">
                Ką verta žinoti prieš pradedant
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-surface-500 dark:text-surface-300">
                Trumpi atsakymai į dažniausius klausimus. Jei vis tiek lieka
                neaišku, gali pradėti nuo pirmos užklausos ir išbandyti platformą
                praktiškai.
              </p>
            </div>
            <div className="rounded-3xl border border-surface-100 bg-surface-50 p-6 dark:border-surface-800 dark:bg-surface-900">
              <Accordion type="single" collapsible defaultValue="free" className="w-full">
                {FAQ_ITEMS.map((item) => (
                  <AccordionItem key={item.value} value={item.value} className="border-surface-0 dark:border-surface-800">
                    <AccordionTrigger className="text-surface-900 hover:text-brand-500 dark:text-surface-100 dark:hover:text-brand-400">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-surface-500 dark:text-surface-400">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── CTA for providers ────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl bg-surface-900 px-6 py-16 text-center">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-surface-0">
            <Sparkles className="h-3.5 w-3.5" />
            Pradėk nemokamai
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-surface-50 sm:text-4xl">
            Esi paslaugų tiekėjas?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-surface-400">
            Prisijunk prie platformos ir gauk naujų klientų kiekvieną dieną.
            Pradėti nieko nekainuoja.
          </p>
          <ProviderCtaLink
            className="group mt-8 inline-flex items-center rounded-full bg-surface-0 px-7 py-3.5 font-semibold text-surface-900 transition-all hover:-translate-y-0.5 hover:bg-white"
            providerLabel={
              <>
                Eiti į valdymo panelę
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </>
            }
          >
            Registruotis nemokamai
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </ProviderCtaLink>
        </div>
      </section>
    </div>
  );
}
