"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Card, { CardTitle } from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Badge from "@/components/ui/Badge";
import { MagicCard } from "@/components/magicui/magic-card";
import { FileText, MessageCircle, TrendingUp, AlertCircle, AlertTriangle, ArrowRight, Mail, ShieldCheck, User, CheckCircle2 } from "lucide-react";

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
  profileCompleteness: number;
  missingProfileItems: string[];
  acceptedCount: number;
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
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200/60 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-500/10">
      <Mail className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="flex-1 text-body-sm text-amber-800 dark:text-amber-300">
        El. paštas nepatvirtintas — negalėsite peržiūrėti užklausų.
      </p>
      {sent ? (
        <span className="text-body-sm font-medium text-emerald-600 dark:text-emerald-400 shrink-0">Išsiųsta!</span>
      ) : (
        <button
          onClick={handleResend}
          disabled={sending}
          className="text-body-sm font-medium text-amber-700 underline hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 disabled:opacity-50 shrink-0"
        >
          {sending ? "..." : "Siųsti dar kartą"}
        </button>
      )}
    </div>
  );
}

/** Determine the single most important next action for the provider */
function getNextAction(stats: Stats): { label: string; description: string; href: string; priority: "high" | "medium" | "low" } | null {
  if (!stats.emailVerified) return null; // banner handles this
  if (!stats.isActive) return null; // banner handles this
  if (stats.profileCompleteness < 100) {
    return {
      label: "Užpildykite profilį",
      description: `${stats.profileCompleteness}% — trūksta: ${stats.missingProfileItems.slice(0, 2).join(", ")}`,
      href: "/tiekejas/profilis",
      priority: stats.profileCompleteness < 50 ? "high" : "medium",
    };
  }
  if (stats.totalRequests > 0 && stats.myResponses === 0) {
    return {
      label: "Atsakykite į pirmą užklausą",
      description: `${stats.totalRequests} aktyvios užklausos laukia jūsų pasiūlymo`,
      href: "/tiekejas/uzklausos",
      priority: "high",
    };
  }
  if (stats.totalRequests > stats.myResponses) {
    return {
      label: "Peržiūrėkite naujas užklausas",
      description: `${stats.totalRequests - stats.myResponses} užklausos be jūsų atsakymo`,
      href: "/tiekejas/uzklausos",
      priority: "medium",
    };
  }
  return null;
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
  const nextAction = stats ? getNextAction(stats) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Header — contextual with plan badge */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">Valdymo panelė</h1>
          <p className="mt-0.5 text-body-sm text-surface-500 dark:text-surface-400">
            {stats?.acceptedCount
              ? `${stats.acceptedCount} priimti pasiūlymai`
              : "Pradėkite atsakinėti į užklausas"}
          </p>
        </div>
        {stats && (
          <Badge variant={stats.planType === "PRO" ? "brand" : stats.planType === "BASIC" ? "success" : "default"}>
            {stats.planType || "FREE"}
          </Badge>
        )}
      </div>

      {/* Compact alerts — email, activation, payment */}
      {stats && !stats.emailVerified && <ResendVerificationBanner />}

      {stats && stats.emailVerified && !stats.isActive && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200/60 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-500/10">
          <ShieldCheck className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-body-sm text-amber-800 dark:text-amber-300">
            Paskyra laukia aktyvacijos — kol kas galite redaguoti profilį ir pasirinkti planą.
          </p>
        </div>
      )}

      {stats && stats.subscriptionStatus === "PAST_DUE" && stats.storedPlanType !== "FREE" && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200/60 bg-red-50 px-4 py-3 dark:border-red-800/40 dark:bg-red-500/10">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <p className="flex-1 text-body-sm text-red-800 dark:text-red-300">
            Mokėjimas nepavyko — veikiate su nemokamo plano limitais.
          </p>
          <button onClick={handlePortal} className="text-body-sm font-medium text-red-700 underline hover:text-red-800 dark:text-red-400 shrink-0">
            Atnaujinti →
          </button>
        </div>
      )}

      {stats && stats.subscriptionStatus === "CANCELED" && stats.storedPlanType !== "FREE" && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200/60 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="flex-1 text-body-sm text-amber-800 dark:text-amber-300">
            {stats.storedPlanType} planas atšauktas — veikiate su nemokamo plano limitais.
          </p>
          <Link href="/tiekejas/planai" className="text-body-sm font-medium text-amber-700 underline hover:text-amber-800 dark:text-amber-400 shrink-0">
            Atnaujinti →
          </Link>
        </div>
      )}

      {/* Next action — contextual CTA */}
      {nextAction && (
        <Link
          href={nextAction.href}
          className="group mb-6 flex items-center gap-3 rounded-2xl border border-brand-200/60 bg-brand-50 px-5 py-4 transition-colors hover:bg-brand-100/60 dark:border-brand-800/40 dark:bg-brand-500/10 dark:hover:bg-brand-500/15"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-500/20">
            <ArrowRight className="h-4 w-4 text-brand-600 dark:text-brand-400 transition-transform group-hover:translate-x-0.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-body-sm font-semibold text-brand-900 dark:text-brand-200">{nextAction.label}</p>
            <p className="text-micro text-brand-700/70 dark:text-brand-400/70 truncate">{nextAction.description}</p>
          </div>
        </Link>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MagicCard className="p-0" gradientColor="rgba(99, 102, 241, 0.06)">
          <div className="p-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950">
              <FileText className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <p className="text-heading-2 font-bold text-surface-900 dark:text-white">{stats?.totalRequests || 0}</p>
              <p className="text-micro text-surface-500">Aktyvios užklausos</p>
            </div>
          </div>
        </MagicCard>
        <MagicCard className="p-0" gradientColor="rgba(16, 185, 129, 0.06)">
          <div className="p-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-heading-2 font-bold text-surface-900 dark:text-white">{stats?.myResponses || 0}</p>
              <p className="text-micro text-surface-500">Mano atsakymai</p>
            </div>
          </div>
        </MagicCard>
        <MagicCard className="p-0" gradientColor="rgba(139, 92, 246, 0.06)">
          <div className="p-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-500/10">
              <TrendingUp className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-heading-2 font-bold text-surface-900 dark:text-white">{stats?.thisMonthResponses || 0}</p>
              <p className="text-micro text-surface-500">Šį mėnesį</p>
            </div>
          </div>
        </MagicCard>
        <MagicCard className="p-0" gradientColor="rgba(16, 185, 129, 0.06)">
          <div className="p-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-heading-2 font-bold text-surface-900 dark:text-white">{stats?.acceptedCount || 0}</p>
              <p className="text-micro text-surface-500">Priimti</p>
            </div>
          </div>
        </MagicCard>
      </div>

      {/* Responses remaining + Profile completeness — compact combined row */}
      {stats && canAccessRequests && (stats.responsesRemaining !== -1 || stats.profileCompleteness < 100) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {stats.responsesRemaining !== -1 && (
            <div className="rounded-2xl border border-surface-200/60 bg-white p-4 dark:border-surface-700/50 dark:bg-surface-900/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-micro font-medium text-surface-500">Likę atsakymai</p>
                <p className="text-body-sm font-bold text-surface-900 dark:text-white">
                  {stats.responsesRemaining}<span className="font-normal text-surface-400">/{stats.responsesLimit}</span>
                </p>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    stats.responsesRemaining <= 2
                      ? "bg-gradient-to-r from-red-400 to-red-500"
                      : "bg-gradient-to-r from-brand-500 to-brand-600"
                  }`}
                  style={{ width: `${stats.responsesLimit > 0 ? ((stats.responsesLimit - stats.responsesRemaining) / stats.responsesLimit) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
          {stats.profileCompleteness < 100 && (
            <Link
              href="/tiekejas/profilis"
              className="group rounded-2xl border border-surface-200/60 bg-white p-4 dark:border-surface-700/50 dark:bg-surface-900/50 hover:border-brand-200 dark:hover:border-brand-800/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-micro font-medium text-surface-500">Profilis</p>
                <p className="text-body-sm font-bold text-surface-900 dark:text-white">{stats.profileCompleteness}%</p>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden mb-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-500"
                  style={{ width: `${stats.profileCompleteness}%` }}
                />
              </div>
              {stats.missingProfileItems.length > 0 && (
                <p className="text-micro text-surface-400 truncate">
                  Trūksta: {stats.missingProfileItems.join(", ")}
                </p>
              )}
            </Link>
          )}
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {canAccessRequests ? (
          <Link href="/tiekejas/uzklausos" className="group">
            <Card hover>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Užklausos</CardTitle>
                  <p className="text-body-sm text-surface-500 mt-1">Naršyti ir atsakyti</p>
                </div>
                <ArrowRight className="h-4 w-4 text-surface-400 transition-transform group-hover:translate-x-1" />
              </div>
            </Card>
          </Link>
        ) : (
          <Card>
            <div className="flex items-center justify-between opacity-50">
              <div>
                <CardTitle>Užklausos</CardTitle>
                <p className="text-body-sm text-surface-500 mt-1">
                  {!stats?.emailVerified ? "Patvirtinkite el. paštą" : "Laukiama aktyvacijos"}
                </p>
              </div>
              <AlertCircle className="h-4 w-4 text-surface-400" />
            </div>
          </Card>
        )}
        <Link href="/tiekejas/profilis" className="group">
          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Profilis</CardTitle>
                <p className="text-body-sm text-surface-500 mt-1">Aprašymas ir nuotraukos</p>
              </div>
              <User className="h-4 w-4 text-surface-400 transition-transform group-hover:scale-110" />
            </div>
          </Card>
        </Link>
        <Link href="/tiekejas/planai" className="group">
          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Planai</CardTitle>
                <p className="text-body-sm text-surface-500 mt-1">Prenumerata ir limitai</p>
              </div>
              <ArrowRight className="h-4 w-4 text-surface-400 transition-transform group-hover:translate-x-1" />
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
