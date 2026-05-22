"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Card, { CardTitle } from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Badge from "@/components/ui/Badge";
import { MagicCard } from "@/components/magicui/magic-card";
import Image from "next/image";
import { FileText, MessageCircle, TrendingUp, AlertCircle, AlertTriangle, ArrowRight, Mail, ShieldCheck, User, CheckCircle2, Eye, Plus, X, Trash2, Sparkles, Clock, Camera, Database, Building2 } from "lucide-react";

interface Stats {
  userName: string | null;
  userEmail: string | null;
  totalRequests: number;
  matchingRequests: number;
  myResponses: number;
  categoryCount: number;
  thisMonthResponses: number;
  planType: string;
  storedPlanType: string;
  subscriptionStatus: string | null;
  isActive: boolean;
  emailVerified: boolean;
  responsesRemaining: number;
  responsesLimit: number;
  profileCompleteness: number;
  missingProfileItems: string[];
  acceptedCount: number;
  profileImageUrl: string | null;
  activeStoryCount: number;
  storyEnabled: boolean;
  pendingClaim: {
    id: string;
    status: string;
    supplier: { displayName: string; slug: string } | null;
  } | null;
}

interface StoryItem {
  id: string;
  imageUrl: string;
  text: string | null;
  expiresAt: string;
  createdAt: string;
}

function storyTimeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Pasibaigė";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours} val. ${mins} min.`;
  return `${mins} min.`;
}

function StoryModal({
  open,
  onClose,
  onStoryChange,
}: {
  open: boolean;
  onClose: () => void;
  onStoryChange: (delta: number) => void;
}) {
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  // Fetch stories when modal opens
  useEffect(() => {
    if (!open) return;
    setLoadingStories(true);
    setError("");
    fetch("/api/provider/stories")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setStories(data.data || []);
      })
      .catch(() => setError("Nepavyko užkrauti story"))
      .finally(() => setLoadingStories(false));
  }, [open]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  async function handleUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Leidžiami tik paveikslėliai");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Failas per didelis (max 5MB)");
      return;
    }
    if (stories.length >= 3) {
      setError("Maksimalus aktyvių story skaičius — 3");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("text", text.trim());
      const res = await fetch("/api/provider/stories", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        setStories((prev) => [data.data, ...prev]);
        setText("");
        onStoryChange(1);
      } else {
        setError(data.error || "Nepavyko įkelti story");
      }
    } catch {
      setError("Nepavyko įkelti story");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    setError("");
    try {
      const res = await fetch(`/api/provider/stories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setStories((prev) => prev.filter((s) => s.id !== id));
        onStoryChange(-1);
      } else {
        setError(data.error || "Nepavyko pašalinti");
      }
    } catch {
      setError("Nepavyko pašalinti story");
    } finally {
      setDeleting(null);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Story valdymas">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-md bg-white dark:bg-surface-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-0 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-surface-300 dark:bg-surface-600" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 sm:pt-5 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <h2 className="text-body font-semibold text-surface-900 dark:text-white">Story</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
          >
            <X className="h-4 w-4 text-surface-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {error && (
            <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-body-sm text-red-600 dark:bg-red-500/10 dark:text-red-400 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError("")} className="text-red-400 hover:text-red-600 ml-2 shrink-0">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {loadingStories ? (
            <div className="py-8 text-center">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Active stories */}
              {stories.length > 0 && (
                <div className="space-y-2 mb-4">
                  <p className="text-micro font-medium text-surface-500 uppercase tracking-wider">Aktyvios story</p>
                  {stories.map((story) => (
                    <div
                      key={story.id}
                      className={`flex items-center gap-3 rounded-xl border border-surface-200/60 bg-surface-50/50 p-2.5 dark:border-surface-700/50 dark:bg-surface-800/30 transition-opacity ${deleting === story.id ? "opacity-50 pointer-events-none" : ""}`}
                    >
                      <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-surface-200 dark:bg-surface-700">
                        <Image src={story.imageUrl} alt="" width={48} height={48} sizes="48px" className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-body-sm truncate ${story.text ? "text-surface-700 dark:text-surface-300" : "text-surface-400 italic"}`}>
                          {story.text || "Be teksto"}
                        </p>
                        <p className="text-micro text-surface-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {storyTimeLeft(story.expiresAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(story.id)}
                        disabled={deleting === story.id}
                        className="shrink-0 rounded-lg p-2 text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        aria-label="Pašalinti story"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Create new story */}
              {stories.length < 3 ? (
                <div className="space-y-3">
                  {stories.length > 0 ? (
                    <div className="border-t border-surface-100 dark:border-surface-800 pt-3">
                      <p className="text-micro font-medium text-surface-500 uppercase tracking-wider mb-2">Nauja story</p>
                    </div>
                  ) : (
                    <div className="text-center py-2 mb-1">
                      <Sparkles className="h-8 w-8 text-surface-200 dark:text-surface-700 mx-auto mb-2" />
                      <p className="text-body-sm text-surface-500">Parodykite klientams ką šiandien veikiate</p>
                      <p className="text-micro text-surface-400 mt-0.5">Story matoma 24 valandas jūsų viešame profilyje</p>
                    </div>
                  )}
                  <div>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value.slice(0, 200))}
                      placeholder="Trumpas tekstas (nebūtinas)"
                      maxLength={200}
                      className="w-full rounded-xl border border-surface-300 bg-white px-3.5 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-all dark:border-surface-600 dark:bg-surface-800 dark:text-white"
                    />
                    {text.length > 0 && (
                      <p className="mt-1 text-right text-micro text-surface-300 tabular-nums">{text.length}/200</p>
                    )}
                  </div>
                  <label className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-4 cursor-pointer transition-all ${
                    uploading
                      ? "border-brand-300 bg-brand-50/50 dark:bg-brand-500/10"
                      : "border-surface-300 hover:border-brand-400 hover:bg-brand-50/30 dark:border-surface-600 dark:hover:border-brand-500"
                  }`}>
                    {uploading ? (
                      <span className="flex items-center gap-2 text-body-sm text-brand-600 dark:text-brand-400">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                        Įkeliama...
                      </span>
                    ) : (
                      <>
                        <Camera className="h-4 w-4 text-brand-500" />
                        <span className="text-body-sm font-medium text-surface-600 dark:text-surface-400">Pasirinkti nuotrauką</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <p className="text-micro text-surface-300 dark:text-surface-600 text-center">
                    {3 - stories.length} iš 3 liko · Galioja 24 val. · Max 5MB
                  </p>
                </div>
              ) : (
                <p className="text-body-sm text-surface-400 text-center py-3">
                  Visos 3 story vietos užimtos. Pašalinkite seną arba palaukite.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ResendVerificationBanner() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleResend() {
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!data.success) {
        setError(data.error || "Nepavyko išsiųsti patvirtinimo laiško.");
        return;
      }
      setSent(true);
    } catch {
      setError("Nepavyko išsiųsti patvirtinimo laiško.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-200/60 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-500/10">
      <div className="flex items-center gap-3">
        <Mail className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="flex-1 text-body-sm text-amber-800 dark:text-amber-300">
          El. paštas nepatvirtintas — negalėsite peržiūrėti užklausų.
        </p>
        {sent ? (
          <span className="text-body-sm font-medium text-emerald-600 dark:text-emerald-400 shrink-0">Išsiųsta!</span>
        ) : (
          <button
            onClick={handleResend}
            disabled={sending}
            className="text-body-sm font-medium text-amber-700 underline hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300 disabled:opacity-50 shrink-0"
          >
            {sending ? "..." : "Siųsti dar kartą"}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-2 text-body-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

/** Determine the single most important next action for the provider */
function getNextAction(stats: Stats): { label: string; description: string; href: string; priority: "high" | "medium" | "low" } | null {
  if (!stats.emailVerified) return null; // banner handles this
  if (!stats.isActive) return null; // suspended banner handles this
  if (stats.categoryCount === 0) {
    return {
      label: "Pasirinkite veiklos sritis",
      description: "Be veiklos sričių nematysite jums tinkamų užklausų",
      href: "/tiekejas/profilis",
      priority: "high",
    };
  }
  if (stats.profileCompleteness < 100) {
    return {
      label: "Užpildykite profilį",
      description: `${stats.profileCompleteness}% — trūksta: ${stats.missingProfileItems.slice(0, 2).join(", ")}`,
      href: "/tiekejas/profilis",
      priority: stats.profileCompleteness < 50 ? "high" : "medium",
    };
  }
  if (stats.matchingRequests > 0 && stats.myResponses === 0) {
    return {
      label: "Atsakykite į pirmą užklausą",
      description: `${stats.matchingRequests} užklausos atitinka jūsų veiklos sritis`,
      href: "/tiekejas/uzklausos",
      priority: "high",
    };
  }
  if (stats.matchingRequests > 0) {
    return {
      label: "Peržiūrėkite naujas užklausas",
      description: `${stats.matchingRequests} tinkamos užklausos laukia jūsų pasiūlymo`,
      href: "/tiekejas/uzklausos",
      priority: "medium",
    };
  }
  return null;
}

export default function ProviderDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadInbox, setUnreadInbox] = useState(0);
  const [storyModalOpen, setStoryModalOpen] = useState(false);

  useEffect(() => {
    fetch("/api/tiekejas/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setStats(data.data);

          if (data.data.emailVerified && data.data.isActive) {
            fetch("/api/tiekejas/zinutes")
              .then((r) => r.json())
              .then((inboxData) => {
                if (inboxData.success) setUnreadInbox(inboxData.data.totalUnread);
              })
              .catch(() => {});
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleStoryChange = useCallback((delta: number) => {
    setStats((prev) => prev ? { ...prev, activeStoryCount: Math.max(0, prev.activeStoryCount + delta) } : prev);
  }, []);

  const handlePortal = useCallback(async () => {
    try {
      const res = await fetch("/api/stripe/portal");
      const data = await res.json();
      if (data.success && data.data.url) {
        window.location.href = data.data.url;
      }
    } catch {}
  }, []);

  if (loading) return <LoadingSpinner />;

  if (!stats) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 text-center">
        <p className="text-body text-surface-500 dark:text-surface-400">
          Nepavyko užkrauti duomenų. Pabandykite atnaujinti puslapį.
        </p>
      </div>
    );
  }

  const canAccessRequests = stats.emailVerified && stats.isActive;
  const nextAction = getNextAction(stats);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">Valdymo panelė</h1>
        <p className="mt-0.5 text-body-sm text-surface-500 dark:text-surface-400">
          {stats.acceptedCount
            ? `${stats.acceptedCount} ${stats.acceptedCount === 1 ? "priimtas pasiūlymas" : "priimti pasiūlymai"}`
            : "Pradėkite atsakinėti į užklausas"}
        </p>
      </div>

      {/* Account info */}
      <div className="mb-4 rounded-xl border border-surface-200/60 bg-white px-4 py-3.5 dark:border-surface-700/50 dark:bg-surface-900/50">
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          {/* Avatar — with story entry point when enabled, plain when disabled */}
          {stats.storyEnabled ? (
            <button
              onClick={() => setStoryModalOpen(true)}
              disabled={!stats.isActive || !stats.emailVerified}
              className="relative shrink-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 rounded-full disabled:cursor-default"
              aria-label={stats.isActive && stats.emailVerified ? (stats.activeStoryCount > 0 ? "Tvarkyti story" : "Pridėti story") : "Profilio nuotrauka"}
              title={stats.isActive && stats.emailVerified ? (stats.activeStoryCount > 0 ? "Tvarkyti story" : "Pridėti story") : undefined}
            >
              {/* Story ring */}
              <div className={`flex h-11 w-11 items-center justify-center rounded-full ${
                stats.activeStoryCount > 0
                  ? "bg-gradient-to-tr from-brand-500 via-violet-500 to-amber-400 p-[2.5px]"
                  : stats.isActive && stats.emailVerified
                    ? "bg-surface-200 dark:bg-surface-700 p-[2px] group-hover:bg-gradient-to-tr group-hover:from-brand-500/60 group-hover:via-violet-500/60 group-hover:to-amber-400/60 transition-all"
                    : ""
              }`}>
                <div className={`flex h-full w-full items-center justify-center rounded-full overflow-hidden ${
                  stats.activeStoryCount > 0 || (stats.isActive && stats.emailVerified)
                    ? "bg-white dark:bg-surface-900 ring-0"
                    : "bg-brand-50 dark:bg-brand-950"
                }`}>
                  {stats.profileImageUrl ? (
                    <Image
                      src={stats.profileImageUrl}
                      alt=""
                      width={44}
                      height={44}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                  )}
                </div>
              </div>
              {/* "+" badge when no active stories */}
              {stats.isActive && stats.emailVerified && stats.activeStoryCount === 0 && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white ring-2 ring-white dark:ring-surface-900 group-hover:bg-brand-700 transition-colors">
                  <Plus className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
              )}
              {/* Active story count indicator */}
              {stats.activeStoryCount > 0 && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white ring-2 ring-white dark:ring-surface-900 text-[9px] font-bold leading-none">
                  {stats.activeStoryCount}
                </span>
              )}
            </button>
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-950 overflow-hidden">
              {stats.profileImageUrl ? (
                <Image src={stats.profileImageUrl} alt="" width={36} height={36} className="h-full w-full object-cover" />
              ) : (
                <User className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-body-sm font-medium text-surface-900 dark:text-white truncate">
              {stats.userName || "Tiekėjas"}
            </p>
            <p className="text-micro text-surface-400 truncate">{stats.userEmail}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {!stats.isActive && stats.emailVerified && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-micro font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
                <ShieldCheck className="h-3 w-3" />
                Sustabdyta
              </span>
            )}
            {stats.emailVerified ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-micro font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Patvirtintas
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-micro font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                <Mail className="h-3 w-3" />
                Nepatvirtintas
              </span>
            )}
            <Badge variant={stats.planType === "PRO" ? "brand" : stats.planType === "BASIC" ? "success" : "default"}>
              {stats.planType || "FREE"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Compact alerts — email, activation, payment */}
      {!stats.emailVerified && <ResendVerificationBanner />}

      {stats.emailVerified && !stats.isActive && stats.pendingClaim && (
        <div className="mb-4 rounded-2xl border border-amber-200/60 bg-amber-50 p-5 dark:border-amber-800/40 dark:bg-amber-500/10">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/20">
              <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-body font-semibold text-amber-900 dark:text-amber-200">
                Laukiama profilio perėmimo patvirtinimo
              </h2>
              <p className="mt-1 text-body-sm text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                Patvirtinote el. paštą ir paskyra jau paruošta.
                {stats.pendingClaim.supplier?.displayName
                  ? ` Administratorius peržiūrės „${stats.pendingClaim.supplier.displayName}" perėmimo prašymą.`
                  : " Administratorius peržiūrės jūsų prašymą."}
                {" "}Po patvirtinimo galėsite redaguoti perimtą profilį ir gauti užklausas.
              </p>
            </div>
          </div>
        </div>
      )}

      {stats.emailVerified && !stats.isActive && !stats.pendingClaim && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200/60 bg-red-50 px-4 py-3 dark:border-red-800/40 dark:bg-red-500/10">
          <ShieldCheck className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-body-sm text-red-800 dark:text-red-300">
            Jūsų paskyra sustabdyta administratoriaus. Susisiekite su mumis, jei manote, kad tai klaida.
          </p>
        </div>
      )}

      {stats.subscriptionStatus === "PAST_DUE" && stats.storedPlanType !== "FREE" && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200/60 bg-red-50 px-4 py-3 dark:border-red-800/40 dark:bg-red-500/10">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <p className="flex-1 text-body-sm text-red-800 dark:text-red-300">
            Mokėjimas nepavyko — veikiate su nemokamo plano limitais.
          </p>
          <button onClick={handlePortal} className="text-body-sm font-medium text-red-700 underline hover:text-red-800 dark:text-red-400 shrink-0">
            Atnaujinti →
          </button>
        </div>
      )}

      {stats.subscriptionStatus === "CANCELED" && stats.storedPlanType !== "FREE" && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200/60 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="flex-1 text-body-sm text-amber-800 dark:text-amber-300">
            {stats.storedPlanType} planas atšauktas — veikiate su nemokamo plano limitais.
          </p>
          <Link href="/tiekejas/planai" className="text-body-sm font-medium text-amber-700 underline hover:text-amber-800 dark:text-amber-400 shrink-0">
            Atnaujinti →
          </Link>
        </div>
      )}

      {/* Next action — contextual CTA */}
      {nextAction && (
        <Link
          href={nextAction.href}
          className="group mb-6 flex items-center gap-3 rounded-2xl border border-brand-200/60 bg-brand-50 px-5 py-4 transition-colors hover:bg-brand-100/60 dark:border-brand-800/40 dark:bg-brand-500/10 dark:hover:bg-brand-500/15"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-500/20">
            <ArrowRight className="h-4 w-4 text-brand-600 dark:text-brand-400 transition-transform group-hover:translate-x-0.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-body-sm font-semibold text-brand-900 dark:text-brand-200">{nextAction.label}</p>
            <p className="text-micro text-brand-700/70 dark:text-brand-400/70 truncate">{nextAction.description}</p>
          </div>
        </Link>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MagicCard className="p-0" gradientColor="rgba(99, 102, 241, 0.06)">
          <div className="p-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950">
              <FileText className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <p className="text-heading-2 font-bold text-surface-900 dark:text-white">{stats.matchingRequests}</p>
              <p className="text-micro text-surface-500">Tinkamos užklausos</p>
            </div>
          </div>
        </MagicCard>
        <MagicCard className="p-0" gradientColor="rgba(16, 185, 129, 0.06)">
          <div className="p-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-heading-2 font-bold text-surface-900 dark:text-white">{stats.myResponses}</p>
              <p className="text-micro text-surface-500">Mano atsakymai</p>
            </div>
          </div>
        </MagicCard>
        <MagicCard className="p-0" gradientColor="rgba(139, 92, 246, 0.06)">
          <div className="p-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-500/10">
              <TrendingUp className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-heading-2 font-bold text-surface-900 dark:text-white">{stats.thisMonthResponses}</p>
              <p className="text-micro text-surface-500">Šį mėnesį</p>
            </div>
          </div>
        </MagicCard>
        <MagicCard className="p-0" gradientColor="rgba(16, 185, 129, 0.06)">
          <div className="p-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-heading-2 font-bold text-surface-900 dark:text-white">{stats.acceptedCount}</p>
              <p className="text-micro text-surface-500">Priimti</p>
            </div>
          </div>
        </MagicCard>
      </div>

      {/* Responses remaining + Profile completeness — compact combined row */}
      {canAccessRequests && (stats.responsesRemaining !== -1 || stats.profileCompleteness < 100) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {stats.responsesRemaining !== -1 && (
            <div className="rounded-2xl border border-surface-200/60 bg-white p-4 dark:border-surface-700/50 dark:bg-surface-900/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-micro font-medium text-surface-500">Likę atsakymai</p>
                <p className="text-body-sm font-bold text-surface-900 dark:text-white">
                  {stats.responsesRemaining}<span className="font-normal text-surface-400">/{stats.responsesLimit}</span>
                </p>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    stats.responsesRemaining <= 2
                      ? "bg-gradient-to-r from-red-400 to-red-500"
                      : "bg-gradient-to-r from-brand-500 to-brand-600"
                  }`}
                  style={{ width: `${stats.responsesLimit > 0 ? ((stats.responsesLimit - stats.responsesRemaining) / stats.responsesLimit) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
          {stats.profileCompleteness < 100 && (
            <Link
              href="/tiekejas/profilis"
              className="group rounded-2xl border border-surface-200/60 bg-white p-4 dark:border-surface-700/50 dark:bg-surface-900/50 hover:border-brand-200 dark:hover:border-brand-800/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-micro font-medium text-surface-500">Profilis</p>
                <p className="text-body-sm font-bold text-surface-900 dark:text-white">{stats.profileCompleteness}%</p>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden mb-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-500"
                  style={{ width: `${stats.profileCompleteness}%` }}
                />
              </div>
              {stats.missingProfileItems.length > 0 && (
                <p className="text-micro text-surface-400 truncate">
                  Trūksta: {stats.missingProfileItems.join(", ")}
                </p>
              )}
            </Link>
          )}
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {canAccessRequests ? (
          <Link href="/tiekejas/uzklausos" className="group">
            <Card hover>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Klientų užklausos</CardTitle>
                  <p className="text-body-sm text-surface-500 mt-1">Naršyti ir atsakyti</p>
                </div>
                <ArrowRight className="h-4 w-4 text-surface-400 transition-transform group-hover:translate-x-1" />
              </div>
            </Card>
          </Link>
        ) : (
          <Card>
            <div className="flex items-center justify-between opacity-50">
              <div>
                <CardTitle>Klientų užklausos</CardTitle>
                <p className="text-body-sm text-surface-500 mt-1">
                  {!stats.emailVerified ? "Patvirtinkite el. paštą" : "Paskyra sustabdyta"}
                </p>
              </div>
              <AlertCircle className="h-4 w-4 text-surface-400" />
            </div>
          </Card>
        )}
        {canAccessRequests ? (
          <Link href="/tiekejas/zinutes" className="group">
            <Card hover>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>Žinutės</CardTitle>
                    {unreadInbox > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-micro font-bold text-white">
                        {unreadInbox}
                      </span>
                    )}
                  </div>
                  <p className="text-body-sm text-surface-500 mt-1">Pokalbiai su klientais</p>
                </div>
                <MessageCircle className="h-4 w-4 text-surface-400 transition-transform group-hover:scale-110" />
              </div>
            </Card>
          </Link>
        ) : (
          <Card>
            <div className="flex items-center justify-between opacity-50">
              <div>
                <CardTitle>Žinutės</CardTitle>
                <p className="text-body-sm text-surface-500 mt-1">
                  {!stats.emailVerified ? "Patvirtinkite el. paštą" : "Paskyra sustabdyta"}
                </p>
              </div>
              <AlertCircle className="h-4 w-4 text-surface-400" />
            </div>
          </Card>
        )}
        <Link href="/tiekejas/profilis" className="group">
          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Redaguoti profilį</CardTitle>
                <p className="text-body-sm text-surface-500 mt-1">Aprašymas ir nuotraukos</p>
              </div>
              <User className="h-4 w-4 text-surface-400 transition-transform group-hover:scale-110" />
            </div>
          </Card>
        </Link>
        <Link href={`/meistrai/${session?.user?.id}`} className="group">
          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Viešas profilis</CardTitle>
                <p className="text-body-sm text-surface-500 mt-1">Kaip mato klientai</p>
              </div>
              <Eye className="h-4 w-4 text-surface-400 transition-transform group-hover:scale-110" />
            </div>
          </Card>
        </Link>
        <Link href="/tiekejas/planai" className="group">
          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Planai</CardTitle>
                <p className="text-body-sm text-surface-500 mt-1">Prenumerata ir limitai</p>
              </div>
              <ArrowRight className="h-4 w-4 text-surface-400 transition-transform group-hover:translate-x-1" />
            </div>
          </Card>
        </Link>
        <Link href="/tiekejas/katalogas" className="group">
          <Card hover>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Katalogo profiliai</CardTitle>
                <p className="text-body-sm text-surface-500 mt-1">Perimti profiliai</p>
              </div>
              <Database className="h-4 w-4 text-surface-400 transition-transform group-hover:scale-110" />
            </div>
          </Card>
        </Link>
      </div>

      {/* Story modal — only when feature enabled */}
      {stats.storyEnabled && (
        <StoryModal
          open={storyModalOpen}
          onClose={() => setStoryModalOpen(false)}
          onStoryChange={handleStoryChange}
        />
      )}
    </div>
  );
}
