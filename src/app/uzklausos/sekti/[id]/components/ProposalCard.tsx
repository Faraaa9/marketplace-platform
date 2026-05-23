"use client";

import { ChevronDown, CheckCircle, Shield, Star } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ThreadChat from "@/components/messaging/ThreadChat";
import type { ThreadMessage } from "@/store/useConversationStore";
import { formatRelativeDate, cn } from "@/lib/utils";
import ReviewForm from "./ReviewForm";
import {
  type ResponseData,
  lastMessageOf,
  isAwaitingClientReply,
  lastActivityAt,
} from "./types";

interface ProposalCardProps {
  resp: ResponseData;
  isAccepted: boolean;
  isOpen: boolean;
  isClosed: boolean;
  expanded: boolean;
  mounted: boolean;
  onToggle: () => void;
  acceptLoading: boolean;
  onAccept: () => void;
  initialMessages: ThreadMessage[];
  clientName: string;
  clientId?: string | null;
  requestId: string;
  trackingToken: string;
  sendMessage: (responseId: string, content: string) => Promise<ThreadMessage>;
  onReviewSubmitted: () => void;
}

export default function ProposalCard({
  resp,
  isAccepted,
  isOpen,
  isClosed,
  expanded,
  mounted,
  onToggle,
  acceptLoading,
  onAccept,
  initialMessages,
  clientName,
  clientId,
  requestId,
  trackingToken,
  sendMessage,
  onReviewSubmitted,
}: ProposalCardProps) {
  const last = lastMessageOf(resp);
  const snippet = last ? last.content : resp.message;
  const fromClient = last ? (last.senderId ?? null) !== resp.providerId : false;
  const awaiting = !isClosed && isAwaitingClientReply(resp);
  const location = resp.provider.providerProfile?.location;

  return (
    <Card
      className={cn(
        "p-4",
        isAccepted && "border-emerald-500 ring-2 ring-emerald-500",
        !expanded && "transition-shadow hover:shadow-stripe",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 text-left"
      >
        <ChevronDown
          className={cn(
            "mt-1 h-4 w-4 shrink-0 text-surface-400 transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-body font-medium text-surface-900 dark:text-white">
              {resp.provider.name}
            </span>
            {resp.providerBadge && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-micro font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                <Shield className="h-3 w-3" />
                {resp.providerBadge}
              </span>
            )}
            {isAccepted && <Badge variant="success">Priimtas</Badge>}
          </div>
          {!expanded && (
            <p className="mt-0.5 truncate text-body-sm text-surface-500 dark:text-surface-400">
              {fromClient && <span className="text-surface-400 dark:text-surface-500">Jūs: </span>}
              {snippet}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {resp.price != null && (
            <span className="text-heading-3 font-bold text-emerald-600 dark:text-emerald-400">
              &euro;{resp.price}
            </span>
          )}
          {!expanded && (
            <span className="text-micro text-surface-400">
              {formatRelativeDate(lastActivityAt(resp))}
            </span>
          )}
          {!expanded && awaiting && (
            <span className="flex items-center gap-1 text-micro font-medium text-brand-600 dark:text-brand-400">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Laukia atsakymo
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-4 border-t border-surface-200/60 pt-4 dark:border-surface-700">
          {location && (
            <p className="mb-2 text-body-sm text-surface-500 dark:text-surface-400">{location}</p>
          )}
          <div className="flex flex-col items-start gap-0.5">
            <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-surface-50 px-3.5 py-2 text-body-sm text-surface-700 whitespace-pre-wrap break-words dark:bg-surface-800 dark:text-surface-200">
              {resp.message}
            </div>
            <span className="px-1 text-micro text-surface-400">
              {formatRelativeDate(resp.createdAt)}
            </span>
          </div>

          {isOpen && (
            <div className="mt-3">
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  if (confirm(`Ar tikrai norite priimti ${resp.provider.name} pasiūlymą?`)) {
                    onAccept();
                  }
                }}
                isLoading={acceptLoading}
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Priimti pasiūlymą
              </Button>
            </div>
          )}

          {isAccepted && !resp.hasReview && (
            <ReviewForm
              requestId={requestId}
              responseId={resp.id}
              providerName={resp.provider.name}
              trackingToken={trackingToken}
              clientId={clientId}
              onSubmitted={onReviewSubmitted}
            />
          )}

          {isAccepted && resp.hasReview && (
            <div className="mt-3 flex items-center gap-1.5 text-body-sm text-emerald-600 dark:text-emerald-400">
              <Star className="h-4 w-4 fill-emerald-500 text-emerald-500" />
              Atsiliepimas pateiktas
            </div>
          )}
        </div>
      )}

      {mounted && (
        <div className={expanded ? "" : "hidden"}>
          <ThreadChat
            threadId={resp.id}
            threadKind="response"
            initialMessages={initialMessages}
            currentSenderName={clientName}
            viewerRole="client"
            providerId={resp.providerId}
            sendMessage={sendMessage}
            placeholder="Rašyti žinutę tiekėjui..."
            disabled={isClosed}
          />
        </div>
      )}
    </Card>
  );
}
