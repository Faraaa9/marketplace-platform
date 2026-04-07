"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Card, { CardTitle } from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Badge from "@/components/ui/Badge";
import { FileText, MessageCircle, TrendingUp, CreditCard, AlertCircle, AlertTriangle, ArrowRight, Mail, ShieldCheck } from "lucide-react";

interface Stats {
  totalRequests: number;
  myResponses: number;
  thisMonthResponses: number;
  planType: string;
  storedPlanType: string;
  subscriptionStatus: string | null;
  isActive: boolean;
  emailVerified: boolean;
  responsesRemaining: number;
  responsesLimit: number;
}

function ResendVerificationBanner() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleResend() {
    setSending(true);
    try {
      await fetch("/api/auth/resend-verification", { method: "POST" });
      setSent(true);
    } catch {} finally {
      setSending(false);
    }
  }

  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-700 dark:bg-red-500/10">
      <Mail className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-body-sm font-medium text-red-800 dark:text-red-300">
          El. paštas nepatvirtintas
        </p>
        <p className="text-body-sm text-red-700 dark:text-red-400 mt-1">
          Patikrinkite savo el. pašto dėžutę ir spauskite patvirtinimo nuorodą. Kol el. paštas nepatvirtintas, negalėsite peržiūrėti klientų užklausų.
        </p>
        {sent ? (
          <p className="mt-2 text-body-sm font-medium text-emerald-600 dark:text-emerald-400">Patvirtinimo laiškas išsiųstas!</p>
        ) : (
          <button
            onClick={handleResend}
            disabled={sending}
            className="mt-2 text-body-sm font-medium text-red-700 underline hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
          >
            {sending ? "Siunčiama..." : "Siųsti patvirtinimo nuorodą dar kartą"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ProviderDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tiekejas/stats")
      .then((r) => r.json())
      .then((data) => { if (data.success) setStats(data.data); })
      .finally(() => setLoading(false));
  }, []);

  const handlePortal = useCallback(async () => {
    try {
      const res = await fetch("/api/stripe/portal");
      const data = await res.json();
      if (data.success && data.data.url) {
        window.location.href = data.data.url;
      }
    } catch {}
  }, []);

  if (loading) return <LoadingSpinner />;

  const canAccessRequests = stats?.emailVerified && stats?.isActive;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white mb-8">Valdymo panelė</h1>

      {/* Onboarding blockers */}
      {stats && !stats.emailVerified && (
        <ResendVerificationBanner />
      )}

      {stats && stats.emailVerified && !stats.isActive && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-500/10">
          <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-body-sm font-medium text-amber-800 dark:text-amber-300">
              Paskyra laukia aktyvacijos
            </p>
            <p className="text-body-sm text-amber-700 dark:text-amber-400 mt-1">
              Administratorius peržiūrės ir aktyvuos jūsų profilį. Kol kas galite redaguoti savo profilį ir pasirinkti planą. Kai paskyra bus aktyvuota, gausite pranešimą el. paštu.
            </p>
          </div>
        </div>
      )}

      {stats && stats.subscriptionStatus === "PAST_DUE" && stats.storedPlanType !== "FREE" && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-700 dark:bg-red-500/10">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-body-sm font-medium text-red-800 dark:text-red-300">
              Mokėjimas nepavyko — {stats.storedPlanType} plano funkcijos laikinai apribotos
            </p>
            <p className="text-body-sm text-red-700 dark:text-red-400 mt-1">
              Jūsų prenumeratos mokėjimas nepavyko. Kol mokėjimas nebus atnaujintas, veiksite su nemokamo plano limitais (3 atsakymai/mėn., be telefono kontaktų).
            </p>
            <button onClick={handlePortal} className="mt-2 text-body-sm font-medium text-red-700 underline hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
              Atnaujinti mokėjimo būdą →
            </button>
          </div>
        </div>
      )}

      {stats && stats.subscriptionStatus === "CANCELED" && stats.storedPlanType !== "FREE" && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-500/10">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-body-sm font-medium text-amber-800 dark:text-amber-300">
              Prenumerata atšaukta
            </p>
            <p className="text-body-sm text-amber-700 dark:text-amber-400 mt-1">
              Jūsų {stats.storedPlanType} planas buvo atšauktas. Veikiate su nemokamo plano limitais.
            </p>
            <Link href="/tiekejas/planai" className="mt-2 inline-block text-body-sm font-medium text-amber-700 underline hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300">
              Atnaujinti planą →
            </Link>
          </div>
        </div>
      )}

      {stats && canAccessRequests && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-700 dark:bg-emerald-500/10">
          <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-body-sm text-emerald-800 dark:text-emerald-300">
            Jūsų paskyra aktyvi — galite peržiūrėti ir atsakyti į klientų užklausas.
          </p>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-50 p-2.5 dark:bg-brand-950"><FileText className="h-5 w-5 text-brand-600 dark:text-brand-400" /></div>
            <div>
              <p className="text-heading-2 font-bold text-surface-900 dark:text-white">{stats?.totalRequests || 0}</p>
              <p className="text-micro text-surface-500">Aktyvios užklausos</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2.5 dark:bg-emerald-500/10"><MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /></div>
            <div>
              <p className="text-heading-2 font-bold text-surface-900 dark:text-white">{stats?.myResponses || 0}</p>
              <p className="text-micro text-surface-500">Mano atsakymai</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-50 p-2.5 dark:bg-violet-500/10"><TrendingUp className="h-5 w-5 text-violet-600 dark:text-violet-400" /></div>
            <div>
              <p className="text-heading-2 font-bold text-surface-900 dark:text-white">{stats?.thisMonthResponses || 0}</p>
              <p className="text-micro text-surface-500">Šį mėnesį</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-2.5 dark:bg-amber-500/10"><CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" /></div>
            <div>
              <Badge variant={stats?.planType === "PRO" ? "brand" : stats?.planType === "BASIC" ? "success" : "default"}>
                {stats?.planType || "FREE"}
              </Badge>
              <p className="text-micro text-surface-500 mt-1">Planas</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Remaining responses */}
      {stats && canAccessRequests && stats.responsesRemaining !== -1 && (
        <div className="mb-8 rounded-2xl border border-surface-200/60 bg-white p-4 dark:border-surface-700/50 dark:bg-surface-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body-sm text-surface-500">Likę atsakymai šį mėnesį</p>
              <p className="text-heading-2 font-bold text-surface-900 dark:text-white">
                {stats.responsesRemaining} <span className="text-body-sm font-normal text-surface-400">/ {stats.responsesLimit}</span>
              </p>
            </div>
            <div className="w-32 h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-600 transition-all"
                style={{ width: `${stats.responsesLimit > 0 ? ((stats.responsesLimit - stats.responsesRemaining) / stats.responsesLimit) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {canAccessRequests ? (
          <Link href="/tiekejas/uzklausos">
            <Card hover>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Peržiūrėti užklausas</CardTitle>
                  <p className="text-body-sm text-surface-500 mt-1">Naršyti ir atsakyti į klientų užklausas</p>
                </div>
                <ArrowRight className="h-4 w-4 text-surface-400" />
              </div>
            </Card>
          </Link>
        ) : (
          <Card>
            <div className="flex items-center justify-between opacity-50">
              <div>
                <CardTitle>Peržiūrėti užklausas</CardTitle>
                <p className="text-body-sm text-surface-500 mt-1">
                  {!stats?.emailVerified ? "Patvirtinkite el. paštą" : "Laukiama aktyvacijos"}
                </p>
              </div>
              <AlertCircle className="h-4 w-4 text-surface-400" />
            </div>
          </Card>
        )}
        <Link href="/tiekejas/profilis">
          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Redaguoti profilį</CardTitle>
                <p className="text-body-sm text-surface-500 mt-1">Atnaujinti aprašymą ir nuotraukas</p>
              </div>
              <ArrowRight className="h-4 w-4 text-surface-400" />
            </div>
          </Card>
        </Link>
        <Link href="/tiekejas/planai">
          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Planai ir prenumerata</CardTitle>
                <p className="text-body-sm text-surface-500 mt-1">Pasirinkti ar atnaujinti planą</p>
              </div>
              <ArrowRight className="h-4 w-4 text-surface-400" />
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
