"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card, { CardTitle } from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Badge from "@/components/ui/Badge";
import { FileText, MessageCircle, TrendingUp, CreditCard, AlertCircle, ArrowRight } from "lucide-react";

interface Stats {
  totalRequests: number;
  myResponses: number;
  thisMonthResponses: number;
  planType: string;
  isActive: boolean;
}

export default function ProviderDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tiekėjas/stats")
      .then((r) => r.json())
      .then((data) => { if (data.success) setStats(data.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white mb-8">Valdymo panelė</h1>

      {stats && !stats.isActive && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-500/10">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-body-sm text-amber-800 dark:text-amber-300">
            Jūsų paskyra dar neaktyvuota. Administratorius peržiūrės ir aktyvuos jūsų profilį.
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

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/tiekėjas/uzklausos">
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
        <Link href="/tiekėjas/profilis">
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
        <Link href="/tiekėjas/planai">
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
