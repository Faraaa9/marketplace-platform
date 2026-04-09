import type { Metadata } from "next";
import Link from "next/link";
import ProviderCtaLink from "@/components/marketing/ProviderCtaLink";
import { prisma } from "@/lib/prisma";
import { formatRelativeDate, truncate } from "@/lib/utils";
import { SERVICE_CATEGORIES, BUDGET_OPTIONS } from "@/lib/constants";
import { Particles } from "@/components/magicui/particles";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { MagicCard } from "@/components/magicui/magic-card";
import { BorderBeam } from "@/components/magicui/border-beam";
import RecentRequestBanner from "@/components/guest/RecentRequestBanner";

export const metadata: Metadata = {
  title: "Raskite geriausius paslaugų tiekėjus Lietuvoje",
  description: "PaslaugųRinka – patikima platforma paslaugų paieškai. Pateikite užklausą ir gaukite pasiūlymus iš patikrintų specialistų per kelias minutes.",
};
export const dynamic = "force-dynamic";
import { Hammer, Droplets, Zap, Sparkles, Truck, Trees, Monitor, Palette, Scale, Calculator, GraduationCap, MoreHorizontal, ArrowRight, Users, FileText, Shield, Star, MapPin, Clock, MessageSquare, CheckCircle2 } from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  Hammer: <Hammer className="h-6 w-6" />,
  Droplets: <Droplets className="h-6 w-6" />,
  Zap: <Zap className="h-6 w-6" />,
  Sparkles: <Sparkles className="h-6 w-6" />,
  Truck: <Truck className="h-6 w-6" />,
  Trees: <Trees className="h-6 w-6" />,
  Monitor: <Monitor className="h-6 w-6" />,
  Palette: <Palette className="h-6 w-6" />,
  Scale: <Scale className="h-6 w-6" />,
  Calculator: <Calculator className="h-6 w-6" />,
  GraduationCap: <GraduationCap className="h-6 w-6" />,
  MoreHorizontal: <MoreHorizontal className="h-6 w-6" />,
};

const HOME_PAGE_FALLBACK_DATA = {
  recentRequests: [] as Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    location: string;
    budget: string | null;
    createdAt: Date;
    _count: { responses: number };
  }>,
  providerCount: 0,
  requestCount: 0,
  responseCount: 0,
  categoryCount: 0,
};

async function getHomePageData() {
  try {
    const [recentRequests, providerCount, requestCount, responseCount, categoryCount] = await Promise.all([
      prisma.serviceRequest.findMany({
        where: { status: "OPEN" },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
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
          providerProfile: { isActive: true },
        },
      }),
      prisma.serviceRequest.count(),
      prisma.response.count(),
      prisma.serviceRequest.groupBy({ by: ["category"] }).then((g) => g.length),
    ]);

    return {
      recentRequests,
      providerCount,
      requestCount,
      responseCount,
      categoryCount,
    };
  } catch (error) {
    console.error("Home page data error:", error);
    return HOME_PAGE_FALLBACK_DATA;
  }
}

export default async function HomePage() {
  const {
    recentRequests,
    providerCount,
    requestCount,
    responseCount,
    categoryCount,
  } = await getHomePageData();

  const categoryLabel = (val: string) =>
    SERVICE_CATEGORIES.find((c) => c.value === val)?.label || val;
  const budgetLabel = (val: string) =>
    BUDGET_OPTIONS.find((b) => b.value === val)?.label || val;

  return (
    <div>
      {/* Hero — Magic UI style */}
      <section className="relative overflow-hidden bg-surface-0 dark:bg-surface-950 min-h-[85vh] flex items-center">
        {/* Ambient background layers */}
        <div className="absolute inset-0 bg-radial-brand" />
        <div className="absolute inset-0 bg-noise opacity-60" />
        <Particles className="opacity-30" quantity={50} color="#6366f1" size={1.2} speed={0.2} />

        {/* Decorative gradient orbs */}
        <div className="absolute top-1/4 -left-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-brand-400/20 to-purple-400/10 blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 h-[400px] w-[400px] rounded-full bg-gradient-to-tl from-brand-500/15 to-cyan-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/60 bg-white/80 backdrop-blur-sm px-4 py-1.5 text-micro font-medium text-brand-700 mb-8 shadow-xs dark:border-brand-800/60 dark:bg-surface-900/80 dark:text-brand-300">
              <Star className="h-3.5 w-3.5 fill-brand-500 text-brand-500" />
              Patikima platforma Lietuvoje
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-slow" />
            </div>

            {/* Headline with gradient */}
            <h1 className="text-[2.75rem] sm:text-[3.5rem] lg:text-[4.25rem] font-bold tracking-tight leading-[1.05] text-surface-900 dark:text-white">
              Raskite geriausią
              <br />
              <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-purple-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                specialistą per minutes
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-surface-500 dark:text-surface-400 max-w-2xl mx-auto leading-relaxed">
              Aprašykite ko jums reikia — gausite pasiūlymus iš patikimų tiekėjų visoje Lietuvoje. Be registracijos, be įsipareigojimų.
            </p>

            {/* CTA buttons */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/uzklausos/nauja"
                className="group relative inline-flex items-center justify-center rounded-2xl bg-brand-600 px-8 py-4 text-body font-semibold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700 hover:shadow-xl hover:shadow-brand-600/30 transition-all duration-300 hover:-translate-y-0.5"
              >
                Pateikti užklausą nemokamai
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/tiekejams"
                className="inline-flex items-center justify-center rounded-2xl border border-surface-200 bg-white/80 backdrop-blur-sm px-8 py-4 text-body font-semibold text-surface-700 hover:bg-white hover:border-surface-300 hover:shadow-soft transition-all duration-300 dark:border-surface-700 dark:bg-surface-900/80 dark:text-surface-300 dark:hover:bg-surface-800"
              >
                Esu tiekėjas
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-body-sm text-surface-400">
              {[
                "Nemokama registracija",
                "Be įsipareigojimų",
                `${providerCount > 0 ? providerCount : ""}${providerCount > 0 ? " " : ""}tiekėjų`,
              ].map((text) => (
                <div key={text} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>{text}</span>
                </div>
              ))}
            </div>

            {/* Guest request recovery */}
            <div className="mt-8 max-w-md mx-auto">
              <RecentRequestBanner />
            </div>
          </div>
        </div>
      </section>

      {/* Recent requests — Magic Card style */}
      {recentRequests.length > 0 && (
        <section className="relative py-24 bg-surface-50 dark:bg-surface-900">
          <div className="absolute inset-0 bg-radial-brand-subtle" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/60 bg-brand-50 px-3 py-1 text-micro font-medium text-brand-600 mb-4 dark:border-brand-800/60 dark:bg-brand-950 dark:text-brand-400">
                Naujausi darbai
              </div>
              <h2 className="text-heading-1 font-bold text-surface-900 dark:text-white">Ką ieško klientai</h2>
              <p className="mt-3 text-body text-surface-500 dark:text-surface-400 max-w-lg mx-auto">
                Peržiūrėkite naujausias užklausas ir pateikite savo pasiūlymą
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {recentRequests.map((r) => (
                <MagicCard key={r.id} className="p-0">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-body font-semibold text-surface-900 dark:text-white line-clamp-1">
                        {r.title}
                      </h3>
                      {r.budget && (
                        <span className="shrink-0 text-caption font-semibold text-brand-600 dark:text-brand-400">
                          {budgetLabel(r.budget)}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-body-sm text-surface-500 dark:text-surface-400 line-clamp-2">
                      {truncate(r.description, 100)}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-micro font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                        {categoryLabel(r.category)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-micro text-surface-400">
                        <MapPin className="h-3 w-3" />
                        {r.location}
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-700/50 flex items-center justify-between text-micro text-surface-400">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeDate(r.createdAt)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {r._count.responses} pasiūl.
                        </span>
                      </div>
                    </div>
                  </div>
                </MagicCard>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                href="/uzklausos"
                className="group inline-flex items-center gap-2 rounded-xl bg-white border border-surface-200 px-5 py-2.5 text-body-sm font-semibold text-brand-600 hover:bg-brand-50 hover:border-brand-200 transition-all dark:bg-surface-800 dark:border-surface-700 dark:hover:bg-surface-700"
              >
                Visos užklausos
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* How it works — Redesigned with Magic Cards + Border Beam */}
      <section className="py-24 bg-white dark:bg-surface-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/60 bg-brand-50 px-3 py-1 text-micro font-medium text-brand-600 mb-4 dark:border-brand-800/60 dark:bg-brand-950 dark:text-brand-400">
              Kaip tai veikia
            </div>
            <h2 className="text-heading-1 font-bold text-surface-900 dark:text-white">Trys paprasti žingsniai</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {[
              { step: "1", title: "Aprašykite užduotį", desc: "Užpildykite trumpą formą — ką reikia padaryti, kur ir kada.", icon: <FileText className="h-7 w-7" />, color: "from-brand-500 to-brand-600" },
              { step: "2", title: "Gaukite pasiūlymus", desc: "Patikimi tiekėjai peržiūrės jūsų užklausą ir atsiųs savo pasiūlymus.", icon: <Users className="h-7 w-7" />, color: "from-purple-500 to-brand-600" },
              { step: "3", title: "Pasirinkite geriausią", desc: "Palyginkite kainas ir atsiliepimus, susisiekite tiesiogiai.", icon: <Shield className="h-7 w-7" />, color: "from-brand-600 to-emerald-500" },
            ].map((item) => (
              <div key={item.step} className="relative group">
                <div className="relative overflow-hidden rounded-2xl border border-surface-200/60 bg-white p-8 transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 dark:border-surface-700/50 dark:bg-surface-900">
                  <BorderBeam size={120} duration={8} delay={Number(item.step) * 2} />

                  {/* Step number */}
                  <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} text-white font-bold text-lg shadow-lg shadow-brand-500/20`}>
                    {item.step}
                  </div>

                  {/* Icon floating */}
                  <div className="absolute top-6 right-6 text-surface-200 dark:text-surface-700 transition-colors group-hover:text-brand-200 dark:group-hover:text-brand-800">
                    {item.icon}
                  </div>

                  <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white">{item.title}</h3>
                  <p className="mt-2 text-body-sm text-surface-500 dark:text-surface-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories — Grid with Magic Card hover */}
      <section className="py-24 bg-surface-50 dark:bg-surface-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/60 bg-brand-50 px-3 py-1 text-micro font-medium text-brand-600 mb-4 dark:border-brand-800/60 dark:bg-brand-950 dark:text-brand-400">
              Kategorijos
            </div>
            <h2 className="text-heading-1 font-bold text-surface-900 dark:text-white">Paslaugų kategorijos</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {SERVICE_CATEGORIES.map((cat) => (
              <Link
                key={cat.value}
                href={`/uzklausos/nauja?category=${cat.value}`}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-surface-200/60 bg-white p-6 text-center transition-all duration-300 hover:shadow-elevated hover:border-brand-200 hover:-translate-y-1 dark:border-surface-700/50 dark:bg-surface-800/50 dark:hover:border-brand-700"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-all group-hover:bg-brand-100 group-hover:scale-110 dark:bg-brand-950 dark:text-brand-400">
                  {iconMap[cat.icon]}
                </div>
                <span className="text-body-sm font-medium text-surface-900 dark:text-white">{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats — Number Ticker */}
      <section className="relative py-24 bg-white dark:bg-surface-950 overflow-hidden">
        <div className="absolute inset-0 bg-radial-brand-subtle" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-surface-200/60 bg-surface-50/80 backdrop-blur-sm p-12 dark:border-surface-700/50 dark:bg-surface-900/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { value: providerCount || 1, suffix: "", label: "Tiekėjų" },
                { value: requestCount || 1, suffix: "", label: "Pateiktų užklausų" },
                { value: responseCount || 1, suffix: "", label: "Pateiktų pasiūlymų" },
                { value: categoryCount || SERVICE_CATEGORIES.length, suffix: "", label: "Kategorijų" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-[2.5rem] sm:text-display-xl font-bold bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                    <NumberTicker value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="mt-2 text-body-sm text-surface-500 dark:text-surface-400 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA for providers — Enhanced with particles */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900" />
        <div className="absolute inset-0 bg-noise opacity-30" />
        <Particles className="opacity-20" quantity={30} color="#ffffff" size={1} speed={0.15} />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-1.5 text-micro font-medium text-white/90 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Pradėkite nemokamai
          </div>
          <h2 className="text-heading-1 sm:text-display font-bold text-white">Esate paslaugų tiekėjas?</h2>
          <p className="mt-4 text-body-lg text-brand-100/90 max-w-2xl mx-auto">
            Prisijunkite prie platformos ir gaukite naujų klientų kiekvieną dieną. Pradėkite nemokamai.
          </p>
          <ProviderCtaLink
            className="mt-8 group inline-flex items-center rounded-2xl bg-white px-8 py-4 text-body font-semibold text-brand-600 shadow-lg shadow-brand-900/30 hover:bg-brand-50 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
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
