import type { Metadata } from "next";
import ProviderCtaLink from "@/components/marketing/ProviderCtaLink";

export const metadata: Metadata = {
  title: "Tiekėjams – Pritraukite naujų klientų",
  description: "Prisijunkite prie PaslaugųRinka ir gaukite užklausas iš klientų visoje Lietuvoje. Nemokamas ir mokamas planai.",
};
import { ArrowRight, Check, Users, TrendingUp, Shield, Star, Crown } from "lucide-react";
import { PLAN_LIMITS } from "@/lib/constants";

export default function ForProvidersPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-surface-50 dark:bg-surface-950">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-50/50 via-transparent to-transparent dark:from-brand-950/30" />
        <div className="relative mx-auto max-w-4xl px-4 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-micro font-medium text-brand-700 mb-8 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-300">
            <Star className="h-3.5 w-3.5" />
            Tiekėjams
          </div>
          <h1 className="text-display font-bold tracking-tight text-surface-900 dark:text-white">
            Gaukite naujų klientų{" "}
            <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
              kiekvieną dieną
            </span>
          </h1>
          <p className="mt-6 text-body-lg text-surface-500 dark:text-surface-400 max-w-2xl mx-auto">
            Prisijunkite prie platformos ir gaukite tiesiogines užklausas iš klientų, kurie ieško jūsų paslaugų.
          </p>
          <ProviderCtaLink
            className="mt-8 inline-flex items-center rounded-xl bg-brand-600 px-6 py-3.5 text-body font-semibold text-white shadow-sm hover:bg-brand-700 transition-all duration-150 hover:shadow-md"
            providerLabel={
              <>
                Eiti į valdymo panelę <ArrowRight className="ml-2 h-5 w-5" />
              </>
            }
          >
            Pradėti nemokamai <ArrowRight className="ml-2 h-5 w-5" />
          </ProviderCtaLink>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-white dark:bg-surface-900">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center mb-16">
            <p className="text-caption font-semibold text-brand-600 uppercase tracking-wider mb-3">Privalumai</p>
            <h2 className="text-heading-1 font-bold text-surface-900 dark:text-white">Kodėl verta?</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Users className="h-6 w-6 text-brand-600" />, title: "Tiksliniai klientai", desc: "Gaunate užklausas tik iš klientų, kuriems tikrai reikia jūsų paslaugų." },
              { icon: <TrendingUp className="h-6 w-6 text-brand-600" />, title: "Auginkite verslą", desc: "Daugiau užklausų — daugiau darbų. Platforma dirba už jus." },
              { icon: <Shield className="h-6 w-6 text-brand-600" />, title: "Patikima platforma", desc: "Saugus bendravimas, aiškios taisyklės, profesionali aplinka." },
            ].map((item) => (
              <div key={item.title} className="text-center group">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 ring-1 ring-brand-100 transition-all group-hover:shadow-glow dark:bg-brand-950 dark:ring-brand-800">
                  {item.icon}
                </div>
                <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white">{item.title}</h3>
                <p className="mt-2 text-body-sm text-surface-500 dark:text-surface-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-20 bg-surface-50 dark:bg-surface-950">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <p className="text-caption font-semibold text-brand-600 uppercase tracking-wider mb-3">Kainos</p>
          <h2 className="text-heading-1 font-bold text-surface-900 dark:text-white mb-12">Planai</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: "Nemokamas", price: "€0", period: "/mėn.", icon: null, features: [`${PLAN_LIMITS.FREE.responsesPerMonth} atsakymai/mėn.`, "El. pašto kontaktai"], highlighted: false },
              { name: "Bazinis", price: "€29", period: "/mėn.", icon: <Star className="h-5 w-5 text-amber-500" />, features: [`${PLAN_LIMITS.BASIC.responsesPerMonth} atsakymų/mėn.`, "Telefono kontaktai", "Patikimumo ženklelis"], highlighted: true },
              { name: "PRO", price: "€59", period: "/mėn.", icon: <Crown className="h-5 w-5 text-brand-500" />, features: ["Neriboti atsakymai", "Telefono kontaktai", "PRO ženklelis", "Prioritetinis rodymas"], highlighted: false },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-6 transition-all ${
                  plan.highlighted
                    ? "border-brand-500 bg-white shadow-stripe ring-1 ring-brand-500 dark:bg-surface-900 dark:border-brand-600"
                    : "border-surface-200/60 bg-white dark:border-surface-700/50 dark:bg-surface-900/50"
                }`}
              >
                {plan.highlighted && (
                  <div className="mb-4">
                    <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-micro font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">
                      Populiariausias
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 mb-2">
                  {plan.icon}
                  <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white">{plan.name}</h3>
                </div>
                <p className="text-display-xl font-bold text-surface-900 dark:text-white">
                  {plan.price}<span className="text-body-sm font-normal text-surface-400">{plan.period}</span>
                </p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-body-sm text-surface-600 dark:text-surface-400">
                      <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <ProviderCtaLink
            className="mt-10 inline-flex items-center rounded-xl bg-brand-600 px-6 py-3.5 text-body font-semibold text-white shadow-sm hover:bg-brand-700 transition-all duration-150 hover:shadow-md"
            providerLabel={
              <>
                Eiti į valdymo panelę <ArrowRight className="ml-2 h-5 w-5" />
              </>
            }
          >
            Registruotis nemokamai <ArrowRight className="ml-2 h-5 w-5" />
          </ProviderCtaLink>
        </div>
      </section>
    </div>
  );
}
