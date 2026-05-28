"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { formatRelativeDate } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import ThreadChat from "@/components/messaging/ThreadChat";
import type { ThreadMessage } from "@/store/useConversationStore";
import type { PresenceLevel } from "@/lib/presence";
import { ArrowLeft, Mail, Phone, User, Euro, Archive, ArchiveRestore } from "lucide-react";

interface MessageData {
  id: string;
  content: string;
  createdAt: string;
  senderId?: string | null;
  senderName?: string;
  sender?: { id: string; name: string; image?: string | null };
}

interface InquiryData {
  id: string;
  providerId: string;
  description: string;
  budget: string | null;
  senderName: string | null;
  senderEmail: string;
  senderPhone: string | null;
  senderImage: string | null;
  senderAccountName: string | null;
  senderPresenceLevel: PresenceLevel;
  senderPresenceLabel: string | null;
  status: string;
  createdAt: string;
  clientLastReadAt: string | null;
  messages: MessageData[];
}

function avatarInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function ChatParticipantAvatar({ name, image }: { name: string; image?: string | null }) {
  return (
    <span
      className="relative inline-flex h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700 dark:from-brand-950 dark:to-surface-800 dark:text-brand-300"
      aria-hidden="true"
    >
      {image ? (
        <Image src={image} alt="" fill sizes="44px" className="object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center text-body-sm font-semibold">
          {avatarInitial(name)}
        </span>
      )}
    </span>
  );
}

export default function ProviderInquiryDetailClient() {
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

  const senderDisplay = inquiry.senderName?.trim() || inquiry.senderAccountName?.trim() || inquiry.senderEmail;
  const isArchived = inquiry.status === "ARCHIVED";
  const chatMessages: ThreadMessage[] = [
    {
      id: `opening-${inquiry.id}`,
      content: inquiry.description,
      createdAt: inquiry.createdAt,
      senderId: null,
      senderName: senderDisplay,
      sender: { name: senderDisplay, image: inquiry.senderImage },
      metaLabel: inquiry.budget ? `Biudžetas: ${inquiry.budget}` : null,
      status: "sent",
    },
    ...inquiry.messages.map((m) => ({
      ...m,
      senderName: m.senderName || m.sender?.name || null,
      status: "sent" as const,
    })),
  ];

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
        <div className="mb-4 flex items-center gap-3 border-b border-surface-200/60 pb-4 dark:border-surface-700">
          <div className="relative shrink-0 [--presence-cutout-bg:#fff] dark:[--presence-cutout-bg:#25221e]">
            <ChatParticipantAvatar name={senderDisplay} image={inquiry.senderImage} />
            {inquiry.senderPresenceLevel && (
              <span
                className="pointer-events-none absolute bottom-[1px] right-[1px] flex h-[12px] w-[12px] items-center justify-center rounded-full bg-[var(--presence-cutout-bg)]"
                aria-label={inquiry.senderPresenceLabel ?? "Aktyvus neseniai"}
                title={inquiry.senderPresenceLabel ?? "Aktyvus neseniai"}
              >
                <span
                  className={`h-[7px] w-[7px] rounded-full ${
                    inquiry.senderPresenceLevel === "online" ? "bg-emerald-500" : "bg-surface-400"
                  }`}
                  aria-hidden
                />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-body font-semibold text-surface-900 dark:text-white">
              {senderDisplay}
            </p>
            <p
              className={`text-micro ${
                inquiry.senderPresenceLevel === "online"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-surface-500 dark:text-surface-400"
              }`}
            >
              {inquiry.senderPresenceLabel ?? "Klientas"}
            </p>
          </div>
        </div>

        <ThreadChat
          threadId={inquiry.id}
          threadKind="directInquiry"
          initialMessages={chatMessages}
          currentSenderName={session?.user?.name || "Tiekėjas"}
          viewerRole="provider"
          providerId={inquiry.providerId}
          otherParticipantName={senderDisplay}
          otherParticipantImage={inquiry.senderImage}
          otherParticipantReadAt={inquiry.clientLastReadAt}
          showInitialTimeDivider={false}
          forceDividerAfterFirstGroup
          showTopBorder={false}
          sendMessage={sendMessage}
          placeholder="Rašyti žinutę..."
        />
      </Card>
    </div>
  );
}
