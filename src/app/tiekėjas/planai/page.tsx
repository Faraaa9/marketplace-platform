"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PLAN_LIMITS } from "@/lib/constants";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Check, X, Crown, Star } from "lucide-react";

interface ProfileData {
  planType: string;
}

export default function PlansPage() {
  return <Suspense fallback={<LoadingSpinner />}><PlansContent /></Suspense>;
}

function PlansContent() {
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState("");

  const success = searchParams.get("success");

  useEffect(() => {
    fetch("/api/tiekėjas/profilis")
      .then((r) => r.json())
      .then((data) => { if (data.success) setProfile(data.data); })
      .finally(() => setLoading(false));
  }, []);

  async function handleCheckout(priceId: string, plan: string) {
    setCheckoutLoading(plan);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.success && data.data.url) {
        window.location.href = data.data.url;
      }
    } catch {} finally {
      setCheckoutLoading("");
    }
  }

  async function handlePortal() {
    try {
      const res = await fetch("/api/stripe/portal");
      const data = await res.json();
      if (data.success && data.data.url) {
        window.location.href = data.data.url;
      }
    } catch {}
  }

  if (loading) return <LoadingSpinner />;

  const currentPlan = profile?.planType || "FREE";

  const plans = [
    {
      name: "FREE",
      label: "Nemokamas",
      price: "€0",
      period: "per mėn.",
      icon: null,
      features: [
        { label: `${PLAN_LIMITS.FREE.responsesPerMonth} atsakymai/mėn.`, included: true },
        { label: "El. pašto kontaktai", included: true },
        { label: "Telefono kontaktai", included: false },
        { label: "Prioritetinis rodymas", included: false },
        { label: "Patikimumo ženklelis", included: false },
      ],
    },
    {
      name: "BASIC",
      label: "Bazinis",
      price: "€29",
      period: "per mėn.",
      icon: <Star className="h-5 w-5 text-amber-500" />,
      features: [
        { label: `${PLAN_LIMITS.BASIC.responsesPerMonth} atsakymų/mėn.`, included: true },
        { label: "El. pašto kontaktai", included: true },
        { label: "Telefono kontaktai", included: true },
        { label: "Prioritetinis rodymas", included: false },
        { label: `„${PLAN_LIMITS.BASIC.badge}" ženklelis`, included: true },
      ],
    },
    {
      name: "PRO",
      label: "Profesionalus",
      price: "€59",
      period: "per mėn.",
      icon: <Crown className="h-5 w-5 text-brand-500" />,
      features: [
        { label: "Neriboti atsakymai", included: true },
        { label: "El. pašto kontaktai", included: true },
        { label: "Telefono kontaktai", included: true },
        { label: "Prioritetinis rodymas", included: true },
        { label: `„${PLAN_LIMITS.PRO.badge}" ženklelis`, included: true },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white mb-2">Planai ir kainos</h1>
      <p className="text-body text-surface-500 dark:text-surface-400 mb-10">Pasirinkite planą, kuris tinka jūsų verslui</p>

      {success && (
        <div className="mb-6 rounded-xl bg-emerald-50 p-4 text-body-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          Planas sėkmingai aktyvuotas!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={`relative ${plan.name === "BASIC" ? "border-brand-500 ring-2 ring-brand-500 shadow-stripe" : ""}`}
          >
            {plan.name === "BASIC" && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="brand">Populiariausias</Badge>
              </div>
            )}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                {plan.icon}
                <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white">{plan.label}</h3>
              </div>
              <div className="text-display font-bold text-surface-900 dark:text-white">{plan.price}</div>
              <p className="text-body-sm text-surface-500">{plan.period}</p>
            </div>

            <ul className="space-y-3 mb-6">
              {plan.features.map((feature) => (
                <li key={feature.label} className="flex items-center gap-2.5 text-body-sm">
                  {feature.included ? (
                    <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-surface-300 flex-shrink-0 dark:text-surface-600" />
                  )}
                  <span className={feature.included ? "text-surface-700 dark:text-surface-300" : "text-surface-400 dark:text-surface-500"}>
                    {feature.label}
                  </span>
                </li>
              ))}
            </ul>

            {currentPlan === plan.name ? (
              <Button variant="secondary" className="w-full" disabled>
                Dabartinis planas
              </Button>
            ) : plan.name === "FREE" ? (
              <Button variant="outline" className="w-full" disabled>
                Nemokamas
              </Button>
            ) : (
              <Button
                className="w-full"
                variant={plan.name === "BASIC" ? "primary" : "outline"}
                isLoading={checkoutLoading === plan.name}
                onClick={() => handleCheckout(
                  plan.name === "BASIC"
                    ? process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID || "price_basic"
                    : process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "price_pro",
                  plan.name
                )}
              >
                Pasirinkti
              </Button>
            )}
          </Card>
        ))}
      </div>

      {currentPlan !== "FREE" && (
        <div className="mt-8 text-center">
          <Button variant="ghost" onClick={handlePortal}>
            Valdyti prenumeratą
          </Button>
        </div>
      )}
    </div>
  );
}
