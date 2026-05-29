"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { X, Sparkles, Clock, Camera, Trash2, Eye, ChevronDown, ChevronUp } from "lucide-react";

interface StoryItem {
  id: string;
  imageUrl: string;
  text: string | null;
  expiresAt: string;
  createdAt: string;
}

interface StoryStats {
  viewCount: number;
  viewers: { id: string; name: string; image: string | null }[];
  anonymousCount: number;
  reactions: { emoji: string; count: number }[];
  reactionCount: number;
  reactors: { id: string; name: string; image: string | null; emoji: string }[];
}

const EMPTY_STATS: StoryStats = {
  viewCount: 0,
  viewers: [],
  anonymousCount: 0,
  reactions: [],
  reactionCount: 0,
  reactors: [],
};

function storyTimeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Pasibaigė";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours} val. ${mins} min.`;
  return `${mins} min.`;
}

export default function StoryModal({
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
  const [isDragging, setIsDragging] = useState(false);
  const [stats, setStats] = useState<Record<string, StoryStats>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadStats = useCallback((ids: string[]) => {
    for (const id of ids) {
      fetch(`/api/provider/stories/${id}/viewers`)
        .then((r) => r.json())
        .then((res) => {
          if (res?.success) setStats((prev) => ({ ...prev, [id]: res.data }));
        })
        .catch(() => {});
    }
  }, []);

  // Fetch stories when modal opens
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingStories(true);
    setError("");
    fetch("/api/provider/stories")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const list: StoryItem[] = data.data || [];
          setStories(list);
          loadStats(list.map((s) => s.id));
        }
      })
      .catch(() => setError("Nepavyko užkrauti story"))
      .finally(() => setLoadingStories(false));
  }, [open, loadStats]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
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

  // Reset drag state when modal closes
  useEffect(() => {
    if (!open) setIsDragging(false);
  }, [open]);

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
        setStats((prev) => ({ ...prev, [data.data.id]: EMPTY_STATS }));
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
        setStats((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setExpandedId((cur) => (cur === id ? null : cur));
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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Story valdymas">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Sheet */}
      <div
        className="relative flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl dark:bg-surface-900"
        onDragEnter={(e) => {
          if (uploading || loadingStories || stories.length >= 3) return;
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          if (uploading || loadingStories || stories.length >= 3) return;
          e.preventDefault();
          e.stopPropagation();
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragging(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
          if (uploading || loadingStories || stories.length >= 3) return;
          const file = e.dataTransfer.files?.[0];
          if (file) handleUpload(file);
        }}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pb-0 pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-surface-300 dark:bg-surface-600" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-4 sm:pt-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <h2 className="text-body font-semibold text-surface-900 dark:text-white">Story</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
          >
            <X className="h-4 w-4 text-surface-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-5">
          {error && (
            <div className="mb-3 flex items-center justify-between rounded-xl bg-red-50 px-3 py-2 text-body-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <span>{error}</span>
              <button onClick={() => setError("")} className="ml-2 shrink-0 text-red-400 hover:text-red-600">
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
                <div className="mb-4 space-y-2">
                  <p className="text-micro font-medium uppercase tracking-wider text-surface-500">Aktyvios story</p>
                  {stories.map((story) => {
                    const st = stats[story.id];
                    const expanded = expandedId === story.id;
                    const reactionByViewer = new Map(
                      (st?.reactors ?? []).map((r) => [r.id, r.emoji] as const),
                    );
                    const canExpand =
                      !!st && (st.viewers.length > 0 || st.anonymousCount > 0);
                    return (
                      <div
                        key={story.id}
                        className={`overflow-hidden rounded-xl border border-surface-200/60 bg-surface-50/50 transition-opacity dark:border-surface-700/50 dark:bg-surface-800/30 ${deleting === story.id ? "pointer-events-none opacity-50" : ""}`}
                      >
                        <div className="flex items-center gap-3 p-2.5">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-200 dark:bg-surface-700">
                            <Image src={story.imageUrl} alt="" width={48} height={48} sizes="48px" className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-body-sm ${story.text ? "text-surface-700 dark:text-surface-300" : "italic text-surface-400"}`}>
                              {story.text || "Be teksto"}
                            </p>
                            <p className="flex items-center gap-1 text-micro text-surface-400">
                              <Clock className="h-3 w-3" />
                              {storyTimeLeft(story.expiresAt)}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDelete(story.id)}
                            disabled={deleting === story.id}
                            className="shrink-0 rounded-lg p-2 text-surface-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50 dark:hover:bg-red-500/10"
                            aria-label="Pašalinti story"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Engagement summary — tap to see who viewed */}
                        <button
                          type="button"
                          onClick={() => canExpand && setExpandedId(expanded ? null : story.id)}
                          className={`flex w-full items-center justify-between border-t border-surface-200/60 px-2.5 py-2 text-micro dark:border-surface-700/50 ${canExpand ? "transition-colors hover:bg-surface-100/60 dark:hover:bg-surface-800/40" : "cursor-default"}`}
                          aria-expanded={expanded}
                        >
                          <span className="flex items-center gap-3 text-surface-500">
                            <span className="flex items-center gap-1 font-medium">
                              <Eye className="h-3.5 w-3.5" />
                              {st ? st.viewCount : "–"}
                            </span>
                            {st && st.reactions.length > 0 && (
                              <span className="flex items-center gap-1.5">
                                {st.reactions.map((r) => (
                                  <span key={r.emoji} className="flex items-center gap-0.5">
                                    <span aria-hidden>{r.emoji}</span>
                                    <span className="tabular-nums">{r.count}</span>
                                  </span>
                                ))}
                              </span>
                            )}
                          </span>
                          {canExpand &&
                            (expanded ? (
                              <ChevronUp className="h-3.5 w-3.5 text-surface-400" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-surface-400" />
                            ))}
                        </button>

                        {expanded && st && (
                          <div className="space-y-1.5 border-t border-surface-200/60 px-2.5 py-2.5 dark:border-surface-700/50">
                            {st.viewers.map((v) => {
                              const emoji = reactionByViewer.get(v.id);
                              return (
                                <div key={v.id} className="flex items-center gap-2">
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-micro font-bold text-brand-600 dark:bg-brand-900/50">
                                    {v.image ? (
                                      <Image src={v.image} alt="" width={24} height={24} sizes="24px" className="h-full w-full object-cover" />
                                    ) : (
                                      v.name[0]?.toUpperCase() || "?"
                                    )}
                                  </div>
                                  <span className="min-w-0 flex-1 truncate text-body-sm text-surface-700 dark:text-surface-300">
                                    {v.name}
                                  </span>
                                  {emoji && <span aria-hidden>{emoji}</span>}
                                </div>
                              );
                            })}
                            {st.anonymousCount > 0 && (
                              <p className="text-micro text-surface-400">
                                ir {st.anonymousCount} anoniminių
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Create new story */}
              {stories.length < 3 ? (
                <div className="space-y-3">
                  {stories.length > 0 ? (
                    <div className="border-t border-surface-100 pt-3 dark:border-surface-800">
                      <p className="mb-2 text-micro font-medium uppercase tracking-wider text-surface-500">Nauja story</p>
                    </div>
                  ) : (
                    <div className="mb-1 py-2 text-center">
                      <Sparkles className="mx-auto mb-2 h-8 w-8 text-surface-200 dark:text-surface-700" />
                      <p className="text-body-sm text-surface-500">Parodykite klientams ką šiandien veikiate</p>
                      <p className="mt-0.5 text-micro text-surface-400">Story matoma 24 valandas jūsų viešame profilyje</p>
                    </div>
                  )}
                  <div>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value.slice(0, 200))}
                      placeholder="Trumpas tekstas (nebūtinas)"
                      maxLength={200}
                      className="w-full rounded-xl border border-surface-300 bg-white px-3.5 py-2.5 text-body-sm text-surface-900 transition-all placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-600 dark:bg-surface-800 dark:text-white"
                    />
                    {text.length > 0 && (
                      <p className="mt-1 text-right text-micro tabular-nums text-surface-300">{text.length}/200</p>
                    )}
                  </div>
                  <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-4 transition-all ${
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
                        <span className="text-body-sm font-medium text-surface-600 dark:text-surface-400">Pasirinkti arba įmesti nuotrauką</span>
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
                  <p className="text-center text-micro text-surface-300 dark:text-surface-600">
                    {3 - stories.length} iš 3 liko · Galioja 24 val. · Max 5MB
                  </p>
                </div>
              ) : (
                <p className="py-3 text-center text-body-sm text-surface-400">
                  Visos 3 story vietos užimtos. Pašalinkite seną arba palaukite.
                </p>
              )}
            </>
          )}
        </div>

        {/* Drag-and-drop overlay */}
        {isDragging && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-t-2xl bg-white/95 backdrop-blur-sm sm:rounded-2xl dark:bg-surface-900/95">
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-brand-500 px-8 py-6">
              <Camera className="h-8 w-8 text-brand-500" />
              <p className="text-body-sm font-medium text-surface-700 dark:text-surface-300">
                Paleiskite nuotrauką čia
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
