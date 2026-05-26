"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, ArrowRight, Check, Sparkles, Pencil, ImagePlus, X, Paperclip, AlertCircle } from "lucide-react";
import Image from "next/image";
import { LITHUANIAN_CITIES } from "@/lib/constants";
import type { ServiceCategoryGroup, ServiceCategoryItem } from "@/lib/service-categories";
import { saveGuestRequest } from "@/lib/guest-request";
import { saveListingDraft, loadListingDraft, clearListingDraft } from "@/lib/listing-draft";
import { useImageUpload } from "@/lib/use-image-upload";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary-image";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmailVerification from "@/components/requests/EmailVerification";
import PhoneVerification from "@/components/requests/PhoneVerification";
import ListingPreview from "@/components/requests/ListingPreview";
import GroupedCategoryPicker from "@/components/categories/GroupedCategoryPicker";
import ImproveDescriptionButton from "@/components/ai/ImproveDescriptionButton";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";

export default function NewRequestPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <NewRequestForm />
    </Suspense>
  );
}

interface FormState {
  title: string;
  description: string;
  categoryId: string;
  location: string;
  budget: string;
  deadline: string;
  attachmentUrls: string[];
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  honeypot: string;
}

// Editing any of these latches the editor open, so it never collapses out from
// under someone who is still completing the listing by hand.
const LISTING_FIELDS = new Set<keyof FormState>([
  "title",
  "description",
  "categoryId",
  "location",
  "budget",
  "deadline",
  "attachmentUrls",
]);

function NewRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const initialDescription = (searchParams.get("description") || "").slice(0, 2000);
  const cameFromHero = initialDescription.trim().length >= 15;

  const [form, setForm] = useState<FormState>({
    title: "",
    description: initialDescription,
    categoryId: "",
    location: "",
    budget: "",
    deadline: "",
    attachmentUrls: [],
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    honeypot: "",
  });
  const [categoryGroups, setCategoryGroups] = useState<ServiceCategoryGroup[]>([]);
  // The AI may answer before the category list finishes loading — stash its
  // raw slug/id here and resolve it once the picker options are available.
  const [pendingAiCategory, setPendingAiCategory] = useState("");
  const [aiLoading, setAiLoading] = useState(cameFromHero);
  const [aiFailed, setAiFailed] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [accountPhone, setAccountPhone] = useState("");
  const [accountPhoneVerifiedAt, setAccountPhoneVerifiedAt] = useState<string | null>(null);
  const [attemptedPublish, setAttemptedPublish] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [contactsEditorOpen, setContactsEditorOpen] = useState(false);
  // True once the user has manually picked a category from the picker. While
  // false, the auto-suggest effect is allowed to refresh `form.categoryId` as
  // the description changes. A manual pick locks the field.
  const [categoryManuallyPicked, setCategoryManuallyPicked] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Tracks the last description text we asked the suggestion API about, so we
  // skip redundant calls when the description hasn't materially changed.
  const lastAutoSuggestTextRef = useRef<string>("");

  const isLoggedIn = status === "authenticated" && !!session?.user;

  const {
    uploading: photosUploading,
    error: photoError,
    dragOver: photoDragOver,
    uploadFiles: uploadPhotos,
    dropHandlers: photoDropHandlers,
  } = useImageUpload({
    currentCount: form.attachmentUrls.length,
    onUploaded: (urls) => {
      setForm((f) => ({ ...f, attachmentUrls: [...f.attachmentUrls, ...urls] }));
    },
  });

  function removePhoto(url: string) {
    setForm((f) => ({ ...f, attachmentUrls: f.attachmentUrls.filter((u) => u !== url) }));
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (LISTING_FIELDS.has(key)) setEditorOpen(true);
  }

  // Stash the listing so it survives the Google OAuth redirect round-trip.
  function persistDraft() {
    saveListingDraft({
      title: form.title,
      description: form.description,
      categoryId: form.categoryId,
      location: form.location,
      budget: form.budget,
      deadline: form.deadline,
      attachmentUrls: form.attachmentUrls,
      clientName: form.clientName,
      clientEmail: form.clientEmail,
      clientPhone: form.clientPhone,
    });
  }

  // id -> name and slug -> id maps over the curated categories, walking the
  // full tree so depth-2+ leaves (which the suggestion engine returns) also
  // resolve, not just the depth-1 group children.
  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    function add(cat: ServiceCategoryItem) {
      map.set(cat.id, cat.name);
      for (const child of cat.children ?? []) add(child);
    }
    for (const group of categoryGroups) {
      for (const cat of group.categories) add(cat);
    }
    return map;
  }, [categoryGroups]);

  const categoryIdBySlug = useMemo(() => {
    const map = new Map<string, string>();
    function add(cat: ServiceCategoryItem) {
      map.set(cat.slug, cat.id);
      for (const child of cat.children ?? []) add(child);
    }
    for (const group of categoryGroups) {
      for (const cat of group.categories) add(cat);
    }
    return map;
  }, [categoryGroups]);

  /** Resolve an AI-returned category slug (or id) to a valid category id. */
  function resolveAiCategory(value: string | undefined): string {
    if (!value) return "";
    if (categoryIdBySlug.has(value)) return categoryIdBySlug.get(value) ?? "";
    if (categoryNameById.has(value)) return value;
    return "";
  }

  // Pre-fill name + email for logged-in users.
  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    const user = session.user;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((f) => ({
      ...f,
      clientName: f.clientName || user.name || "",
      clientEmail: user.email || f.clientEmail,
    }));
  }, [status, session?.user]);

  // Load account phone because NextAuth's lightweight session does not carry
  // the client profile fields.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/paskyra/profilis");
        const data = await res.json().catch(() => null);
        if (cancelled || !res.ok || !data?.success) return;
        const nextAccountPhone = data.data?.phone || "";
        const nextAccountPhoneVerifiedAt = data.data?.phoneVerifiedAt || null;
        setAccountPhone(nextAccountPhone);
        setAccountPhoneVerifiedAt(nextAccountPhoneVerifiedAt);
        setForm((current) => {
          const nextPhone = current.clientPhone || nextAccountPhone;
          return { ...current, clientPhone: nextPhone };
        });
      } catch {
        // Phone can still be entered manually.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    if (!isLoggedIn || !accountPhone) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhoneVerified(false);
      return;
    }
    const verified = !!accountPhoneVerifiedAt && form.clientPhone.trim() === accountPhone;
     
    setPhoneVerified(verified);
  }, [isLoggedIn, accountPhone, accountPhoneVerifiedAt, form.clientPhone]);

  // Load the grouped curated categories for the picker.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/service-categories");
        const data = await res.json().catch(() => null);
        if (!cancelled && res.ok && data?.success && Array.isArray(data.data)) {
          setCategoryGroups(data.data as ServiceCategoryGroup[]);
        }
      } catch {
        // Picker stays empty — the form still validates categoryId as required.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Restore the dictated listing after returning from a Google sign-in redirect.
  // Only restore if explicitly allowed (restored=1 for OAuth flow).
  // Otherwise always start with a clean form to avoid stale data.
  useEffect(() => {
    const restored = searchParams.get("restored") === "1";
    if (restored) {
      const draft = loadListingDraft();
      if (draft) {
        // Only copy fields with real content so we don't wipe values the session
        // has already pre-filled (e.g. clientName from Google).
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm((f) => {
          const next = { ...f };
          if (draft.title) next.title = draft.title;
          if (draft.description) next.description = draft.description;
          if (draft.categoryId) next.categoryId = draft.categoryId;
          if (draft.location) next.location = draft.location;
          if (draft.budget) next.budget = draft.budget;
          if (draft.deadline) next.deadline = draft.deadline;
          if (draft.attachmentUrls.length > 0) next.attachmentUrls = draft.attachmentUrls;
          if (draft.clientName) next.clientName = draft.clientName;
          if (draft.clientEmail) next.clientEmail = draft.clientEmail;
          if (draft.clientPhone) next.clientPhone = draft.clientPhone;
          return next;
        });
        clearListingDraft();
      }
      router.replace("/uzklausos/nauja");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save initial description immediately when arriving from hero search.
  useEffect(() => {
    if (!cameFromHero || !initialDescription) return;
    persistDraft();
  }, [cameFromHero, initialDescription]);

  // Auto-save the form when coming from hero search, so it survives page reloads.
  useEffect(() => {
    if (!cameFromHero) return;
    const timer = setTimeout(() => {
      if (form.description.trim().length > 0) {
        persistDraft();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [form.description, cameFromHero]);

  // Run AI extraction once when arriving from the hero box.
  useEffect(() => {
    if (!cameFromHero) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/requests/improve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: initialDescription }),
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && data?.success && data.data) {
          const d = data.data;
          setForm((f) => ({
            ...f,
            description: d.improvedDescription || f.description,
            title: d.title || f.title,
            location: d.location || f.location,
            budget: d.budget || f.budget,
            deadline: d.deadline || f.deadline,
          }));
          // AI returns a curated category slug — resolve it to an id once the
          // picker options are loaded.
          if (typeof d.category === "string" && d.category) {
            setPendingAiCategory(d.category);
          }
        } else {
          setAiFailed(true);
        }
      } catch {
        if (!cancelled) setAiFailed(true);
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply the AI-picked category once the picker options have loaded. Only
  // fills an empty slot — a manual pick always wins.
  useEffect(() => {
    if (!pendingAiCategory || categoryGroups.length === 0) return;
    const resolved = resolveAiCategory(pendingAiCategory);
    if (resolved && !form.categoryId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm((f) => ({ ...f, categoryId: resolved }));
    }

    setPendingAiCategory("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAiCategory, categoryGroups]);

  // Auto-suggest category whenever the description changes meaningfully and the
  // user hasn't already locked in a manual pick. Replaces the old "Pasiūlyti
  // pagal aprašymą" button — the suggestion engine now runs in the background
  // alongside the description-improve AI. Debounced so we don't fire on every
  // keystroke.
  useEffect(() => {
    if (aiLoading) return;
    if (categoryManuallyPicked) return;
    if (categoryGroups.length === 0) return;

    const text = form.description.trim();
    const title = form.title.trim();
    if (text.length < 20) return;
    if (text === lastAutoSuggestTextRef.current) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/category-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "request",
            text,
            title: title || undefined,
            limit: 5,
          }),
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as
          | {
              success?: boolean;
              data?: { suggestions?: Array<{ id: string; slug: string }> };
            }
          | null;
        if (!data?.success) return;
        const top = data.data?.suggestions?.[0];
        if (!top) return;
        // Resolve either id or slug into a picker id, then only apply if the
        // user is still in "no manual pick yet" mode.
        const resolvedId = resolveAiCategory(top.slug) || resolveAiCategory(top.id);
        if (!resolvedId) return;
        lastAutoSuggestTextRef.current = text;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setForm((f) => (f.categoryId && categoryManuallyPicked ? f : { ...f, categoryId: resolvedId }));
      } catch {
        // Network/abort errors are silent — auto-suggest is best-effort.
      }
    }, 1500);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.description, form.title, aiLoading, categoryManuallyPicked, categoryGroups.length]);

  // ── Validation ──
  const titleOk = form.title.trim().length >= 5;
  const descOk = form.description.trim().length >= 20;
  const nameOk = form.clientName.trim().length >= 2;
  const phoneOk = form.clientPhone.trim().length >= 6;

  const missingListing: string[] = [];
  if (!titleOk) missingListing.push("pavadinimą");
  if (!descOk) missingListing.push("aprašymą");
  if (!form.categoryId) missingListing.push("kategoriją");
  if (!form.location.trim()) missingListing.push("miestą");
  if (!form.budget.trim()) missingListing.push("biudžetą");
  if (!form.deadline.trim()) missingListing.push("terminą");

  const emailOk = emailVerified || isLoggedIn;
  const hasContact = emailOk || phoneOk;
  const ready = missingListing.length === 0 && nameOk && hasContact;

  // When the dictated listing already passes, collapse the editor to a single
  // "Redaguoti skelbimą" affordance — nothing to fix, so don't show the form.
  const listingComplete = missingListing.length === 0;
  const showEditor = editorOpen || !listingComplete;

  // Logged-in users get name + verified email for free from Google, so the
  // contacts block can collapse the same way the listing block does.
  const contactsComplete = isLoggedIn && nameOk && hasContact;
  const showContactsEditor = contactsEditorOpen || !contactsComplete;

  const publishHint = (() => {
    const gaps = [...missingListing];
    if (!nameOk) gaps.push("vardą");
    if (!hasContact) gaps.push("el. pašto arba telefono");
    if (gaps.length > 0) return `Dar reikia užpildyti: ${gaps.join(", ")}`;
    return "";
  })();

  // Field errors surface after AI fills (hero flow) or after a publish attempt.
  const showErrors = (cameFromHero && !aiLoading) || attemptedPublish;

  async function handlePublish() {
    setAttemptedPublish(true);
    if (!ready || publishing) return;
    setPublishing(true);
    setError("");
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data.data?.trackingToken) {
        if (!isLoggedIn) saveGuestRequest(data.data.trackingToken, form.title);
        clearListingDraft();
        router.push(`/uzklausos/sekti/${data.data.trackingToken}`);
      } else {
        setError(data?.error || "Nepavyko paskelbti skelbimo");
        setPublishing(false);
      }
    } catch {
      setError("Nepavyko paskelbti. Bandykite dar kartą.");
      setPublishing(false);
    }
  }

  if (aiLoading) return <PreviewSkeleton />;
  if (status === "loading") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <LoadingSpinner />
      </div>
    );
  }

  const categoryLabel = form.categoryId ? categoryNameById.get(form.categoryId) : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">Tavo skelbimas</h1>
      <p className="mt-1 text-body-sm text-surface-500 dark:text-surface-400">
        Štai kaip skelbimą matys tiekėjai. Patikrink, užbaik ir paskelbk.
      </p>

      {aiFailed && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-body-sm text-amber-800 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          AI nepavyko sutvarkyti aprašymo — užpildyk laukus pats.
        </div>
      )}

      {/* ── Live preview — exactly how the listing appears to providers ── */}
      <ListingPreview
        className="mt-6"
        title={form.title}
        description={form.description}
        categoryLabel={categoryLabel}
        location={form.location}
        budget={form.budget}
        deadline={form.deadline}
        attachmentUrls={form.attachmentUrls}
      />

      {/* ── Complete & fix ── */}
      {showEditor ? (
      <div className="mt-8 rounded-2xl border border-surface-200/60 bg-white p-6 shadow-card dark:border-surface-700/50 dark:bg-surface-900/50">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          <h2 className="text-body-sm font-semibold text-surface-900 dark:text-white">
            Patikrink ir užbaik
          </h2>
        </div>

        {missingListing.length > 0 ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-body-sm text-amber-800 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            Skelbimui dar trūksta:{" "}
            <span className="font-semibold">{missingListing.join(", ")}</span>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-body-sm text-emerald-700 dark:border-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <Check className="h-4 w-4 shrink-0" /> Skelbimas pilnas — gali skelbti.
          </div>
        )}

        <div className="mt-4 space-y-4">
          <Input
            id="title"
            label="Pavadinimas"
            placeholder="Pvz. Vonios kambario remontas"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            error={showErrors && !titleOk ? "Bent 5 simboliai" : undefined}
          />
          <div>
            <div
              {...photoDropHandlers}
              className={`relative rounded-xl transition-colors ${
                photoDragOver ? "ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-surface-900" : ""
              }`}
            >
              <Textarea
                id="description"
                label="Aprašymas"
                placeholder="Aprašyk, ko reikia — ką padaryti, mastai, medžiagos..."
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                autoResize
                error={showErrors && !descOk ? "Bent 20 simbolių" : undefined}
              />
              {photoDragOver && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-brand-50/90 dark:bg-brand-950/60">
                  <div className="flex items-center gap-2 text-body-sm font-medium text-brand-700 dark:text-brand-300">
                    <ImagePlus className="h-5 w-5" /> Įmesk nuotraukas čia
                  </div>
                </div>
              )}
            </div>

            {form.attachmentUrls.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {form.attachmentUrls.map((url, i) => (
                  <div
                    key={url}
                    className="group relative h-20 w-20 overflow-hidden rounded-lg border border-surface-200 dark:border-surface-700"
                  >
                    <Image
                      src={optimizeCloudinaryUrl(url, { width: 160, height: 160, crop: "fill" })}
                      alt={`Nuotrauka ${i + 1}`}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(url)}
                      aria-label="Pašalinti nuotrauką"
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-surface-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {photosUploading && (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-surface-300 dark:border-surface-600">
                    <Loader2 className="h-5 w-5 animate-spin text-surface-400" />
                  </div>
                )}
              </div>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <ImproveDescriptionButton
                value={form.description}
                onChange={(value) => update("description", value)}
                onMeta={(meta) => {
                  setForm((prev) => {
                    const resolved = resolveAiCategory(meta.category);
                    return {
                      ...prev,
                      categoryId: prev.categoryId || resolved,
                      title: prev.title || meta.title,
                      location: prev.location || meta.location,
                    };
                  });
                  if (meta.category && categoryGroups.length === 0) {
                    setPendingAiCategory(meta.category);
                  }
                }}
                targetId="description"
                category={categoryLabel}
                title={form.title}
                tone="form"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photosUploading || form.attachmentUrls.length >= 5}
                className="inline-flex items-center gap-1.5 text-body-sm font-medium text-surface-600 transition-colors hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-surface-400 dark:hover:text-brand-400"
              >
                {photosUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
                Pridėti nuotraukų
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  void uploadPhotos(files);
                  e.target.value = "";
                }}
              />
            </div>
            <p className="mt-1.5 text-micro text-surface-400">
              Nuotraukas gali pertempti tiesiai į aprašymą. Iki 5 nuotraukų, kiekviena iki 25 MB.
            </p>
            {photoError && (
              <p className="mt-1 text-micro text-red-500 dark:text-red-400">{photoError}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <GroupedCategoryPicker
              id="categoryId"
              label="Kategorija"
              groups={categoryGroups}
              value={form.categoryId}
              onChange={(v) => {
                setCategoryManuallyPicked(true);
                update("categoryId", v);
              }}
              mode="id"
              required
              error={showErrors && !form.categoryId ? "Privaloma" : undefined}
            />
            <Input
              id="location"
              label="Miestas ar vietovė"
              placeholder="Pvz. Trakai"
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              list="city-suggestions"
              autoComplete="off"
              error={showErrors && !form.location.trim() ? "Privaloma" : undefined}
            />
            <datalist id="city-suggestions">
              {LITHUANIAN_CITIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <Input
              id="budget"
              label="Biudžetas"
              placeholder="Pvz. 500 € arba derinama"
              value={form.budget}
              onChange={(e) => update("budget", e.target.value)}
              error={showErrors && !form.budget.trim() ? "Privaloma" : undefined}
            />
            <Input
              id="deadline"
              label="Terminas"
              placeholder="Pvz. iki gegužės pabaigos"
              value={form.deadline}
              onChange={(e) => update("deadline", e.target.value)}
              error={showErrors && !form.deadline.trim() ? "Privaloma" : undefined}
            />
          </div>
        </div>
      </div>
      ) : (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-surface-200/60 bg-white px-5 py-4 shadow-card dark:border-surface-700/50 dark:bg-surface-900/50">
          <span className="flex items-center gap-1.5 text-body-sm font-medium text-emerald-700 dark:text-emerald-400">
            <Check className="h-4 w-4 shrink-0" /> Skelbimas paruoštas — gali skelbti
          </span>
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="inline-flex items-center gap-1.5 text-body-sm font-medium text-brand-600 underline-offset-2 transition-colors hover:text-brand-700 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
          >
            <Pencil className="h-3.5 w-3.5" /> Redaguoti skelbimą
          </button>
        </div>
      )}

      {/* ── Contacts ── */}
      {!showContactsEditor ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-surface-200/60 bg-white px-5 py-4 shadow-card dark:border-surface-700/50 dark:bg-surface-900/50">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex min-w-0 items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
              <span className="text-body-sm font-medium text-emerald-700 dark:text-emerald-400">
                Kontaktai paruošti — gali skelbti
              </span>
            </div>
            {!form.clientPhone.trim() && (
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="text-micro text-surface-500 dark:text-surface-400">
                  Telefonas nepridėtas
                </span>
              </div>
            )}
            {form.clientPhone.trim() && (
              <span className="text-micro text-surface-500 dark:text-surface-400">
                Telefonas: {form.clientPhone}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setContactsEditorOpen(true)}
            className="inline-flex shrink-0 items-center gap-1.5 text-body-sm font-medium text-brand-600 underline-offset-2 transition-colors hover:text-brand-700 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
          >
            <Pencil className="h-3.5 w-3.5" /> Redaguoti
          </button>
        </div>
      ) : (
      <div className="mt-4 rounded-2xl border border-surface-200/60 bg-white p-6 shadow-card dark:border-surface-700/50 dark:bg-surface-900/50">
        <h2 className="mb-4 text-body-sm font-semibold text-surface-900 dark:text-white">Kontaktai</h2>
        <div className="space-y-4">
          {isLoggedIn ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 dark:border-emerald-700 dark:bg-emerald-500/10">
              <Check className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div className="min-w-0">
                <p className="text-body-sm font-medium text-surface-900 dark:text-surface-100">
                  Prisijungta{session?.user?.name ? ` kaip ${session.user.name}` : ""}
                </p>
                <p className="truncate text-micro text-surface-500 dark:text-surface-400">
                  {session?.user?.email} · el. paštas patvirtintas
                </p>
              </div>
            </div>
          ) : (
            <div>
              <GoogleSignInButton
                callbackUrl="/uzklausos/nauja?restored=1"
                label="Tęsti su Google"
                onBeforeSignIn={persistDraft}
              />
              <p className="mt-1.5 text-micro text-surface-400">
                Google iškart patvirtina el. paštą. Telefonas – neprivalomas.
              </p>
              <div className="mt-3">
                <PhoneVerificationField
                  phone={form.clientPhone}
                  onPhoneChange={(value) => update("clientPhone", value)}
                  verified={phoneVerified}
                  onVerifiedChange={setPhoneVerified}
                  onVerified={(verifiedPhone, verifiedAt) => {
                    setAccountPhone(verifiedPhone);
                    setAccountPhoneVerifiedAt(verifiedAt);
                  }}
                  error={showErrors && !hasContact ? "Įvesk el. paštą arba telefoną" : undefined}
                />
              </div>
              <div className="my-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-surface-200 dark:bg-surface-700" />
                <span className="text-micro text-surface-400">arba su el. paštu</span>
                <span className="h-px flex-1 bg-surface-200 dark:bg-surface-700" />
              </div>
            </div>
          )}
          <Input
            id="clientName"
            label="Tavo vardas"
            placeholder="Jonas"
            value={form.clientName}
            onChange={(e) => update("clientName", e.target.value)}
            error={showErrors && !nameOk ? "Bent 2 simboliai" : undefined}
          />
          {!isLoggedIn && (
            <EmailVerification
              email={form.clientEmail}
              onEmailChange={(v) => update("clientEmail", v)}
              verified={emailVerified}
              onVerifiedChange={setEmailVerified}
            />
          )}
          {isLoggedIn && (
            <PhoneVerificationField
              phone={form.clientPhone}
              onPhoneChange={(value) => update("clientPhone", value)}
              verified={phoneVerified}
              onVerifiedChange={setPhoneVerified}
              onVerified={(verifiedPhone, verifiedAt) => {
                setAccountPhone(verifiedPhone);
                setAccountPhoneVerifiedAt(verifiedAt);
              }}
              error={showErrors && !hasContact ? "Įvesk telefoną" : undefined}
            />
          )}
          {/* Honeypot — hidden from humans, bait for bots */}
          <input
            type="text"
            name="website_url"
            value={form.honeypot}
            onChange={(e) => update("honeypot", e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="pointer-events-none absolute -left-[9999px] -top-[9999px] h-0 w-0 opacity-0"
          />
        </div>
      </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl bg-red-50 p-3 text-body-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ── Publish ── */}
      <div className="mt-6">
        <Button
          type="button"
          size="lg"
          variant={ready ? "primary" : "secondary"}
          className="w-full"
          onClick={handlePublish}
          isLoading={publishing}
        >
          {!publishing && <ArrowRight className="h-5 w-5" />}
          Paskelbti skelbimą
        </Button>
        {!publishing && publishHint && (
          <p className="mt-2 text-center text-micro text-surface-400">{publishHint}</p>
        )}
        <p className="mt-3 text-center text-micro text-surface-400">
          Paskelbus, skelbimą iškart matys tiekėjai ir netrukus gausi pasiūlymų.
        </p>
      </div>
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-center gap-2.5 text-brand-600 dark:text-brand-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-body font-medium">AI tvarko tavo skelbimą…</span>
      </div>
      <p className="mt-1 text-body-sm text-surface-400">
        Tuoj parodysime, kaip atrodys tavo skelbimas.
      </p>
      <div className="mt-6 space-y-4">
        <div className="h-60 animate-pulse rounded-2xl bg-surface-100 dark:bg-surface-800" />
        <div className="h-44 animate-pulse rounded-2xl bg-surface-100 dark:bg-surface-800" />
      </div>
    </div>
  );
}

function PhoneVerificationField({
  phone,
  onPhoneChange,
  verified,
  onVerifiedChange,
  onVerified,
  error,
}: {
  phone: string;
  onPhoneChange: (value: string) => void;
  verified: boolean;
  onVerifiedChange: (value: boolean) => void;
  onVerified?: (phone: string, phoneVerifiedAt: string) => void;
  error?: string;
}) {
  return (
    <PhoneVerification
      phone={phone}
      onPhoneChange={onPhoneChange}
      verified={verified}
      onVerifiedChange={onVerifiedChange}
      onVerified={onVerified}
      error={error}
      helper="Telefonas neprivalomas."
    />
  );
}
