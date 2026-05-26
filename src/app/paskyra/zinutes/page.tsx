"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { formatRelativeDate } from "@/lib/utils";
import { ArrowLeft, MessageCircle, ChevronRight } from "lucide-react";
import type { PresenceLevel } from "@/lib/presence";

interface Conversation {
  id: string;
  trackingToken: string;
  href: string;
  providerName: string;
  providerImage: string | null;
  presenceLevel: PresenceLevel;
  preview: string;
  lastMessageAt: string;
  unread: boolean;
  fromMe: boolean;
}

type Filter = "all" | "unread";

export default function SentInquiriesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    fetch("/api/paskyra/zinutes")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setConversations(data.data.conversations);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const unreadCount = useMemo(
    () => conversations.filter((c) => c.unread).length,
    [conversations]
  );

  const filtered = useMemo(() => {
    if (filter === "unread") return conversations.filter((c) => c.unread);
    return conversations;
  }, [conversations, filter]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/paskyra/profilis"
        className="mb-6 inline-flex items-center gap-1.5 text-body-sm text-surface-500 hover:text-surface-700 transition-colors dark:text-surface-400 dark:hover:text-surface-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Paskyra
      </Link>

      <div className="mb-6">
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">
          Mano žinutės
        </h1>
        <p className="text-body-sm text-surface-500 dark:text-surface-400 mt-0.5">
          {unreadCount > 0
            ? `${unreadCount} neperskaityti atsakymai`
            : "Pokalbiai, kuriuos pradėjote rašydami tiekėjams"}
        </p>
      </div>

      {/* Filter tabs */}
      {conversations.length > 0 && (
        <div className="flex gap-1 mb-6 rounded-xl bg-surface-100 p-1 dark:bg-surface-800">
          {([
            { value: "all" as Filter, label: "Visi" },
            { value: "unread" as Filter, label: "Neperskaityti" },
          ]).map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`flex-1 rounded-lg px-3 py-2 text-body-sm font-medium transition-colors ${
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
      )}

      {loading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={
            filter === "unread"
              ? "Neperskaitytų atsakymų nėra"
              : "Dar nesate išsiuntę žinučių"
          }
          description={
            filter === "unread"
              ? "Visi gauti atsakymai perskaityti."
              : 'Apsilankykite tiekėjo profilyje ir spauskite „Rašyti žinutę", kad pradėtumėte pokalbį.'
          }
          icon={<MessageCircle className="h-12 w-12" />}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const highlight = c.unread;
            return (
              <Link key={c.id} href={c.href} className="group block">
                <article
                  className={`rounded-2xl border bg-white p-4 sm:p-5 transition-shadow hover:shadow-md dark:bg-surface-900/50 ${
                    highlight
                      ? "border-brand-200/60 dark:border-brand-800/40"
                      : "border-surface-200/60 dark:border-surface-700/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0 [--presence-cutout-bg:#fff] dark:[--presence-cutout-bg:#25221e]">
                      <div className="relative h-11 w-11 overflow-hidden rounded-full bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-950 dark:to-surface-800">
                        {c.providerImage ? (
                          <Image
                            src={c.providerImage}
                            alt={c.providerName}
                            width={44}
                            height={44}
                            sizes="44px"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-body-sm font-semibold text-brand-700 dark:text-brand-300">
                            {c.providerName[0]?.toUpperCase() ?? "T"}
                          </span>
                        )}
                      </div>
                      {c.presenceLevel === "online" && (
                        <span
                          className="pointer-events-none absolute bottom-[1px] right-[1px] flex h-[12px] w-[12px] items-center justify-center rounded-full bg-[var(--presence-cutout-bg)]"
                          aria-label="Prisijungęs dabar"
                          title="Prisijungęs dabar"
                        >
                          <span className="h-[7px] w-[7px] rounded-full bg-emerald-500" aria-hidden />
                        </span>
                      )}
                    </div>
                    {highlight && (
                      <span className="mt-1.5 block h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Neperskaityta" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`flex-1 min-w-0 truncate text-body-sm ${
                            highlight
                              ? "font-semibold text-surface-900 dark:text-white"
                              : "font-medium text-surface-700 dark:text-surface-300"
                          }`}
                        >
                          {c.providerName}
                        </h3>
                        <Badge variant="brand">Tiesioginė</Badge>
                      </div>
                      <p
                        className={`mt-1 line-clamp-1 text-body-sm ${
                          highlight
                            ? "text-surface-600 dark:text-surface-300"
                            : "text-surface-500 dark:text-surface-400"
                        }`}
                      >
                        {c.fromMe && <span className="text-surface-400">Jūs: </span>}
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
