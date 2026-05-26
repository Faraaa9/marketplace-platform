"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { formatRelativeDate } from "@/lib/utils";
import { ArrowLeft, MessageCircle, Mail, ChevronRight } from "lucide-react";

interface Conversation {
  type: "request" | "direct";
  id: string;
  href: string;
  title: string;
  subtitle: string;
  preview: string;
  lastMessageAt: string;
  unread: boolean;
  fromProvider: boolean;
  status: string;
  archived: boolean;
}

type Filter = "all" | "unread" | "archived";

const REQUEST_STATUS: Record<string, { label: string; variant: "success" | "warning" | "default" }> = {
  OPEN: { label: "Atidaryta", variant: "success" },
  IN_PROGRESS: { label: "Vykdoma", variant: "warning" },
  CLOSED: { label: "Uždaryta", variant: "default" },
};

export default function ProviderInboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    fetch("/api/tiekejas/zinutes")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setConversations(data.data.conversations);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const unreadCount = useMemo(
    () => conversations.filter((c) => c.unread && !c.archived).length,
    [conversations]
  );

  const filtered = useMemo(() => {
    if (filter === "archived") return conversations.filter((c) => c.archived);
    if (filter === "unread") return conversations.filter((c) => c.unread && !c.archived);
    return conversations.filter((c) => !c.archived);
  }, [conversations, filter]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/tiekejas"
        className="mb-6 inline-flex items-center gap-1.5 text-body-sm text-surface-500 hover:text-surface-700 transition-colors dark:text-surface-400 dark:hover:text-surface-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Valdymo panelė
      </Link>

      <div className="mb-6">
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">Žinutės</h1>
        <p className="text-body-sm text-surface-500 dark:text-surface-400 mt-0.5">
          {unreadCount > 0 ? `${unreadCount} neperskaitytos` : "Visos perskaitytos"}
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 rounded-xl bg-surface-100 p-1 dark:bg-surface-800">
        {([
          { value: "all" as Filter, label: "Visi" },
          { value: "unread" as Filter, label: "Neperskaityti" },
          { value: "archived" as Filter, label: "Archyvas" },
        ]).map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`min-h-[44px] flex-1 rounded-lg px-3 py-2 text-body-sm font-medium transition-colors ${
              filter === tab.value
                ? "bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-white"
                : "text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
            }`}
          >
            {tab.label}
            {tab.value === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-micro font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            filter === "archived"
              ? "Archyve tuščia"
              : filter === "unread"
              ? "Neperskaitytų žinučių nėra"
              : "Žinučių dar nėra"
          }
          description={
            filter === "archived"
              ? "Archyvuoti pokalbiai atsiras čia."
              : filter === "unread"
              ? "Visos žinutės perskaitytos."
              : "Kai gausite užklausą ar tiesioginę žinutę iš kliento, pokalbiai atsiras čia."
          }
          icon={<MessageCircle className="h-12 w-12" />}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const reqStatus =
              c.type === "request" ? REQUEST_STATUS[c.status] || REQUEST_STATUS.OPEN : null;
            const highlight = c.unread && !c.archived;
            return (
              <Link key={`${c.type}-${c.id}`} href={c.href} className="group block">
                <article
                  className={`rounded-2xl border bg-white p-4 sm:p-5 transition-shadow hover:shadow-md dark:bg-surface-900/50 ${
                    highlight
                      ? "border-brand-200/60 dark:border-brand-800/40"
                      : "border-surface-200/60 dark:border-surface-700/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {highlight ? (
                        <span className="block h-2.5 w-2.5 rounded-full bg-brand-500" />
                      ) : c.type === "direct" ? (
                        <Mail className="h-4 w-4 text-surface-300 dark:text-surface-600" />
                      ) : (
                        <MessageCircle className="h-4 w-4 text-surface-300 dark:text-surface-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`flex-1 min-w-0 truncate text-body-sm ${
                            highlight
                              ? "font-semibold text-surface-900 dark:text-white"
                              : "font-medium text-surface-700 dark:text-surface-300"
                          }`}
                        >
                          {c.title}
                        </h3>
                        <div className="flex shrink-0 items-center gap-1">
                          {reqStatus ? (
                            <>
                              <Badge variant="brand">Užklausa</Badge>
                              <Badge variant={reqStatus.variant}>{reqStatus.label}</Badge>
                            </>
                          ) : (
                            <Badge variant="brand">Tiesioginė</Badge>
                          )}
                        </div>
                      </div>
                      {c.subtitle && (
                        <p className="mt-0.5 truncate text-micro text-surface-400">{c.subtitle}</p>
                      )}
                      <p
                        className={`mt-1 line-clamp-1 text-body-sm ${
                          highlight
                            ? "text-surface-600 dark:text-surface-300"
                            : "text-surface-500 dark:text-surface-400"
                        }`}
                      >
                        {c.fromProvider && <span className="text-surface-400">Jūs: </span>}
                        {c.preview}
                      </p>
                      <p className="mt-1 text-micro text-surface-400">
                        {formatRelativeDate(c.lastMessageAt)}
                      </p>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-surface-300 transition-colors group-hover:text-surface-400 dark:text-surface-600" />
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
