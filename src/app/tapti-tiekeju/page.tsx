"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Particles } from "@/components/magicui/particles";
import { ArrowRight, Shield, Users, TrendingUp } from "lucide-react";

export default function BecomeProviderPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Not logged in — redirect to register
  if (status === "unauthenticated") {
    router.replace("/registruotis");
    return null;
  }

  // Already a provider
  if (session?.user?.role === "PROVIDER") {
    router.replace("/tiekejas");
    return null;
  }

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

  if (status === "loading") return null;

  return (
    <div className="relative flex min-h-[85vh] items-center justify-center px-4">
      <div className="absolute inset-0 bg-radial-brand-subtle" />
      <Particles className="opacity-15" quantity={20} color="#6366f1" size={1} speed={0.1} />

      <div className="relative w-full max-w-lg">
        <div className="rounded-2xl border border-surface-200/60 bg-white/90 backdrop-blur-sm p-8 shadow-elevated dark:border-surface-700/50 dark:bg-surface-900/90">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-600/20">
              <Users className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-heading-2 font-bold text-surface-900 dark:text-white">
              Tapkite tiekėju
            </h1>
            <p className="mt-2 text-body-sm text-surface-500 dark:text-surface-400 max-w-sm mx-auto">
              Pradėkite gauti užklausas iš klientų. Jūsų esama paskyra išliks — galėsite ir toliau pateikti savo užklausas.
            </p>
          </div>

          <div className="space-y-3 mb-8">
            {[
              { icon: <Users className="h-5 w-5" />, text: "Gaukite tiesiogines užklausas iš klientų", color: "bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400" },
              { icon: <TrendingUp className="h-5 w-5" />, text: "Auginkite verslą su platforma", color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" },
              { icon: <Shield className="h-5 w-5" />, text: "Pradėkite nemokamai — 3 atsakymai per mėnesį", color: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 rounded-xl border border-surface-100 bg-surface-50/50 p-4 dark:border-surface-800 dark:bg-surface-800/30">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
                  {item.icon}
                </div>
                <span className="text-body-sm text-surface-700 dark:text-surface-300">{item.text}</span>
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-3 text-body-sm text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
              {error}
            </div>
          )}

          <Button onClick={handleBecomeProvider} isLoading={loading} className="w-full">
            Tapti tiekėju
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <p className="mt-4 text-center text-micro text-surface-400 dark:text-surface-500">
            Aktyvavus tiekėjo paskyrą, galėsite užpildyti profilį ir pradėti atsakyti į užklausas.
          </p>
        </div>
      </div>
    </div>
  );
}
