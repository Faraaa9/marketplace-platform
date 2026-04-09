"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Users, FileText, MessageCircle, UserCheck, AlertTriangle, Clock } from "lucide-react";

interface ChartDay {
  date: string;
  label: string;
  count: number;
}

interface Stats {
  totalUsers: number;
  totalProviders: number;
  totalRequests: number;
  totalResponses: number;
  pendingRequests: number;
  pendingActivation: number;
  chartData: ChartDay[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => { if (data.success) setStats(data.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!stats) return null;

  const maxCount = Math.max(...stats.chartData.map((d) => d.count), 1);
  const hasActions = stats.pendingActivation > 0 || stats.pendingRequests > 0;

  const statCards = [
    { label: "Naudotojai", value: stats.totalUsers, icon: Users, bgClass: "bg-brand-50 dark:bg-brand-500/10", iconClass: "text-brand-600 dark:text-brand-400" },
    { label: "Tiekėjai", value: stats.totalProviders, icon: UserCheck, bgClass: "bg-emerald-50 dark:bg-emerald-500/10", iconClass: "text-emerald-600 dark:text-emerald-400" },
    { label: "Užklausos", value: stats.totalRequests, icon: FileText, bgClass: "bg-violet-50 dark:bg-violet-500/10", iconClass: "text-violet-600 dark:text-violet-400" },
    { label: "Atsakymai", value: stats.totalResponses, icon: MessageCircle, bgClass: "bg-amber-50 dark:bg-amber-500/10", iconClass: "text-amber-600 dark:text-amber-400" },
  ];

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white mb-8">Suvestinė</h1>

      {/* Action items */}
      {hasActions && (
        <div className="mb-6 space-y-3">
          {stats.pendingActivation > 0 && (
            <Link href="/admin/tiekejai" className="block">
              <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 hover:bg-amber-100 transition-colors dark:border-amber-800 dark:bg-amber-500/10 dark:hover:bg-amber-500/20">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-body-sm font-medium text-amber-900 dark:text-amber-200">
                    {stats.pendingActivation} {stats.pendingActivation === 1 ? "tiekėjas laukia" : "tiekėjai laukia"} aktyvacijos
                  </p>
                  <p className="text-micro text-amber-700/70 dark:text-amber-400/70">Peržiūrėkite ir aktyvuokite naujus tiekėjus</p>
                </div>
                <span className="text-micro font-medium text-amber-600 dark:text-amber-400">Peržiūrėti →</span>
              </div>
            </Link>
          )}
          {stats.pendingRequests > 0 && (
            <Link href="/admin/uzklausos" className="block">
              <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 hover:bg-blue-100 transition-colors dark:border-blue-800 dark:bg-blue-500/10 dark:hover:bg-blue-500/20">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-body-sm font-medium text-blue-900 dark:text-blue-200">
                    {stats.pendingRequests} {stats.pendingRequests === 1 ? "užklausa laukia" : "užklausos laukia"} el. pašto patvirtinimo
                  </p>
                  <p className="text-micro text-blue-700/70 dark:text-blue-400/70">Klientai dar nepatvirtino savo el. pašto</p>
                </div>
                <span className="text-micro font-medium text-blue-600 dark:text-blue-400">Peržiūrėti →</span>
              </div>
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-center gap-3">
              <div className={`rounded-xl p-2.5 ${stat.bgClass}`}>
                <stat.icon className={`h-5 w-5 ${stat.iconClass}`} />
              </div>
              <div>
                <p className="text-heading-2 font-bold text-surface-900 dark:text-white">{stat.value}</p>
                <p className="text-micro text-surface-500">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Bar chart */}
      <Card>
        <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white mb-6">Užklausos per 14 dienų</h3>
        <div className="flex items-end gap-1.5 h-48">
          {stats.chartData.map((day) => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-micro text-surface-500">{day.count}</span>
              <div
                className="w-full bg-gradient-to-t from-brand-600 to-brand-400 rounded-t-md min-h-[4px] transition-all"
                style={{ height: `${(day.count / maxCount) * 100}%` }}
              />
              <span className="text-[10px] text-surface-400 rotate-[-45deg] origin-top-left whitespace-nowrap">
                {day.label}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
