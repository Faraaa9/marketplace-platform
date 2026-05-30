"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Link2,
  Users,
  FileText,
  Clock,
  ExternalLink,
} from "lucide-react";

interface BotInfo {
  id: number;
  username?: string;
  first_name?: string;
}
interface WebhookInfo {
  url: string;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  allowed_updates?: string[];
  max_connections?: number;
}
interface ConfigInfo {
  botTokenSet: boolean;
  webhookSecretSet: boolean;
  expectedWebhookUrl: string;
  bot: BotInfo | null;
  webhook: WebhookInfo | null;
  telegramError: string | null;
}
interface SessionItem {
  telegramUserId: string;
  state: string;
  linked: boolean;
  userName: string | null;
  userEmail: string | null;
  phone: string | null;
  hasDraft: boolean;
  draftTitle: string | null;
  createdAt: string;
  updatedAt: string;
}
interface RequestItem {
  id: string;
  title: string;
  status: string;
  moderationStatus: string;
  clientName: string;
  trackingToken: string | null;
  createdAt: string;
}
interface TelegramData {
  config: ConfigInfo;
  sessions: {
    total: number;
    linked: number;
    withDraft: number;
    byState: Record<string, number>;
    recent: SessionItem[];
  };
  requests: {
    total: number;
    last30d: number;
    recent: RequestItem[];
  };
}

const STATE_LABELS: Record<string, string> = {
  idle: "Laisva",
  awaiting_input: "Laukia aprašymo",
  draft_ready: "Juodraštis paruoštas",
  awaiting_contact: "Laukia kontakto",
};

function stateLabel(state: string): string {
  return STATE_LABELS[state] ?? state;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("lt-LT", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatUnix(sec: number): string {
  return new Date(sec * 1000).toLocaleString("lt-LT", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ConfigRow({ ok, label, value }: { ok: boolean; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <XCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
      )}
      <span className="w-44 shrink-0 text-body-sm text-surface-600 dark:text-surface-300">{label}</span>
      <span className="min-w-0 truncate text-body-sm font-medium text-surface-900 dark:text-white">
        {value}
      </span>
    </div>
  );
}

function ModerationBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    APPROVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    REJECTED: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  };
  const labels: Record<string, string> = {
    APPROVED: "Patvirtinta",
    PENDING: "Laukia",
    REJECTED: "Atmesta",
  };
  return (
    <span className={`rounded-md px-2 py-0.5 text-micro font-medium ${map[status] ?? "bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300"}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default function AdminTelegramPage() {
  const [data, setData] = useState<TelegramData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const load = () =>
      fetch("/api/admin/telegram")
        .then((r) => r.json())
        .then((res) => {
          if (!active) return;
          if (res.success) {
            setData(res.data as TelegramData);
            setError(false);
          } else {
            setError(true);
          }
        })
        .catch(() => active && setError(true))
        .finally(() => active && setLoading(false));
    load();
    const id = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error || !data) {
    return (
      <div className="p-6 lg:p-8">
        <p className="rounded-xl bg-red-50 px-4 py-3 text-body-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          Nepavyko įkelti Telegram duomenų.
        </p>
      </div>
    );
  }

  const { config, sessions, requests } = data;
  const webhookOk =
    config.webhook != null && config.webhook.url === config.expectedWebhookUrl;
  const lastError = config.webhook?.last_error_message;

  const statCards = [
    { label: "Pokalbiai (viso)", value: sessions.total, icon: Users },
    { label: "Susietos paskyros", value: sessions.linked, icon: Link2 },
    { label: "Aktyvūs juodraščiai", value: sessions.withDraft, icon: Clock },
    { label: "Skelbimai per Telegram", value: requests.total, icon: FileText },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-2 flex items-center gap-3">
        <div className="rounded-xl bg-brand-50 p-2.5 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          <Send className="h-5 w-5" />
        </div>
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">Telegram</h1>
      </div>
      <p className="mb-6 max-w-3xl text-body-sm text-surface-500 dark:text-surface-400">
        Boto konfigūracija, webhook būsena, pokalbiai ir per Telegram paskelbti skelbimai.
        Skaičiai atsinaujina kas 30 s.
      </p>

      {/* Konfigūracija ir webhook */}
      <div className="mb-8 grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-heading-3 font-semibold text-surface-900 dark:text-white">
            Konfigūracija
          </h3>
          <ConfigRow
            ok={config.botTokenSet}
            label="TELEGRAM_BOT_TOKEN"
            value={config.botTokenSet ? "nustatytas" : "trūksta"}
          />
          <ConfigRow
            ok={config.webhookSecretSet}
            label="TELEGRAM_WEBHOOK_SECRET"
            value={config.webhookSecretSet ? "nustatytas" : "trūksta"}
          />
          <ConfigRow
            ok={Boolean(config.bot?.username)}
            label="Botas"
            value={config.bot?.username ? `@${config.bot.username}` : "nepasiekiamas"}
          />
          {config.telegramError && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-body-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {config.telegramError}
            </p>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 text-heading-3 font-semibold text-surface-900 dark:text-white">
            Webhook
          </h3>
          <ConfigRow
            ok={webhookOk}
            label="Būsena"
            value={
              config.webhook == null
                ? "neregistruotas"
                : webhookOk
                  ? "registruotas teisingai"
                  : "URL nesutampa"
            }
          />
          {config.webhook && (
            <>
              <div className="py-2 text-body-sm">
                <span className="text-surface-500">Registruotas URL: </span>
                <code className="break-all text-surface-700 dark:text-surface-300">
                  {config.webhook.url || "(tuščia)"}
                </code>
              </div>
              {!webhookOk && (
                <div className="py-1 text-body-sm">
                  <span className="text-surface-500">Tikėtasi: </span>
                  <code className="break-all text-surface-700 dark:text-surface-300">
                    {config.expectedWebhookUrl}
                  </code>
                </div>
              )}
              <ConfigRow
                ok={config.webhook.pending_update_count === 0}
                label="Laukiantys update'ai"
                value={String(config.webhook.pending_update_count)}
              />
              {lastError && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-body-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
                  Paskutinė klaida{config.webhook.last_error_date ? ` (${formatUnix(config.webhook.last_error_date)})` : ""}: {lastError}
                </p>
              )}
            </>
          )}
          {!webhookOk && (
            <p className="mt-3 text-micro text-surface-500">
              Webhook registruojamas paleidus <code>tsx scripts/telegram-set-webhook.ts</code>.
            </p>
          )}
        </Card>
      </div>

      {/* Statistika */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-brand-50 p-2.5 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-heading-2 font-bold text-surface-900 dark:text-white">{stat.value}</p>
                <p className="text-micro text-surface-500">{stat.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pokalbiai */}
      <Card className="mb-8">
        <h3 className="mb-4 text-heading-3 font-semibold text-surface-900 dark:text-white">
          Naujausi pokalbiai
        </h3>
        {sessions.recent.length === 0 ? (
          <p className="text-body-sm text-surface-500">Pokalbių dar nėra.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-surface-200 text-left text-micro uppercase tracking-wide text-surface-500 dark:border-surface-700">
                  <th className="pb-2 pr-4 font-medium">Naudotojas</th>
                  <th className="pb-2 pr-4 font-medium">Būsena</th>
                  <th className="pb-2 pr-4 font-medium">Juodraštis</th>
                  <th className="pb-2 pr-4 font-medium">Atnaujinta</th>
                </tr>
              </thead>
              <tbody>
                {sessions.recent.map((s) => (
                  <tr
                    key={s.telegramUserId}
                    className="border-b border-surface-100 last:border-0 dark:border-surface-800"
                  >
                    <td className="py-2.5 pr-4">
                      {s.linked ? (
                        <div>
                          <p className="font-medium text-surface-900 dark:text-white">
                            {s.userName || s.userEmail || s.phone || "Susieta"}
                          </p>
                          {s.phone && <p className="text-micro text-surface-500">{s.phone}</p>}
                        </div>
                      ) : (
                        <span className="text-surface-400">Nesusieta · TG {s.telegramUserId}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="rounded-md bg-surface-100 px-2 py-0.5 text-micro font-medium text-surface-600 dark:bg-surface-800 dark:text-surface-300">
                        {stateLabel(s.state)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-surface-600 dark:text-surface-300">
                      {s.hasDraft ? s.draftTitle || "(be pavadinimo)" : "—"}
                    </td>
                    <td className="py-2.5 pr-4 whitespace-nowrap text-surface-500">
                      {formatDate(s.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Skelbimai */}
      <Card>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white">
            Skelbimai per Telegram
          </h3>
          <span className="text-micro text-surface-500">{requests.last30d} per 30 d.</span>
        </div>
        {requests.recent.length === 0 ? (
          <p className="text-body-sm text-surface-500">Skelbimų per Telegram dar nėra.</p>
        ) : (
          <div className="space-y-2">
            {requests.recent.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-surface-200/60 px-3 py-2.5 dark:border-surface-700/50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-surface-900 dark:text-white">{r.title}</p>
                  <p className="text-micro text-surface-500">
                    {r.clientName} · {formatDate(r.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <ModerationBadge status={r.moderationStatus} />
                  {r.trackingToken && (
                    <a
                      href={`/uzklausos/sekti/${r.trackingToken}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-surface-400 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
