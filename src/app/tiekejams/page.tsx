import type { Metadata } from "next";
import ProviderCtaLink from "@/components/marketing/ProviderCtaLink";
import { LazyNumberTicker as NumberTicker } from "@/components/magicui/lazy";
import { MagicCard } from "@/components/magicui/magic-card";
import { ArrowRight, Users, TrendingUp, Shield, Sparkles, Coins } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { creditsLabel } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Tiekėjams – Pritraukite naujų klientų",
  description: "Prisijunkite prie PaslaugųRinka ir gaukite užklausas iš klientų visoje Lietuvoje. Mokate tik už atrakintas užklausas.",
};

export default async function ForProvidersPage() {
  const packs = await prisma.creditPack.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, credits: true, priceCents: true },
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden min-h-[70vh] flex items-center">
        <div className="relative mx-auto max-w-4xl px-4 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/60 bg-white/80 backdrop-blur-sm px-4 py-1.5 text-micro font-medium text-brand-700 mb-8 shadow-xs dark:border-brand-800/60 dark:bg-surface-900/80 dark:text-brand-300">
            <Sparkles className="h-3.5 w-3.5 fill-brand-500 text-brand-500" />
            Tiekėjams
          </div>
          <h1 className="text-[2.75rem] sm:text-[3.5rem] font-bold tracking-tight leading-[1.05] text-surface-900 dark:text-white">
            Gaukite naujų klientų{" "}
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-purple-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              kiekvieną dieną
            </span>
          </h1>
          <p className="mt-6 text-lg text-surface-500 dark:text-surface-400 max-w-2xl mx-auto leading-relaxed">
            Prisijunkite prie platformos ir gaukite tiesiogines užklausas iš klientų, kurie ieško jūsų paslaugų.
          </p>
          <ProviderCtaLink
            className="mt-8 group inline-flex items-center rounded-2xl bg-brand-600 px-8 py-4 text-body font-semibold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700 hover:shadow-xl hover:shadow-brand-600/30 transition-all duration-300 hover:-translate-y-0.5"
            providerLabel={
              <>
                Eiti į valdymo panelę
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </>
            }
          >
            Pradėti nemokamai
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </ProviderCtaLink>

          {/* Quick stats */}
          <div className="mt-14 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { value: 500, suffix: "+", label: "Tiekėjų" },
              { value: 2000, suffix: "+", label: "Užklausų" },
              { value: 98, suffix: "%", label: "Pasitenkinimas" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-heading-2 font-bold text-surface-900 dark:text-white">
                  <NumberTicker value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-micro text-surface-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-24">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/60 bg-brand-50 px-3 py-1 text-micro font-medium text-brand-600 mb-4 dark:border-brand-800/60 dark:bg-brand-950 dark:text-brand-400">
              Privalumai
            </div>
            <h2 className="text-heading-1 font-bold text-surface-900 dark:text-white">Kodėl verta?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: <Users className="h-6 w-6" />, title: "Tiksliniai klientai", desc: "Gaunate užklausas tik iš klientų, kuriems tikrai reikia jūsų paslaugų.", color: "from-brand-500 to-brand-600" },
              { icon: <TrendingUp className="h-6 w-6" />, title: "Auginkite verslą", desc: "Daugiau užklausų — daugiau darbų. Platforma dirba už jus.", color: "from-purple-500 to-brand-600" },
              { icon: <Shield className="h-6 w-6" />, title: "Patikima platforma", desc: "Saugus bendravimas, aiškios taisyklės, profesionali aplinka.", color: "from-brand-600 to-emerald-500" },
            ].map((item) => (
              <MagicCard key={item.title} className="p-0">
                <div className="p-8 text-center">
                  <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} text-white shadow-lg shadow-brand-500/20`}>
                    {item.icon}
                  </div>
                  <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white">{item.title}</h3>
                  <p className="mt-2 text-body-sm text-surface-500 dark:text-surface-400 leading-relaxed">{item.desc}</p>
                </div>
              </MagicCard>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing — pay per lead */}
      <section className="relative py-24 overflow-hidden">
        <div className="relative mx-auto max-w-4xl px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/60 bg-brand-50 px-3 py-1 text-micro font-medium text-brand-600 mb-4 dark:border-brand-800/60 dark:bg-brand-950 dark:text-brand-400">
            Kainos
          </div>
          <h2 className="text-heading-1 font-bold text-surface-900 dark:text-white mb-3">
            Mokate tik už tai, ką naudojate
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-body text-surface-500 dark:text-surface-400 leading-relaxed">
            Registracija ir profilis — nemokami. Nauji tiekėjai gauna kelis nemokamus
            kreditus. Vienas kreditas atrakina vieną kliento užklausą — matote
            kontaktus ir galite atsakyti. Kreditus perkate paketais, jokių mėnesinių
            mokesčių.
          </p>
          {packs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packs.map((pack) => (
                <div
                  key={pack.id}
                  className="rounded-2xl border border-surface-200/60 bg-white p-8 dark:border-surface-700/50 dark:bg-surface-900/50"
                >
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Coins className="h-5 w-5 text-brand-500" />
                    <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white">
                      {pack.name}
                    </h3>
                  </div>
                  <p className="text-display font-bold text-surface-900 dark:text-white">
                    €{(pack.priceCents / 100).toFixed(2)}
                  </p>
                  <p className="text-body-sm text-surface-400">
                    {pack.credits} {creditsLabel(pack.credits)}
                  </p>
                </div>
              ))}
            </div>
          )}
          <ProviderCtaLink
            className="mt-12 group inline-flex items-center rounded-2xl bg-brand-600 px-8 py-4 text-body font-semibold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
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
