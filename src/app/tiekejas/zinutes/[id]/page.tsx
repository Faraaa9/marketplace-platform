"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatRelativeDate } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import ThreadChat from "@/components/messaging/ThreadChat";
import type { ThreadMessage } from "@/store/useConversationStore";
import { ArrowLeft, Mail, Phone, User, Euro, Archive, ArchiveRestore } from "lucide-react";

interface MessageData {
  id: string;
  content: string;
  createdAt: string;
  senderId?: string | null;
  senderName?: string;
  sender?: { id: string; name: string };
}

interface InquiryData {
  id: string;
  providerId: string;
  description: string;
  budget: string | null;
  senderName: string | null;
  senderEmail: string;
  senderPhone: string | null;
  status: string;
  createdAt: string;
  messages: MessageData[];
}

export default function ProviderInquiryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [inquiry, setInquiry] = useState<InquiryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);

  const fetchInquiry = useCallback(async () => {
    try {
      const res = await fetch(`/api/tiekejas/zinutes/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setInquiry(data.data);
      } else if (data.code === "EMAIL_NOT_VERIFIED" || data.code === "ACCOUNT_NOT_ACTIVE") {
        router.push("/tiekejas");
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    // eslint-disable-next-line
    fetchInquiry();
  }, [fetchInquiry]);

  const sendMessage = useCallback(async (threadId: string, content: string): Promise<ThreadMessage> => {
    const res = await fetch(`/api/tiekejas/zinutes/${threadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Klaida");
    return {
      id: data.data.id,
      content: data.data.content,
      createdAt: data.data.createdAt,
      senderId: data.data.sender?.id ?? null,
      senderName: data.data.senderName,
      sender: data.data.sender,
      status: "sent",
    };
  }, []);

  async function toggleArchive() {
    if (!inquiry) return;
    const next = inquiry.status === "ARCHIVED" ? "READ" : "ARCHIVED";
    setArchiving(true);
    try {
      const res = await fetch(`/api/tiekejas/zinutes/${inquiry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (data.success) {
        setInquiry((prev) => (prev ? { ...prev, status: next } : prev));
      }
    } catch {
      // ignore
    } finally {
      setArchiving(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!inquiry) return <EmptyState title="Žinutė nerasta" />;

  const senderDisplay = inquiry.senderName?.trim() || inquiry.senderEmail;
  const isArchived = inquiry.status === "ARCHIVED";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <button
        onClick={() => router.push("/tiekejas/zinutes")}
        className="mb-4 inline-flex items-center gap-1.5 text-body-sm text-surface-500 hover:text-surface-700 transition-colors dark:text-surface-400 dark:hover:text-surface-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Grįžti į žinutes
      </button>

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Badge variant="brand">Tiesioginė žinutė</Badge>
            {isArchived && <Badge variant="default">Archyvuota</Badge>}
          </div>
          <h1 className="mt-2 text-heading-1 font-bold text-surface-900 dark:text-white">
            {senderDisplay}
          </h1>
          <p className="mt-1 text-body-sm text-surface-500">
            {formatRelativeDate(inquiry.createdAt)}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={toggleArchive} isLoading={archiving}>
          {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          {isArchived ? "Grąžinti" : "Archyvuoti"}
        </Button>
      </div>

      {/* Contact info */}
      <Card className="mb-6">
        <p className="mb-2 text-micro font-medium text-surface-500">Kontaktai</p>
        <div className="flex flex-wrap gap-4 text-body-sm text-surface-700 dark:text-surface-300">
          <span className="flex items-center gap-1.5">
            <User className="h-4 w-4 text-surface-400" />
            {senderDisplay}
          </span>
          <a
            href={`mailto:${inquiry.senderEmail}`}
            className="flex items-center gap-1.5 text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            <Mail className="h-4 w-4" />
            {inquiry.senderEmail}
          </a>
          {inquiry.senderPhone && (
            <a
              href={`tel:${inquiry.senderPhone}`}
              className="flex items-center gap-1.5 text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              <Phone className="h-4 w-4" />
              {inquiry.senderPhone}
            </a>
          )}
          {inquiry.budget && (
            <span className="flex items-center gap-1.5">
              <Euro className="h-4 w-4 text-surface-400" />
              {inquiry.budget}
            </span>
          )}
        </div>
      </Card>

      {/* Conversation */}
      <Card>
        {/* Opening message — from the sender */}
        <div className="flex flex-col items-start gap-0.5">
          <span className="px-1 text-micro font-medium text-surface-500 dark:text-surface-400">
            {senderDisplay}
          </span>
          <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-surface-50 px-3.5 py-2 text-body-sm text-surface-700 whitespace-pre-wrap break-words dark:bg-surface-800 dark:text-surface-200">
            {inquiry.description}
          </div>
          <span className="px-1 text-micro text-surface-400">
            {formatRelativeDate(inquiry.createdAt)}
          </span>
        </div>

        <ThreadChat
          threadId={inquiry.id}
          threadKind="directInquiry"
          initialMessages={inquiry.messages.map((m) => ({
            ...m,
            senderName: m.senderName || m.sender?.name || null,
            status: "sent" as const,
          }))}
          currentSenderName={session?.user?.name || "Tiekėjas"}
          viewerRole="provider"
          providerId={inquiry.providerId}
          sendMessage={sendMessage}
          placeholder="Rašyti žinutę..."
        />
      </Card>
    </div>
  );
}
