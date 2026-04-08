"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
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
        // Refresh session to pick up new role
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
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-surface-200/60 bg-white p-8 shadow-card dark:border-surface-700/50 dark:bg-surface-900/50">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-heading-2 font-bold text-surface-900 dark:text-white">
              Tapkite tiekėju
            </h1>
            <p className="mt-2 text-body-sm text-surface-500 dark:text-surface-400">
              Pradėkite gauti užklausas iš klientų. Jūsų esama paskyra išliks — galėsite ir toliau pateikti savo užklausas.
            </p>
          </div>

          <div className="space-y-3 mb-8">
            {[
              { icon: <Users className="h-5 w-5 text-brand-600" />, text: "Gaukite tiesiogines užklausas iš klientų" },
              { icon: <TrendingUp className="h-5 w-5 text-brand-600" />, text: "Auginkite verslą su platforma" },
              { icon: <Shield className="h-5 w-5 text-brand-600" />, text: "Pradėkite nemokamai — 3 atsakymai per mėnesį" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 rounded-xl bg-surface-50 p-3 dark:bg-surface-800/50">
                {item.icon}
                <span className="text-body-sm text-surface-700 dark:text-surface-300">{item.text}</span>
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-body-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
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
