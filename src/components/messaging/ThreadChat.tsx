"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Send, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import { useConversationStore, type ThreadMessage } from "@/store/useConversationStore";
import Button from "@/components/ui/Button";

interface ThreadChatProps {
  responseId: string;
  /** Initial messages from server (hydration) */
  initialMessages: ThreadMessage[];
  /** Display name of the current sender (for optimistic messages) */
  currentSenderName: string;
  /** API call to send the message. Returns the server message on success. */
  sendMessage: (responseId: string, content: string) => Promise<ThreadMessage>;
  /** Placeholder text */
  placeholder?: string;
  /** Disabled state (e.g. closed request) */
  disabled?: boolean;
}

export default function ThreadChat({
  responseId,
  initialMessages,
  currentSenderName,
  sendMessage,
  placeholder = "Rasyti zinut...",
  disabled = false,
}: ThreadChatProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hydrateThread = useConversationStore((s) => s.hydrateThread);
  const optimisticSend = useConversationStore((s) => s.optimisticSend);
  const confirmSend = useConversationStore((s) => s.confirmSend);
  const failSend = useConversationStore((s) => s.failSend);
  const removeFailed = useConversationStore((s) => s.removeFailed);
  const messages = useConversationStore((s) => s.getThread(responseId));

  // Hydrate on mount / when server data changes
  useEffect(() => {
    const serverMessages: ThreadMessage[] = initialMessages.map((m) => ({
      ...m,
      status: m.status || ("sent" as const),
    }));
    hydrateThread(responseId, serverMessages);
  }, [responseId, initialMessages, hydrateThread]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || disabled) return;

    setInputValue("");
    const tempId = optimisticSend(responseId, content, currentSenderName);

    try {
      const serverMsg = await sendMessage(responseId, content);
      confirmSend(responseId, tempId, serverMsg);
    } catch {
      failSend(responseId, tempId);
    }
  }, [inputValue, disabled, responseId, currentSenderName, optimisticSend, confirmSend, failSend, sendMessage]);

  const handleResend = useCallback(async (msg: ThreadMessage) => {
    // Remove the failed message and re-send
    removeFailed(responseId, msg.id);
    const tempId = optimisticSend(responseId, msg.content, currentSenderName);

    try {
      const serverMsg = await sendMessage(responseId, msg.content);
      confirmSend(responseId, tempId, serverMsg);
    } catch {
      failSend(responseId, tempId);
    }
  }, [responseId, currentSenderName, removeFailed, optimisticSend, confirmSend, failSend, sendMessage]);

  return (
    <div>
      {/* Messages list */}
      {messages.length > 0 && (
        <div className="mt-3 border-t border-surface-200/50 pt-3 space-y-2 dark:border-surface-700">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-xl p-3 ${
                msg.status === "failed"
                  ? "bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800"
                  : msg.status === "sending"
                    ? "bg-surface-50/60 dark:bg-surface-800/60"
                    : "bg-surface-50 dark:bg-surface-800"
              }`}
            >
              <p className="text-micro text-surface-500">
                {msg.sender?.name || msg.senderName || "Klientas"} &middot;{" "}
                {msg.status === "sending" ? "Siunčiama..." : formatRelativeDate(msg.createdAt)}
              </p>
              <p className={`text-body-sm ${
                msg.status === "sending"
                  ? "text-surface-400 dark:text-surface-500"
                  : "text-surface-700 dark:text-surface-300"
              }`}>
                {msg.content}
              </p>

              {/* Sending indicator */}
              {msg.status === "sending" && (
                <div className="mt-1 flex items-center gap-1 text-micro text-surface-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                </div>
              )}

              {/* Failed state with resend */}
              {msg.status === "failed" && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="flex items-center gap-1 text-micro text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                    Nepavyko išsiųsti
                  </span>
                  <button
                    onClick={() => handleResend(msg)}
                    className="flex items-center gap-1 text-micro font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Bandyti dar kartą
                  </button>
                  <button
                    onClick={() => removeFailed(responseId, msg.id)}
                    className="text-micro text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
                  >
                    Pašalinti
                  </button>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Composer */}
      {!disabled && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 rounded-xl border border-surface-300 bg-white px-3 py-2 text-body-sm ring-1 ring-transparent focus:border-brand-500 focus:ring-brand-500 focus:outline-none transition-all dark:border-surface-600 dark:bg-surface-800 dark:text-white"
          />
          <Button size="sm" onClick={handleSend} disabled={!inputValue.trim()}>
            <Send className="h-3.5 w-3.5 mr-1" />
            Siųsti
          </Button>
        </div>
      )}
    </div>
  );
}
