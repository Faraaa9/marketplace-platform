"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Users, FileText, MessageCircle, UserCheck } from "lucide-react";

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

  const statCards = [
    { label: "Naudotojai", value: stats.totalUsers, icon: Users, bgClass: "bg-brand-50 dark:bg-brand-500/10", iconClass: "text-brand-600 dark:text-brand-400" },
    { label: "Tiekėjai", value: stats.totalProviders, icon: UserCheck, bgClass: "bg-emerald-50 dark:bg-emerald-500/10", iconClass: "text-emerald-600 dark:text-emerald-400" },
    { label: "Užklausos", value: stats.totalRequests, icon: FileText, bgClass: "bg-violet-50 dark:bg-violet-500/10", iconClass: "text-violet-600 dark:text-violet-400" },
    { label: "Atsakymai", value: stats.totalResponses, icon: MessageCircle, bgClass: "bg-amber-50 dark:bg-amber-500/10", iconClass: "text-amber-600 dark:text-amber-400" },
  ];

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white mb-8">Suvestinė</h1>

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
