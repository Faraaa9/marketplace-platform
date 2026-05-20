"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { formatRelativeDate } from "@/lib/utils";
import {
  ArrowLeft,
  Mail,
  MailOpen,
  Archive,
  Euro,
  Phone,
  User,
  ChevronDown,
  ChevronUp,
  Send,
  Reply,
} from "lucide-react";

interface Inquiry {
  id: string;
  description: string;
  budget: string | null;
  senderEmail: string;
  senderPhone: string | null;
  senderName: string | null;
  senderUserId: string | null;
  status: string;
  createdAt: string;
  sender: { name: string; email: string } | null;
}

type FilterStatus = "" | "NEW" | "READ" | "ARCHIVED";

function buildReplyMailto(inq: Inquiry, body: string): string {
  const subject = "Re: Užklausa per paslaugurinka.lt";
  const trimmed = body.trim();
  const params = new URLSearchParams();
  params.set("subject", subject);
  if (trimmed) params.set("body", trimmed);
  return `mailto:${inq.senderEmail}?${params.toString().replace(/\+/g, "%20")}`;
}

export default function ProviderInboxPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  const fetchInquiries = useCallback(async (statusFilter: FilterStatus, pageNum: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      params.set("page", String(pageNum));
      const res = await fetch(`/api/tiekejas/zinutes?${params}`);
      const data = await res.json();
      if (data.success) {
        setInquiries(data.data.inquiries);
        setPages(data.data.pages);
        setPage(data.data.page);
        setUnreadCount(data.data.unreadCount);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInquiries(filter, 1);
  }, [filter, fetchInquiries]);

  async function updateStatus(id: string, newStatus: "READ" | "ARCHIVED") {
    try {
      const res = await fetch(`/api/tiekejas/zinutes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setInquiries((prev) =>
          prev.map((inq) => (inq.id === id ? { ...inq, status: newStatus } : inq))
        );
        if (newStatus === "READ") setUnreadCount((c) => Math.max(0, c - 1));
        if (newStatus === "ARCHIVED") {
          // Remove from list if not viewing archived
          if (filter !== "ARCHIVED") {
            setInquiries((prev) => prev.filter((inq) => inq.id !== id));
          }
        }
      }
    } catch {
      // silent
    }
  }

  function handleExpand(inq: Inquiry, focusReply = false) {
    if (expandedId === inq.id) {
      if (focusReply) {
        textareaRefs.current[inq.id]?.focus();
        return;
      }
      setExpandedId(null);
      return;
    }
    setExpandedId(inq.id);
    if (inq.status === "NEW") {
      updateStatus(inq.id, "READ");
    }
    if (focusReply) {
      requestAnimationFrame(() => {
        const ta = textareaRefs.current[inq.id];
        if (!ta) return;
        ta.focus();
        ta.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }

  const senderDisplayName = (inq: Inquiry) =>
    inq.sender?.name || inq.senderName || inq.senderEmail;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/tiekejas"
        className="mb-6 inline-flex items-center gap-1.5 text-body-sm text-surface-500 hover:text-surface-700 transition-colors dark:text-surface-400 dark:hover:text-surface-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Valdymo panelė
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">
            Tiesioginės žinutės
          </h1>
          <p className="text-body-sm text-surface-500 dark:text-surface-400 mt-0.5">
            {unreadCount > 0
              ? `${unreadCount} neperskaitytos`
              : "Visos perskaitytos"}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 rounded-xl bg-surface-100 p-1 dark:bg-surface-800">
        {([
          { value: "" as FilterStatus, label: "Aktyvios" },
          { value: "NEW" as FilterStatus, label: "Naujos" },
          { value: "ARCHIVED" as FilterStatus, label: "Archyvas" },
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
            {tab.value === "NEW" && unreadCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-micro font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : inquiries.length === 0 ? (
        <EmptyState
          title="Žinučių nėra"
          description={
            filter === "ARCHIVED"
              ? "Archyve žinučių nėra."
              : filter === "NEW"
              ? "Naujų neperskaitytų žinučių nėra."
              : "Kol kas negavote tiesioginių žinučių iš klientų. Kai klientas parašys jums per viešą profilį, žinutė atsiras čia."
          }
        />
      ) : (
        <div className="space-y-3">
          {inquiries.map((inq) => {
            const isExpanded = expandedId === inq.id;
            const isNew = inq.status === "NEW";

            return (
              <div
                key={inq.id}
                className={`rounded-2xl border bg-white transition-colors dark:bg-surface-900/50 ${
                  isNew
                    ? "border-brand-200/60 dark:border-brand-800/40"
                    : "border-surface-200/60 dark:border-surface-700/50"
                }`}
              >
                {/* Header — row with quick Reply button */}
                <div className="flex items-stretch">
                  <button
                    onClick={() => handleExpand(inq)}
                    className="flex-1 min-w-0 px-4 py-4 text-left sm:px-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 shrink-0 ${isNew ? "text-brand-500" : "text-surface-300 dark:text-surface-600"}`}>
                        {isNew ? <Mail className="h-5 w-5" /> : <MailOpen className="h-5 w-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-body-sm font-medium truncate ${isNew ? "text-surface-900 dark:text-white" : "text-surface-700 dark:text-surface-300"}`}>
                            {senderDisplayName(inq)}
                          </span>
                          {isNew && (
                            <span className="shrink-0 h-2 w-2 rounded-full bg-brand-500" />
                          )}
                        </div>
                        <p className="text-body-sm text-surface-500 dark:text-surface-400 mt-0.5 line-clamp-2">
                          {inq.description}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-micro text-surface-400">
                          <span>{formatRelativeDate(inq.createdAt)}</span>
                          {inq.budget && (
                            <span className="inline-flex items-center gap-1">
                              <Euro className="h-3 w-3" />
                              {inq.budget}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-surface-400 self-center">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </button>
                  {!isExpanded && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExpand(inq, true);
                      }}
                      aria-label="Atsakyti"
                      className="shrink-0 flex items-center gap-1.5 px-3 sm:px-4 border-l border-surface-100 text-brand-600 hover:bg-brand-50 active:bg-brand-100 transition-colors dark:border-surface-800 dark:text-brand-400 dark:hover:bg-surface-800"
                    >
                      <Reply className="h-4 w-4" />
                      <span className="hidden sm:inline text-body-sm font-medium">Atsakyti</span>
                    </button>
                  )}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-surface-100 px-4 py-4 sm:px-5 dark:border-surface-800">
                    {/* Full message */}
                    <p className="text-body-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap leading-relaxed mb-4">
                      {inq.description}
                    </p>

                    {/* Inline reply composer — primary action, appears first */}
                    <div className="mb-4">
                      <label
                        htmlFor={`reply-${inq.id}`}
                        className="mb-1.5 block text-micro font-medium text-surface-500"
                      >
                        Atsakymas
                      </label>
                      <textarea
                        id={`reply-${inq.id}`}
                        ref={(el) => {
                          textareaRefs.current[inq.id] = el;
                        }}
                        value={replyDrafts[inq.id] ?? ""}
                        onChange={(e) =>
                          setReplyDrafts((d) => ({ ...d, [inq.id]: e.target.value }))
                        }
                        rows={5}
                        placeholder={`Sveiki, ${senderDisplayName(inq).split(" ")[0] || ""},\nDėkoju už žinutę. `}
                        className="w-full resize-y rounded-xl border border-surface-200 bg-white px-3 py-3 text-body text-surface-900 placeholder:text-surface-300 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-white"
                      />
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <a
                          href={buildReplyMailto(inq, replyDrafts[inq.id] ?? "")}
                          className="w-full sm:w-auto"
                          onClick={() => {
                            if (inq.status === "NEW") updateStatus(inq.id, "READ");
                          }}
                        >
                          <Button className="w-full sm:w-auto">
                            <Send className="h-4 w-4" />
                            Siųsti atsakymą
                          </Button>
                        </a>
                        {inq.status !== "ARCHIVED" && (
                          <Button
                            variant="ghost"
                            className="w-full sm:w-auto"
                            onClick={() => updateStatus(inq.id, "ARCHIVED")}
                          >
                            <Archive className="h-4 w-4" />
                            Archyvuoti
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Contact info */}
                    <div className="rounded-xl bg-surface-50 px-4 py-3 dark:bg-surface-800/50 mb-3">
                      <p className="text-micro font-medium text-surface-500 mb-2">Kontaktai</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-body-sm text-surface-700 dark:text-surface-300">
                          <User className="h-3.5 w-3.5 text-surface-400" />
                          {senderDisplayName(inq)}
                        </div>
                        <div className="flex items-center gap-2 text-body-sm text-surface-700 dark:text-surface-300">
                          <Mail className="h-3.5 w-3.5 text-surface-400" />
                          <a href={`mailto:${inq.senderEmail}`} className="text-brand-600 hover:text-brand-700 dark:text-brand-400">
                            {inq.senderEmail}
                          </a>
                        </div>
                        {inq.senderPhone && (
                          <div className="flex items-center gap-2 text-body-sm text-surface-700 dark:text-surface-300">
                            <Phone className="h-3.5 w-3.5 text-surface-400" />
                            <a href={`tel:${inq.senderPhone}`} className="text-brand-600 hover:text-brand-700 dark:text-brand-400">
                              {inq.senderPhone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Budget */}
                    {inq.budget && (
                      <div className="flex items-center gap-2 text-body-sm text-surface-600 dark:text-surface-400">
                        <Euro className="h-4 w-4 text-emerald-500" />
                        Biudžetas: <span className="font-medium">{inq.budget}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => fetchInquiries(filter, page - 1)}
          >
            Ankstesnis
          </Button>
          <span className="text-body-sm text-surface-500">
            {page} / {pages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= pages}
            onClick={() => fetchInquiries(filter, page + 1)}
          >
            Kitas
          </Button>
        </div>
      )}
    </div>
  );
}
