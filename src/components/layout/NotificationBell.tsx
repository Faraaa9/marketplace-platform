"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { formatRelativeDate } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";

interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

const FALLBACK_INTERVAL_MS = 90_000; // 90s fallback instead of 30s

export default function NotificationBell() {
  const { status } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = useUIStore((s) => s.unreadNotificationCount);
  const setUnreadCount = useUIStore((s) => s.setUnreadNotificationCount);
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewSinceLastOpen, setHasNewSinceLastOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const prevUnreadRef = useRef(0);

  const fetchNotifications = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const all = data.data as Notification[];
          setNotifications(all.slice(0, 10));
          const newUnread = all.filter((n) => !n.isRead).length;
          if (newUnread > prevUnreadRef.current) {
            setHasNewSinceLastOpen(true);
          }
          prevUnreadRef.current = newUnread;
          setUnreadCount(newUnread);
        }
      }
    } catch {}
  }, [status, setUnreadCount]);

  // Fetch on mount + re-fetch on window focus / visibility change + light fallback interval
  useEffect(() => {
    fetchNotifications();

    const handleFocus = () => fetchNotifications();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchNotifications();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    const interval = setInterval(fetchNotifications, FALLBACK_INTERVAL_MS);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleOpen() {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setHasNewSinceLastOpen(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount(Math.max(0, useUIStore.getState().unreadNotificationCount - 1));
    } catch {}
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) return;
    try {
      await Promise.all(
        unreadIds.map((id) =>
          fetch("/api/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          })
        )
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      useUIStore.getState().resetUnreadNotificationCount();
    } catch {}
  }

  const displayCount = unreadCount > 9 ? "9+" : unreadCount;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className={`relative rounded-xl p-2 transition-colors ${
          unreadCount > 0
            ? "text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950"
            : "text-surface-500 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800"
        }`}
        aria-label={unreadCount > 0 ? `${unreadCount} neperskaityti pranešimai` : "Pranešimai"}
      >
        <Bell className={`h-5 w-5 ${unreadCount > 0 ? "fill-brand-100 dark:fill-brand-900" : ""}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-surface-900">
            {displayCount}
          </span>
        )}
        {hasNewSinceLastOpen && unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] rounded-full bg-brand-600 animate-ping opacity-30" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-surface-200/60 bg-white shadow-xl dark:border-surface-700/50 dark:bg-surface-900 z-50">
          <div className="flex items-center justify-between p-3 border-b border-surface-100 dark:border-surface-800">
            <h3 className="text-body-sm font-semibold text-surface-900 dark:text-white">Pranešimai</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-micro font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Žymėti visus
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="h-8 w-8 mx-auto text-surface-300 dark:text-surface-600 mb-2" />
                <p className="text-body-sm text-surface-500">Nėra pranešimų</p>
              </div>
            ) : (
              notifications.map((n) => {
                const content = (
                  <div className="flex gap-3">
                    <div className="pt-1.5 shrink-0">
                      <div className={`h-2 w-2 rounded-full transition-colors ${
                        n.isRead ? "bg-transparent" : "bg-brand-500"
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-body-sm leading-snug ${
                        n.isRead
                          ? "text-surface-600 dark:text-surface-400"
                          : "font-semibold text-surface-900 dark:text-white"
                      }`}>
                        {n.title}
                      </p>
                      <p className="text-micro text-surface-500 dark:text-surface-400 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-micro text-surface-400 mt-1">{formatRelativeDate(n.createdAt)}</p>
                    </div>
                  </div>
                );

                return (
                  <div
                    key={n.id}
                    className={`px-3 py-3 border-b border-surface-100 dark:border-surface-800 last:border-b-0 cursor-pointer transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/50 ${
                      !n.isRead ? "bg-brand-50/40 dark:bg-brand-950/20" : ""
                    }`}
                    onClick={() => {
                      if (!n.isRead) markAsRead(n.id);
                      setIsOpen(false);
                    }}
                  >
                    {n.link ? <Link href={n.link}>{content}</Link> : content}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
