"use client";

import { create } from "zustand";

export interface ThreadMessage {
  id: string;
  content: string;
  createdAt: string;
  senderName: string | null;
  senderId?: string | null;
  sender?: { id?: string; name: string; image?: string | null } | null;
  metaLabel?: string | null;
  /** Optimistic status */
  status: "sent" | "sending" | "failed";
}

interface ConversationState {
  /** Messages keyed by responseId */
  threads: Record<string, ThreadMessage[]>;

  /** Hydrate a thread with server data (replaces all messages for that thread) */
  hydrateThread: (responseId: string, messages: ThreadMessage[]) => void;

  /** Optimistically add a message (status: sending) and return the temp ID */
  optimisticSend: (responseId: string, content: string, senderName: string) => string;

  /** Mark an optimistic message as sent, replacing temp ID with real data */
  confirmSend: (responseId: string, tempId: string, serverMessage: ThreadMessage) => void;

  /** Mark an optimistic message as failed */
  failSend: (responseId: string, tempId: string) => void;

  /** Remove a failed message (user dismissed) */
  removeFailed: (responseId: string, tempId: string) => void;

  /** Append a message from a Realtime payload if not already in the thread. */
  appendMessageIfNew: (responseId: string, message: ThreadMessage) => void;

  /** Get messages for a thread */
  getThread: (responseId: string) => ThreadMessage[];
}

let tempCounter = 0;
const EMPTY_THREAD: ThreadMessage[] = [];

function dedupeMessages(messages: ThreadMessage[]): ThreadMessage[] {
  const seen = new Set<string>();
  const deduped: ThreadMessage[] = [];
  for (const message of messages) {
    if (seen.has(message.id)) continue;
    seen.add(message.id);
    deduped.push(message);
  }
  return deduped;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  threads: {},

  hydrateThread: (responseId, messages) =>
    set((state) => {
      // Keep any optimistic (sending/failed) messages that aren't in server data
      const existing = state.threads[responseId] || [];
      const serverIds = new Set(messages.map((m) => m.id));
      const pendingMessages = existing.filter(
        (m) => (m.status === "sending" || m.status === "failed") && !serverIds.has(m.id)
      );
      return {
        threads: {
          ...state.threads,
          [responseId]: dedupeMessages([...messages, ...pendingMessages]),
        },
      };
    }),

  optimisticSend: (responseId, content, senderName) => {
    const tempId = `temp-${++tempCounter}-${Date.now()}`;
    const optimisticMsg: ThreadMessage = {
      id: tempId,
      content,
      createdAt: new Date().toISOString(),
      senderName,
      sender: { name: senderName },
      status: "sending",
    };
    set((state) => ({
      threads: {
        ...state.threads,
        [responseId]: [...(state.threads[responseId] || []), optimisticMsg],
      },
    }));
    return tempId;
  },

  confirmSend: (responseId, tempId, serverMessage) =>
    set((state) => {
      const thread = state.threads[responseId] || [];
      if (thread.some((m) => m.id === serverMessage.id)) {
        return {
          threads: {
            ...state.threads,
            [responseId]: thread.filter((m) => m.id !== tempId),
          },
        };
      }
      return {
        threads: {
          ...state.threads,
          [responseId]: thread.map((m) =>
            m.id === tempId ? { ...serverMessage, status: "sent" as const } : m
          ),
        },
      };
    }),

  failSend: (responseId, tempId) =>
    set((state) => {
      const thread = state.threads[responseId] || [];
      return {
        threads: {
          ...state.threads,
          [responseId]: thread.map((m) =>
            m.id === tempId ? { ...m, status: "failed" as const } : m
          ),
        },
      };
    }),

  removeFailed: (responseId, tempId) =>
    set((state) => {
      const thread = state.threads[responseId] || [];
      return {
        threads: {
          ...state.threads,
          [responseId]: thread.filter((m) => m.id !== tempId),
        },
      };
    }),

  appendMessageIfNew: (responseId, message) =>
    set((state) => {
      const thread = state.threads[responseId] || [];
      // Skip if we already have this server id (either hydrated or confirmed
      // from our own optimistic send).
      if (thread.some((m) => m.id === message.id)) {
        return state;
      }
      // Also collapse against pending optimistic messages with identical
      // content from the same sender within the last 30s — Realtime will
      // beat the POST response on a fast Postgres write.
      const realtimeCreatedAt = Date.parse(message.createdAt);
      const dedupIdx = thread.findIndex(
        (m) =>
          m.status === "sending" &&
          m.content === message.content &&
          (m.senderName ?? m.sender?.name ?? null) ===
            (message.senderName ?? message.sender?.name ?? null) &&
          Math.abs(Date.parse(m.createdAt) - realtimeCreatedAt) < 30_000,
      );
      const next = [...thread];
      if (dedupIdx >= 0) {
        next[dedupIdx] = { ...message, status: "sent" as const };
      } else {
        next.push({ ...message, status: "sent" as const });
      }
      return {
        threads: {
          ...state.threads,
          [responseId]: next,
        },
      };
    }),

  getThread: (responseId) => get().threads[responseId] || EMPTY_THREAD,
}));
