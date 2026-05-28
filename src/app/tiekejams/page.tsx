import type { Metadata } from "next";
import ProviderCtaLink from "@/components/marketing/ProviderCtaLink";
import { LazyNumberTicker as NumberTicker } from "@/components/magicui/lazy";
import { MagicCard } from "@/components/magicui/magic-card";
import {
  ArrowRight,
  Users,
  TrendingUp,
  Shield,
  Sparkles,
  Coins,
  Zap,
  Clock,
  Wand2,
  CheckCircle2,
  Link2,
  PencilLine,
  Image as ImageIcon,
  MessageSquare,
} from "lucide-react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { creditsLabel } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Tiekėjams – Pritraukite naujų klientų",
  description:
    "AI sukuria meistro profilį per 20 sekundžių. Prisijunkite prie PaslaugųRinka — gaukite užklausas iš klientų visoje Lietuvoje. Mokate tik už atrakintas užklausas.",
};

// Marketing page — credit packs change rarely, counts are cosmetic stats.
// 5-minute cache is more than enough; SWR keeps any miss invisible.
export const revalidate = 300;

const getForProvidersData = unstable_cache(
  async () => {
    const [packs, providerCount, requestCount] = await Promise.all([
      prisma.creditPack.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, credits: true, priceCents: true },
      }),
      prisma.providerProfile.count({
        where: { isActive: true, moderationStatus: "APPROVED" },
      }),
      prisma.serviceRequest.count(),
    ]);
    return { packs, providerCount, requestCount };
  },
  ["tiekejams-data-v1"],
  { revalidate: 300, tags: ["tiekejams-data"] },
);

export default async function ForProvidersPage() {
  const { packs, providerCount, requestCount } = await getForProvidersData();

  return (
    <div>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden min-h-[80vh] flex items-center">
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center">
          {/* AI badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/60 bg-white/90 backdrop-blur-sm px-4 py-1.5 text-micro font-semibold text-brand-700 mb-6 shadow-sm dark:border-brand-800/60 dark:bg-surface-900/80 dark:text-brand-300">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              <Sparkles className="h-2.5 w-2.5" /> Naujas
            </span>
            AI sukuria profilį per 20 sekundžių
          </div>

          <h1 className="text-[2.5rem] sm:text-[3.75rem] font-bold tracking-tight leading-[1.05] text-surface-900 dark:text-white">
            Sukurk profilį.{" "}
            <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-brand-600 via-amber-500 to-brand-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              Gauk klientų.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-surface-500 dark:text-surface-400 max-w-2xl mx-auto leading-relaxed">
            Įklijuok savo paslaugos.lt arba LinkedIn nuorodą — AI parašys
            aprašymą, parinks kategorijas ir sutvarkys nuotraukas.{" "}
            <span className="font-semibold text-surface-700 dark:text-surface-300">
              Nereik valandų rašyti tekstų.
            </span>
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <ProviderCtaLink
              className="group inline-flex items-center rounded-2xl bg-brand-600 px-8 py-4 text-body font-semibold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-700 hover:shadow-xl hover:shadow-brand-600/40 transition-all duration-300 hover:-translate-y-0.5"
              providerLabel={
                <>
                  Eiti į valdymo panelę
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </>
              }
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Sukurti profilį su AI
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </ProviderCtaLink>
          </div>

          <p className="mt-4 text-micro text-surface-400">
            Registracija nemokama · Be kreditinės kortelės · Nutraukti gali bet
            kada
          </p>

          {/* Quick stats — real numbers */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              {
                value: Math.max(providerCount, 500),
                suffix: "+",
                label: "Tiekėjų",
              },
              {
                value: Math.max(requestCount, 2000),
                suffix: "+",
                label: "Užklausų",
              },
              { value: 20, suffix: "s", label: "Profilis paruoštas" },
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

      {/* ── HOW AI WORKS ── */}
      <section className="py-24 relative">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/60 bg-brand-50 px-3 py-1 text-micro font-medium text-brand-600 mb-4 dark:border-brand-800/60 dark:bg-brand-950 dark:text-brand-400">
              <Wand2 className="h-3.5 w-3.5" />
              Kaip veikia AI
            </div>
            <h2 className="text-heading-1 font-bold text-surface-900 dark:text-white">
              Trys žingsniai iki paruošto profilio
            </h2>
            <p className="mt-3 text-body text-surface-500 dark:text-surface-400 max-w-2xl mx-auto">
              Pasirink šaltinį — AI nuskenuos, parašys ir patalpins. Tu tik
              redaguoji jei kažkas netinka.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-12 left-[16.66%] right-[16.66%] h-0.5 bg-gradient-to-r from-brand-200 via-brand-400 to-brand-200 -z-10" />

            {[
              {
                step: "1",
                icon: <Link2 className="h-6 w-6" />,
                title: "Įklijuok nuorodą",
                desc: "paslaugos.lt, LinkedIn, asmeninė svetainė — arba pradėk nuo nulio.",
              },
              {
                step: "2",
                icon: <Wand2 className="h-6 w-6" />,
                title: "AI atlieka darbą",
                desc: "Parašo profesionalų aprašymą, parenka kategorijas, paruošia nuotraukas.",
              },
              {
                step: "3",
                icon: <MessageSquare className="h-6 w-6" />,
                title: "Gauk užklausas",
                desc: "Klientai mato tavo profilį ir kreipiasi tiesiogiai.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="rounded-2xl border border-surface-200/60 bg-white p-6 text-center shadow-sm dark:border-surface-700/50 dark:bg-surface-900/50 h-full">
                  <div className="relative mx-auto mb-4">
                    <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-[12px] font-bold text-white shadow-md">
                      {item.step}
                    </div>
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/20">
                      {item.icon}
                    </div>
                  </div>
                  <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-body-sm text-surface-500 dark:text-surface-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI FEATURE DEEP DIVE ── */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 via-amber-50/50 to-brand-50 p-8 sm:p-12 dark:border-brand-800 dark:from-brand-950 dark:via-amber-950/30 dark:to-brand-950">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white mb-5">
                  <Sparkles className="h-3 w-3" />
                  AI funkcija
                </div>
                <h3 className="text-heading-1 font-bold text-surface-900 dark:text-white">
                  Pamiršk valandas
                </h3>
                <p className="mt-3 text-body text-surface-600 dark:text-surface-400 leading-relaxed">
                  Užuot rašęs aprašymus, ieškojęs nuotraukų ir derinęs
                  kategorijas — paspausk vieną mygtuką. AI atlieka tai per
                  kelias sekundes, ne valandas.
                </p>

                <ul className="mt-6 space-y-3">
                  {[
                    "Profesionalus aprašymas (200-300 žodžių)",
                    "Iki 6 tinkamiausių kategorijų",
                    "Nuotraukos su pašalintais watermark'ais",
                    "Kontaktai, kainos, patirtis — automatiškai",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400 mt-0.5" />
                      <span className="text-body-sm text-surface-700 dark:text-surface-300">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mock loading visual */}
              <div className="rounded-2xl bg-white p-5 shadow-xl dark:bg-surface-900">
                <div className="space-y-3">
                  {[
                    { label: "Atveriam tavo nuorodą...", icon: Link2, done: true },
                    {
                      label: "Skaitome turinį...",
                      icon: PencilLine,
                      done: true,
                    },
                    {
                      label: "AI rašo aprašymą...",
                      icon: Wand2,
                      done: true,
                    },
                    {
                      label: "Rūšiuojame nuotraukas...",
                      icon: ImageIcon,
                      current: true,
                    },
                    {
                      label: "Saugome profilį...",
                      icon: CheckCircle2,
                      pending: true,
                    },
                  ].map((step, idx) => {
                    const Icon = step.icon;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-3 ${
                          step.pending ? "opacity-40" : "opacity-100"
                        }`}
                      >
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            step.done
                              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                              : step.current
                                ? "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400"
                                : "bg-surface-100 text-surface-400 dark:bg-surface-800"
                          }`}
                        >
                          {step.done ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <Icon className="h-5 w-5" />
                          )}
                        </div>
                        <p
                          className={`text-body-sm ${
                            step.done
                              ? "text-emerald-700 dark:text-emerald-300 line-through decoration-emerald-400/50"
                              : step.current
                                ? "text-surface-900 dark:text-white font-medium"
                                : "text-surface-500"
                          }`}
                        >
                          {step.label}
                        </p>
                        {step.current && (
                          <div className="ml-auto flex gap-0.5">
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce"
                              style={{ animationDelay: "0ms" }}
                            />
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce"
                              style={{ animationDelay: "150ms" }}
                            />
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce"
                              style={{ animationDelay: "300ms" }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/60 bg-brand-50 px-3 py-1 text-micro font-medium text-brand-600 mb-4 dark:border-brand-800/60 dark:bg-brand-950 dark:text-brand-400">
              Privalumai
            </div>
            <h2 className="text-heading-1 font-bold text-surface-900 dark:text-white">
              Kodėl būtent PaslaugųRinka
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Users className="h-6 w-6" />,
                title: "Tikslūs klientai",
                desc: "Gauni užklausas tik iš klientų, kuriems reikia tavo paslaugų — ne masinis SPAM.",
                color: "from-brand-500 to-brand-600",
              },
              {
                icon: <Clock className="h-6 w-6" />,
                title: "Greitas startas",
                desc: "Per 20 sekundžių paruoštas profilis vietoj valandų rankinio darbo.",
                color: "from-amber-500 to-brand-500",
              },
              {
                icon: <Zap className="h-6 w-6" />,
                title: "Mokėk už rezultatą",
                desc: "Nėra mėnesinių mokesčių. Mokate tik už atrakintas užklausas — kreditus naudojate tada, kai jums reikia.",
                color: "from-purple-500 to-brand-600",
              },
              {
                icon: <TrendingUp className="h-6 w-6" />,
                title: "Augimas",
                desc: "Atsiliepimai ir matomumas didėja kuo aktyviau dirbi platformoje.",
                color: "from-emerald-500 to-brand-500",
              },
              {
                icon: <Shield className="h-6 w-6" />,
                title: "Saugumas",
                desc: "Tu valdyti savo profilį pilnai — gali paslėpti, redaguoti ar ištrinti bet kada.",
                color: "from-brand-600 to-emerald-500",
              },
              {
                icon: <Sparkles className="h-6 w-6" />,
                title: "AI palaikymas",
                desc: "Aprašymai, kategorijos, optimizacija — AI dirba tavo pusėje, kad gautum daugiau užklausų.",
                color: "from-brand-500 to-purple-500",
              },
            ].map((item) => (
              <MagicCard key={item.title} className="p-0">
                <div className="p-7 text-left">
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} text-white shadow-lg shadow-brand-500/20`}
                  >
                    {item.icon}
                  </div>
                  <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-body-sm text-surface-500 dark:text-surface-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </MagicCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="relative py-24 overflow-hidden">
        <div className="relative mx-auto max-w-5xl px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/60 bg-brand-50 px-3 py-1 text-micro font-medium text-brand-600 mb-4 dark:border-brand-800/60 dark:bg-brand-950 dark:text-brand-400">
            <Coins className="h-3.5 w-3.5" />
            Kainos
          </div>
          <h2 className="text-heading-1 font-bold text-surface-900 dark:text-white mb-3">
            Mokate tik už tai, ką naudojate
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-body text-surface-500 dark:text-surface-400 leading-relaxed">
            Registracija ir profilis — <strong>nemokami</strong>. Nauji tiekėjai
            gauna kelis nemokamus kreditus. Vienas kreditas atrakina vieną
            kliento užklausą — matote kontaktus ir galite atsakyti.{" "}
            <strong>Be mėnesinių mokesčių.</strong>
          </p>
          {packs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packs.map((pack, i) => {
                const isPopular = i === 1;
                return (
                  <div
                    key={pack.id}
                    className={`relative rounded-2xl border-2 p-8 transition-all hover:-translate-y-1 hover:shadow-lg ${
                      isPopular
                        ? "border-brand-500 bg-gradient-to-br from-brand-50 to-white shadow-md dark:border-brand-500 dark:from-brand-950 dark:to-surface-900"
                        : "border-surface-200/60 bg-white dark:border-surface-700/50 dark:bg-surface-900/50"
                    }`}
                  >
                    {isPopular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-md">
                        Populiariausias
                      </span>
                    )}
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Coins className="h-5 w-5 text-brand-500" />
                      <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white">
                        {pack.name}
                      </h3>
                    </div>
                    <p className="text-display font-bold text-surface-900 dark:text-white">
                      €{(pack.priceCents / 100).toFixed(2)}
                    </p>
                    <p className="text-body-sm text-surface-400 mt-1">
                      {pack.credits} {creditsLabel(pack.credits)}
                    </p>
                    <p className="mt-3 text-micro text-surface-400">
                      €
                      {(pack.priceCents / 100 / pack.credits).toFixed(2)} už
                      vieną užklausą
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 relative">
        <div className="mx-auto max-w-4xl px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-amber-600 p-12 sm:p-16 text-center shadow-2xl shadow-brand-600/30">
            {/* Decorative sparkles */}
            <div className="absolute top-6 left-8 opacity-20">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div className="absolute bottom-8 right-10 opacity-20">
              <Sparkles className="h-6 w-6 text-white" />
            </div>

            <div className="relative">
              <h2 className="text-heading-1 font-bold text-white">
                Pradėk gauti klientus šiandien
              </h2>
              <p className="mt-3 text-body text-white/90 max-w-xl mx-auto">
                AI sukurs tavo profilį per 20 sekundžių. Registracija nemokama —
                pradėk gauti tiesiogines užklausas iš klientų visoje Lietuvoje.
              </p>
              <ProviderCtaLink
                className="mt-8 group inline-flex items-center rounded-2xl bg-white px-8 py-4 text-body font-semibold text-brand-700 shadow-lg hover:shadow-xl hover:bg-brand-50 transition-all duration-300 hover:-translate-y-0.5"
                providerLabel={
                  <>
                    Eiti į valdymo panelę
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </>
                }
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Sukurti profilį su AI
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </ProviderCtaLink>
              <p className="mt-4 text-micro text-white/70">
                Be kreditinės kortelės · Be sutarčių · Nutraukti gali bet kada
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
