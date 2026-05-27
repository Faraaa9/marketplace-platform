"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Sparkline from "@/components/ui/Sparkline";
import MarketplaceIntelligenceCard from "./MarketplaceIntelligenceCard";
import FollowUpAgentCard from "./FollowUpAgentCard";
import { Users, FileText, MessageCircle, UserCheck, AlertTriangle, Clock, Sparkles } from "lucide-react";

type FollowUpBucket =
  | "provider_replied_client_silent"
  | "client_open_no_provider_replies"
  | "provider_no_reply_to_lead"
  | "client_inquiry_provider_silent";

interface FollowUpAdminSignal {
  totalThreads: number;
  countsByBucket: Record<FollowUpBucket, number>;
  stalledLeads: Array<{
    type: "response" | "direct";
    id: string;
    title: string;
    daysSinceActivity: number;
    bucket: FollowUpBucket;
  }>;
  unansweredRequests: Array<{
    id: string;
    title: string;
    ageDays: number;
  }>;
  recommendations: string[];
}

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
  aiUsage: AiUsageStats;
  marketplaceIntelligence: MarketplaceIntelligence;
  followUps: FollowUpAdminSignal;
  chartData: ChartDay[];
  usersChart: ChartDay[];
  providersChart: ChartDay[];
  responsesChart: ChartDay[];
}

interface AiUsageStats {
  total14d: number;
  success14d: number;
  error14d: number;
  avgLatencyMs: number | null;
  lastRunAt: string | null;
  byFeature: Array<{ feature: string; total: number; errors: number; avgLatencyMs: number | null }>;
  recentErrors: Array<{ feature: string; errorCode: string | null; createdAt: string }>;
}

interface MarketplaceIntelligence {
  supplyDemandGaps: Array<{
    categoryId: string;
    categoryName: string;
    requestCount: number;
    providerCount: number;
    gapScore: number;
  }>;
  unansweredRequests: Array<{
    id: string;
    title: string;
    categoryName: string;
    location: string;
    createdAt: string;
  }>;
  recommendations: string[];
}

const FEATURE_LABELS: Record<string, string> = {
  lead_copilot: "Lead co-pilot",
  proposal_draft: "Pasiūlymo juodraštis",
  request_improve: "Užklausos tvarkymas",
  category_suggest: "Kategorijų parinkimas",
  profile_generate: "Profilio generavimas",
  audio_transcribe: "Balso transkripcija",
  moderation: "Moderacija",
  semantic_match_shadow: "Semantinis matching'as",
  follow_up_scan: "Follow-up skenavimas",
};

function featureLabel(feature: string): string {
  return FEATURE_LABELS[feature] ?? feature.replace(/_/g, " ");
}

function formatLatency(ms: number | null): string {
  if (ms == null) return "nėra";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`;
  return `${ms} ms`;
}

function formatRunTime(value: string | null): string {
  if (!value) return "dar nėra";
  return new Date(value).toLocaleString("lt-LT", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RequestsChart({ data }: { data: ChartDay[] }) {
  const width = 600;
  const height = 180;
  const padding = { top: 16, right: 8, bottom: 28, left: 8 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(...data.map((d) => d.count), 1);
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = padding.left + i * stepX;
    const y = padding.top + innerH - (d.count / max) * innerH;
    return { x, y, count: d.count, label: d.label };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(" ");
  const areaPath =
    `${linePath} L${points[points.length - 1].x.toFixed(2)},${padding.top + innerH} ` +
    `L${padding.left.toFixed(2)},${padding.top + innerH} Z`;

  // 4 horizontal grid lines (incl. baseline)
  const gridY = Array.from({ length: 4 }, (_, i) => padding.top + (innerH * i) / 3);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="block w-full h-48"
        aria-hidden="true"
      >
        {gridY.map((y, i) => (
          <line
            key={i}
            x1={padding.left}
            x2={width - padding.right}
            y1={y}
            y2={y}
            className="stroke-surface-200 dark:stroke-surface-700"
            strokeWidth={1}
            strokeDasharray={i === gridY.length - 1 ? undefined : "2 4"}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path d={areaPath} className="fill-brand-500/15" />
        <path
          d={linePath}
          className="stroke-brand-500"
          fill="none"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={p.count > 0 ? 3.5 : 2}
            className={p.count > 0 ? "fill-brand-500" : "fill-surface-300 dark:fill-surface-600"}
          />
        ))}
      </svg>
      {/* Overlay labels — positioned in % so they stay aligned over the SVG */}
      <div className="pointer-events-none absolute inset-0">
        {points.map((p, i) => {
          const leftPct = (p.x / width) * 100;
          const topPct = (p.y / height) * 100;
          return (
            <div key={i}>
              {p.count > 0 && (
                <span
                  className="absolute -translate-x-1/2 -translate-y-full pb-1 text-[11px] font-medium text-surface-700 dark:text-surface-200"
                  style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                >
                  {p.count}
                </span>
              )}
              <span
                className="absolute -translate-x-1/2 whitespace-nowrap text-[10px] text-surface-400"
                style={{ left: `${leftPct}%`, bottom: 4 }}
              >
                {p.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
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

  const hasActions = stats.pendingActivation > 0 || stats.pendingRequests > 0;
  const aiErrorRate =
    stats.aiUsage.total14d > 0
      ? Math.round((stats.aiUsage.error14d / stats.aiUsage.total14d) * 100)
      : 0;
  const maxAiFeatureCount = Math.max(...stats.aiUsage.byFeature.map((item) => item.total), 1);

  const statCards = [
    {
      label: "Naudotojai",
      value: stats.totalUsers,
      icon: Users,
      bgClass: "bg-brand-50 dark:bg-brand-500/10",
      iconClass: "text-brand-600 dark:text-brand-400",
      strokeClass: "stroke-brand-500",
      fillClass: "fill-brand-500/10",
      series: stats.usersChart.map((d) => d.count),
    },
    {
      label: "Tiekėjai",
      value: stats.totalProviders,
      icon: UserCheck,
      bgClass: "bg-emerald-50 dark:bg-emerald-500/10",
      iconClass: "text-emerald-600 dark:text-emerald-400",
      strokeClass: "stroke-emerald-500",
      fillClass: "fill-emerald-500/10",
      series: stats.providersChart.map((d) => d.count),
    },
    {
      label: "Užklausos",
      value: stats.totalRequests,
      icon: FileText,
      bgClass: "bg-violet-50 dark:bg-violet-500/10",
      iconClass: "text-violet-600 dark:text-violet-400",
      strokeClass: "stroke-violet-500",
      fillClass: "fill-violet-500/10",
      series: stats.chartData.map((d) => d.count),
    },
    {
      label: "Atsakymai",
      value: stats.totalResponses,
      icon: MessageCircle,
      bgClass: "bg-amber-50 dark:bg-amber-500/10",
      iconClass: "text-amber-600 dark:text-amber-400",
      strokeClass: "stroke-amber-500",
      fillClass: "fill-amber-500/10",
      series: stats.responsesChart.map((d) => d.count),
    },
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
            <Sparkline
              data={stat.series}
              strokeClassName={stat.strokeClass}
              fillClassName={stat.fillClass}
              className="mt-4 h-10 w-full"
              height={32}
            />
          </Card>
        ))}
      </div>

      <MarketplaceIntelligenceCard intelligence={stats.marketplaceIntelligence} />

      <FollowUpAgentCard followUps={stats.followUps} />

      <Card className="mb-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-50 p-2.5 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white">
                AI health
              </h3>
              <p className="text-micro text-surface-500">
                Paskutinis kvietimas: {formatRunTime(stats.aiUsage.lastRunAt)}
              </p>
            </div>
          </div>
          {stats.aiUsage.total14d > 0 && (
            <span className="inline-flex min-h-8 items-center rounded-lg bg-surface-100 px-3 text-caption font-semibold text-surface-600 dark:bg-surface-800 dark:text-surface-300">
              14 d. langas
            </span>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-surface-200/60 bg-surface-50 p-3 dark:border-surface-700/50 dark:bg-surface-800/40">
            <p className="text-micro text-surface-500">AI kvietimai</p>
            <p className="mt-1 text-heading-3 font-bold text-surface-900 dark:text-white">
              {stats.aiUsage.total14d}
            </p>
          </div>
          <div className="rounded-xl border border-surface-200/60 bg-surface-50 p-3 dark:border-surface-700/50 dark:bg-surface-800/40">
            <p className="text-micro text-surface-500">Klaidų dalis</p>
            <p className={`mt-1 text-heading-3 font-bold ${aiErrorRate > 15 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {aiErrorRate}%
            </p>
          </div>
          <div className="rounded-xl border border-surface-200/60 bg-surface-50 p-3 dark:border-surface-700/50 dark:bg-surface-800/40">
            <p className="text-micro text-surface-500">Vid. trukmė</p>
            <p className="mt-1 text-heading-3 font-bold text-surface-900 dark:text-white">
              {formatLatency(stats.aiUsage.avgLatencyMs)}
            </p>
          </div>
        </div>

        {stats.aiUsage.byFeature.length > 0 ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_18rem]">
            <div>
              <h4 className="mb-3 text-caption font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                Funkcijos
              </h4>
              <div className="space-y-3">
                {stats.aiUsage.byFeature.map((item) => (
                  <div key={item.feature}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-body-sm">
                      <span className="font-medium text-surface-700 dark:text-surface-200">
                        {featureLabel(item.feature)}
                      </span>
                      <span className="text-micro text-surface-500">
                        {item.total} kv. · {formatLatency(item.avgLatencyMs)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800">
                      <div
                        className={`h-full rounded-full ${item.errors > 0 ? "bg-amber-500" : "bg-brand-500"}`}
                        style={{ width: `${Math.max(8, (item.total / maxAiFeatureCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-caption font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                Naujausios klaidos
              </h4>
              {stats.aiUsage.recentErrors.length > 0 ? (
                <div className="space-y-2">
                  {stats.aiUsage.recentErrors.map((item) => (
                    <div
                      key={`${item.feature}-${item.createdAt}`}
                      className="rounded-xl bg-amber-50 px-3 py-2 text-body-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
                    >
                      <p className="font-medium">{featureLabel(item.feature)}</p>
                      <p className="text-micro opacity-80">
                        {item.errorCode || "AI_ERROR"} · {formatRunTime(item.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-body-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  Klaidų per 14 dienų nėra.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-surface-50 px-3 py-2 text-body-sm text-surface-500 dark:bg-surface-800/50 dark:text-surface-400">
            AI kvietimų dar nėra. Duomenys atsiras tiekėjams pradėjus naudoti lead co-pilot.
          </p>
        )}
      </Card>

      {/* Užklausos per 14 dienų — line + area chart */}
      <Card>
        <div className="mb-6 flex items-baseline justify-between gap-3">
          <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white">Užklausos per 14 dienų</h3>
          <span className="text-micro text-surface-500">
            Viso: {stats.chartData.reduce((sum, d) => sum + d.count, 0)}
          </span>
        </div>
        <RequestsChart data={stats.chartData} />
      </Card>
    </div>
  );
}
