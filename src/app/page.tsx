import type { Metadata } from "next";
import Link from "next/link";
import ProviderCtaLink from "@/components/marketing/ProviderCtaLink";
import { prisma } from "@/lib/prisma";
import { formatRelativeDate, truncate } from "@/lib/utils";
import { SERVICE_CATEGORIES, BUDGET_OPTIONS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Raskite geriausius paslaugų tiekėjus Lietuvoje",
  description: "PaslaugųRinka – patikima platforma paslaugų paieškai. Pateikite užklausą ir gaukite pasiūlymus iš patikrintų specialistų per kelias minutes.",
};
import { Hammer, Droplets, Zap, Sparkles, Truck, Trees, Monitor, Palette, Scale, Calculator, GraduationCap, MoreHorizontal, ArrowRight, Users, FileText, Shield, Star, MapPin, Clock, MessageSquare } from "lucide-react";

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

export default async function HomePage() {
  const recentRequests = await prisma.serviceRequest.findMany({
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
  });

  const categoryLabel = (val: string) =>
    SERVICE_CATEGORIES.find((c) => c.value === val)?.label || val;
  const budgetLabel = (val: string) =>
    BUDGET_OPTIONS.find((b) => b.value === val)?.label || val;

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-surface-50 dark:bg-surface-950">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50/50 via-transparent to-transparent dark:from-brand-950/30" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-micro font-medium text-brand-700 mb-8 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300">
            <Star className="h-3.5 w-3.5" />
            Patikima platforma Lietuvoje
          </div>
          <h1 className="text-display font-bold tracking-tight text-surface-900 dark:text-white">
            Raskite geriausią specialistą
            <br />
            <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
              per kelias minutes
            </span>
          </h1>
          <p className="mt-6 text-body-lg text-surface-500 dark:text-surface-400 max-w-2xl mx-auto">
            Aprašykite ko jums reikia — gausite pasiūlymus iš patikimų tiekėjų visoje Lietuvoje. Be registracijos, be įsipareigojimų.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/uzklausos/nauja"
              className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-6 py-3.5 text-body font-semibold text-white shadow-sm hover:bg-brand-700 transition-all duration-150 hover:shadow-md"
            >
              Pateikti užklausą nemokamai
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="/tiekejams"
              className="inline-flex items-center justify-center rounded-xl border border-surface-300 bg-white px-6 py-3.5 text-body font-semibold text-surface-700 hover:bg-surface-50 transition-colors dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800"
            >
              Esu tiekėjas
            </Link>
          </div>
        </div>
      </section>

      {/* Recent requests */}
      {recentRequests.length > 0 && (
        <section className="py-20 bg-white dark:bg-surface-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <p className="text-caption font-semibold text-brand-600 uppercase tracking-wider mb-3">Naujausi darbai</p>
              <h2 className="text-heading-1 font-bold text-surface-900 dark:text-white">Ką ieško klientai</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentRequests.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-surface-200/60 bg-surface-50 p-5 dark:border-surface-700/50 dark:bg-surface-800/50"
                >
                  <h3 className="text-body font-semibold text-surface-900 dark:text-white line-clamp-1">
                    {r.title}
                  </h3>
                  <p className="mt-1.5 text-body-sm text-surface-500 dark:text-surface-400 line-clamp-2">
                    {truncate(r.description, 100)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-caption text-surface-400">
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                      {categoryLabel(r.category)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {r.location}
                    </span>
                    {r.budget && (
                      <span className="font-medium text-surface-600 dark:text-surface-300">
                        {budgetLabel(r.budget)}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-micro text-surface-400">
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
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link
                href="/uzklausos"
                className="inline-flex items-center text-brand-600 font-semibold hover:text-brand-700 transition-colors"
              >
                Visos užklausos
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="py-20 bg-surface-50 dark:bg-surface-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-caption font-semibold text-brand-600 uppercase tracking-wider mb-3">Kaip tai veikia</p>
            <h2 className="text-heading-1 font-bold text-surface-900 dark:text-white">Trys paprasti žingsniai</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              { step: "1", title: "Aprašykite užduotį", desc: "Užpildykite trumpą formą — ką reikia padaryti, kur ir kada.", icon: <FileText className="h-6 w-6 text-brand-600" /> },
              { step: "2", title: "Gaukite pasiūlymus", desc: "Patikimi tiekėjai peržiūrės jūsų užklausą ir atsiųs savo pasiūlymus.", icon: <Users className="h-6 w-6 text-brand-600" /> },
              { step: "3", title: "Pasirinkite geriausią", desc: "Palyginkite kainas ir atsiliepimus, susisiekite tiesiogiai.", icon: <Shield className="h-6 w-6 text-brand-600" /> },
            ].map((item) => (
              <div key={item.step} className="relative text-center group">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 ring-1 ring-brand-100 transition-all group-hover:shadow-glow dark:bg-brand-950 dark:ring-brand-800">
                  {item.icon}
                </div>
                <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-brand-600 flex items-center justify-center text-white text-micro font-bold md:right-auto md:left-1/2 md:ml-4 md:-top-1">
                  {item.step}
                </div>
                <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white">{item.title}</h3>
                <p className="mt-2 text-body-sm text-surface-500 dark:text-surface-400 max-w-sm mx-auto">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-white dark:bg-surface-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-caption font-semibold text-brand-600 uppercase tracking-wider mb-3">Kategorijos</p>
            <h2 className="text-heading-1 font-bold text-surface-900 dark:text-white">Paslaugų kategorijos</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {SERVICE_CATEGORIES.map((cat) => (
              <Link
                key={cat.value}
                href={`/uzklausos/nauja?category=${cat.value}`}
                className="flex flex-col items-center gap-3 rounded-2xl border border-surface-200/60 bg-white p-6 text-center transition-all duration-200 hover:shadow-stripe hover:border-brand-200 hover:-translate-y-0.5 dark:border-surface-700/50 dark:bg-surface-900/50 dark:hover:border-brand-700"
              >
                <div className="text-brand-600 dark:text-brand-400">{iconMap[cat.icon]}</div>
                <span className="text-body-sm font-medium text-surface-900 dark:text-white">{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-surface-50 dark:bg-surface-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: "500+", label: "Tiekėjų" },
              { value: "2,000+", label: "Įvykdytų užklausų" },
              { value: "12", label: "Kategorijų" },
              { value: "98%", label: "Pasitenkinimas" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-display-xl font-bold bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">{stat.value}</div>
                <div className="mt-1 text-body-sm text-surface-500 dark:text-surface-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA for providers */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600 to-brand-800" />
        <div className="absolute inset-0 bg-grid opacity-10" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-heading-1 font-bold text-white">Esate paslaugų tiekėjas?</h2>
          <p className="mt-4 text-body-lg text-brand-100 max-w-2xl mx-auto">
            Prisijunkite prie platformos ir gaukite naujų klientų kiekvieną dieną. Pradėkite nemokamai.
          </p>
          <ProviderCtaLink
            className="mt-8 inline-flex items-center rounded-xl bg-white px-6 py-3.5 text-body font-semibold text-brand-600 shadow-sm hover:bg-brand-50 transition-all duration-150 hover:shadow-md"
            providerLabel={
              <>
                Eiti į valdymo panelę
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            }
          >
            Registruotis nemokamai
            <ArrowRight className="ml-2 h-5 w-5" />
          </ProviderCtaLink>
        </div>
      </section>
    </div>
  );
}
