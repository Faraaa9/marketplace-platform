"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { ArrowRight, Shield, Users, TrendingUp, Sparkles, Zap, Clock } from "lucide-react";

export default function BecomeProviderClient() {
  const { update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleBecomeProvider() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/tiekejas/tapti", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await update();
        router.push("/tiekejas/profilis");
        router.refresh();
      } else {
        setError(data.error || "Nepavyko");
      }
    } catch {
      setError("Įvyko klaida. Bandykite dar kartą.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[85vh] items-center justify-center px-4 py-8">
      <div className="relative w-full max-w-lg">
        <div className="rounded-2xl border border-surface-200/60 bg-white/90 backdrop-blur-sm p-8 shadow-elevated dark:border-surface-700/50 dark:bg-surface-900/90">
          <div className="text-center mb-6">
            <div className="relative mx-auto mb-4 h-16 w-16">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-500 to-amber-500 blur-lg opacity-50 animate-pulse" />
              <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-600/30">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-heading-2 font-bold text-surface-900 dark:text-white">
              Tavo profilis — gimsta per 20 sekundžių
            </h1>
            <p className="mt-2 text-body-sm text-surface-500 dark:text-surface-400 max-w-sm mx-auto">
              Įklijuok savo paslaugos.lt arba LinkedIn nuorodą — <span className="font-semibold text-surface-700 dark:text-surface-300">AI pats sukurs profilį</span> už tave. Aprašymas, kategorijos, nuotraukos, kontaktai — viskas.
            </p>
          </div>

          {/* AI feature highlight */}
          <div className="mb-6 rounded-2xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 via-amber-50 to-brand-50 p-5 dark:border-brand-800 dark:from-brand-950 dark:via-amber-950 dark:to-brand-950 relative overflow-hidden">
            <div className="absolute top-2 right-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                <Sparkles className="h-2.5 w-2.5" /> Naujas
              </span>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md">
                <Zap className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-bold text-surface-900 dark:text-white">
                  AI užpildo profilį už tave ✨
                </p>
                <p className="text-micro text-surface-600 dark:text-surface-400 mt-1">
                  Nebereik valandų rašyti aprašymus, ieškoti nuotraukų, parinkti kategorijas. AI tai padaro per kelias sekundes.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 mb-8">
            <p className="text-micro font-medium uppercase tracking-wider text-surface-400 dark:text-surface-500 px-1">
              Kodėl verta tapti tiekėju
            </p>
            {[
              {
                icon: <Users className="h-5 w-5" />,
                text: "Gauk tiesiogines užklausas — klientai patys ieško tavęs",
                color: "bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400",
              },
              {
                icon: <Clock className="h-5 w-5" />,
                text: "Profilis paruoštas vos per 20 sekundžių su AI",
                color: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
              },
              {
                icon: <TrendingUp className="h-5 w-5" />,
                text: "Auginkite verslą — kuo aukštesnis profilio užpildymas, tuo daugiau klientų",
                color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
              },
              {
                icon: <Shield className="h-5 w-5" />,
                text: "Pradžiai nemokamai — 3 atsakymai į užklausas per mėnesį",
                color: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
              },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-3 rounded-xl border border-surface-100 bg-surface-50/50 p-3.5 dark:border-surface-800 dark:bg-surface-800/30 transition-shadow hover:shadow-sm"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.color}`}
                >
                  {item.icon}
                </div>
                <span className="text-body-sm text-surface-700 dark:text-surface-300 leading-snug">
                  {item.text}
                </span>
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-3 text-body-sm text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
              {error}
            </div>
          )}

          <Button onClick={handleBecomeProvider} isLoading={loading} className="w-full" size="lg">
            <Sparkles className="mr-2 h-4 w-4" />
            Pradėti su AI
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <p className="mt-4 text-center text-micro text-surface-400 dark:text-surface-500">
            Aktyvavus tiekėjo paskyrą iškart galėsi sukurti profilį su AI arba užpildyti rankiniu būdu.
          </p>
        </div>
      </div>
    </div>
  );
}
