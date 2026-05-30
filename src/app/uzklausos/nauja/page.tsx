"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, Check, AlertCircle, Pencil, Loader2 } from "lucide-react";
import type { ServiceCategoryGroup, ServiceCategoryItem } from "@/lib/service-categories";
import { saveGuestRequest } from "@/lib/guest-request";
import {
  saveListingDraft,
  loadListingDraft,
  clearListingDraft,
} from "@/lib/listing-draft";
import { useImageUpload } from "@/lib/use-image-upload";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmailVerification from "@/components/requests/EmailVerification";
import PhoneVerification from "@/components/requests/PhoneVerification";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import AiProcessingSkeleton from "@/components/uzklausos-v2/AiProcessingSkeleton";
import AiSuggestionsStrip, {
  type AiSuggestion,
  type AiSuggestionChoice,
} from "@/components/uzklausos-v2/AiSuggestionsStrip";
import InlineListingCard from "@/components/uzklausos-v2/InlineListingCard";

export default function NewRequestV2Page() {
  return (
    <Suspense fallback={<NewRequestShell />}>
      <NewRequestV2Form />
    </Suspense>
  );
}

// Server-prerenderable shell: gives the static (no-JS) HTML a real <h1> and
// intro copy so crawlers index the page properly. Replaced by the live form
// once the search-param-dependent client form hydrates.
function NewRequestShell() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">
        Tavo skelbimas
      </h1>
      <p className="mt-1 text-body-sm text-surface-500 dark:text-surface-400">
        Aprašyk, ko reikia — tiekėjai patys pateiks pasiūlymus.
      </p>
      <div className="mt-8">
        <LoadingSpinner />
      </div>
    </div>
  );
}

interface FormState {
  title: string;
  description: string;
  categoryIds: string[];
  location: string;
  budget: string;
  deadline: string;
  attachmentUrls: string[];
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  honeypot: string;
}

const MAX_CATEGORIES = 3;

type AiStatus = "idle" | "running" | "done" | "error";
type AiField = "title" | "description" | "category" | "location" | "budget" | "deadline";

function NewRequestV2Form() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();

  const initialDescription = (searchParams.get("description") || "").slice(0, 2000);
  // Prefill from keyword landing pages (e.g. /paslaugos/elektrikas-kaune):
  // title + category slug + city come in the URL so a user who arrived via a
  // specific intent gets a ready-to-post listing — they only need to sign in.
  const initialTitle = (searchParams.get("title") || "").trim().slice(0, 120);
  const initialCategorySlug = (searchParams.get("category") || "").trim();
  const initialLocation = (searchParams.get("location") || searchParams.get("city") || "").trim().slice(0, 60);
  // A fully prefilled listing (explicit title + category) should NOT be
  // overwritten by the hero AI auto-run — keep it stable and immediately
  // postable. The free-text hero flow (description only) still auto-runs AI.
  const isPrefilled = initialTitle.length > 0 && initialCategorySlug.length > 0;
  const cameFromHero = !isPrefilled && initialDescription.trim().length >= 15;

  const [form, setForm] = useState<FormState>({
    title: initialTitle,
    description: initialDescription,
    categoryIds: [],
    location: initialLocation,
    budget: "",
    deadline: "",
    attachmentUrls: [],
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    honeypot: "",
  });

  const [categoryGroups, setCategoryGroups] = useState<ServiceCategoryGroup[]>([]);
  // Slugs returned by AI before categoryGroups loaded; resolved to IDs once
  // the picker options arrive. Seeded from the URL `?category=` slug so landing
  // pages can pre-pick the category once options load.
  const [pendingAiCategorySlugs, setPendingAiCategorySlugs] = useState<string[]>(
    initialCategorySlug ? [initialCategorySlug] : [],
  );
  const [aiFields, setAiFields] = useState<Set<AiField>>(new Set());
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [aiStatus, setAiStatus] = useState<AiStatus>(cameFromHero ? "running" : "idle");
  const [aiError, setAiError] = useState<string | null>(null);

  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [accountPhone, setAccountPhone] = useState("");
  const [accountPhoneVerifiedAt, setAccountPhoneVerifiedAt] = useState<string | null>(null);

  const [attemptedPublish, setAttemptedPublish] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [contactsEditorOpen, setContactsEditorOpen] = useState(false);

  const isLoggedIn = sessionStatus === "authenticated" && !!session?.user;

  // Photo upload hook drives both the dropzone and the file picker button.
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

  // ── Category resolution maps ──
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

  const resolveCategorySlug = useCallback(
    (slug: string | undefined): string => {
      if (!slug) return "";
      return categoryIdBySlug.get(slug) ?? "";
    },
    [categoryIdBySlug],
  );

  // ── Field setters that strip the "from AI" mark when user edits ──
  function setField<K extends keyof FormState>(key: K, value: FormState[K], field?: AiField) {
    setForm((f) => ({ ...f, [key]: value }));
    if (field) {
      setAiFields((current) => {
        if (!current.has(field)) return current;
        const next = new Set(current);
        next.delete(field);
        return next;
      });
    }
  }

  // Persist the listing across OAuth redirects. The draft schema still stores
  // a single categoryId — we keep the first picked category so the OAuth
  // round-trip doesn't drop the user back to an empty chip. Secondary
  // categories (rarely added before sign-in) are not preserved.
  const persistDraft = useCallback(() => {
    saveListingDraft({
      title: form.title,
      description: form.description,
      agentRawText: initialDescription,
      categoryId: form.categoryIds[0] ?? "",
      location: form.location,
      budget: form.budget,
      deadline: form.deadline,
      attachmentUrls: form.attachmentUrls,
      clientName: form.clientName,
      clientEmail: form.clientEmail,
      clientPhone: form.clientPhone,
    });
  }, [form, initialDescription]);

  // ── Fallback: ask category-suggestions for best-guess slugs when AI improve
  // returns an empty categories array. Fills the chip with the single top
  // suggestion (we don't auto-add 2-3 fallback categories — the fallback path
  // already means the prompt is ambiguous, so the user picks more by hand).
  const fillCategoryFromSuggestions = useCallback(
    async (text: string, title: string) => {
      try {
        const res = await fetch("/api/category-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "request",
            text,
            title: title || undefined,
            limit: 3,
          }),
        });
        if (!res.ok) return;
        const data = (await res.json().catch(() => null)) as
          | { success?: boolean; data?: { suggestions?: Array<{ slug?: string }> } }
          | null;
        const topSlug = data?.data?.suggestions?.[0]?.slug;
        if (!topSlug) return;
        const resolved = resolveCategorySlug(topSlug);
        if (resolved) {
          setForm((current) =>
            current.categoryIds.length > 0
              ? current
              : { ...current, categoryIds: [resolved] },
          );
          setAiFields((prev) => {
            const next = new Set(prev);
            next.add("category");
            return next;
          });
        } else {
          setPendingAiCategorySlugs([topSlug]);
        }
      } catch {
        // Silent fallback — user can still pick a category by hand.
      }
    },
    [resolveCategorySlug],
  );

  // ── Run the AI improve call and apply its result ──
  const runAiImprove = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length < 15) return;
      setAiStatus("running");
      setAiError(null);
      try {
        const res = await fetch("/api/requests/improve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: trimmed }),
        });
        const data = (await res.json().catch(() => null)) as
          | {
              success?: boolean;
              error?: string;
              data?: {
                improvedDescription?: string;
                title?: string;
                categories?: string[];
                category?: string;
                location?: string;
                budget?: string;
                deadline?: string;
                recommendations?: AiSuggestion[];
              };
            }
          | null;
        if (!res.ok || !data?.success || !data.data?.improvedDescription) {
          setAiError(data?.error || "AI nepavyko apdoroti aprašymo. Užpildyk laukus pats.");
          setAiStatus("error");
          return;
        }
        const result = data.data;

        // Prefer the new categories[] array; fall back to legacy single field.
        const aiSlugs: string[] = (() => {
          if (Array.isArray(result.categories) && result.categories.length > 0) {
            return result.categories;
          }
          return result.category ? [result.category] : [];
        })();
        const resolvedIds: string[] = [];
        const unresolvedSlugs: string[] = [];
        for (const slug of aiSlugs) {
          const id = resolveCategorySlug(slug);
          if (id && !resolvedIds.includes(id)) resolvedIds.push(id);
          else if (!id) unresolvedSlugs.push(slug);
        }

        const filled = new Set<AiField>();
        if (result.improvedDescription) filled.add("description");
        if (result.title) filled.add("title");
        if (result.location) filled.add("location");
        if (result.budget) filled.add("budget");
        if (result.deadline) filled.add("deadline");
        if (resolvedIds.length > 0) filled.add("category");

        setForm((current) => ({
          ...current,
          description: result.improvedDescription || current.description,
          title: result.title || current.title,
          location: result.location || current.location,
          budget: result.budget || current.budget,
          deadline: result.deadline || current.deadline,
          categoryIds:
            resolvedIds.length > 0 ? resolvedIds.slice(0, MAX_CATEGORIES) : current.categoryIds,
        }));
        setAiFields(filled);
        setAiSuggestions(
          Array.isArray(result.recommendations)
            ? result.recommendations
                .filter(
                  (item): item is AiSuggestion =>
                    !!item &&
                    typeof item.prompt === "string" &&
                    typeof item.field === "string" &&
                    typeof item.yesAnswer === "string" &&
                    typeof item.noAnswer === "string" &&
                    item.prompt.trim().length > 0 &&
                    item.field.trim().length > 0 &&
                    item.yesAnswer.trim().length > 0 &&
                    item.noAnswer.trim().length > 0,
                )
                .slice(0, 3)
            : [],
        );
        setAiStatus("done");

        if (unresolvedSlugs.length > 0 && resolvedIds.length === 0) {
          // AI returned slugs but categories haven't loaded yet — defer all.
          setPendingAiCategorySlugs(unresolvedSlugs);
        }
        if (aiSlugs.length === 0) {
          // AI couldn't match any curated category from the improve flow; try
          // the dedicated suggestion endpoint for a best-guess fallback.
          await fillCategoryFromSuggestions(
            result.improvedDescription ?? trimmed,
            result.title ?? "",
          );
        }
      } catch {
        setAiError("Tinklo klaida. Bandyk dar kartą arba užpildyk pats.");
        setAiStatus("error");
      }
    },
    [resolveCategorySlug, fillCategoryFromSuggestions],
  );

  // ── Effects ──

  // Pre-fill name + email for logged-in users.
  useEffect(() => {
    if (sessionStatus !== "authenticated" || !session?.user) return;
    const user = session.user;
    setForm((f) => ({
      ...f,
      clientName: f.clientName || user.name || "",
      clientEmail: user.email || f.clientEmail,
    }));
  }, [sessionStatus, session?.user]);

  // Fetch account phone (NextAuth session doesn't carry profile fields).
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
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
        setForm((current) => ({
          ...current,
          clientPhone: current.clientPhone || nextAccountPhone,
        }));
      } catch {
        // Phone can still be entered manually.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionStatus]);

  useEffect(() => {
    if (!isLoggedIn || !accountPhone) {
      setPhoneVerified(false);
      return;
    }
    const verified =
      !!accountPhoneVerifiedAt && form.clientPhone.trim() === accountPhone;
    setPhoneVerified(verified);
  }, [isLoggedIn, accountPhone, accountPhoneVerifiedAt, form.clientPhone]);

  // Load curated categories.
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
        // Picker will stay empty; user must reload to retry.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Resolve the AI's pending category slugs once the picker options are loaded.
  useEffect(() => {
    if (pendingAiCategorySlugs.length === 0 || categoryGroups.length === 0) return;
    const ids: string[] = [];
    for (const slug of pendingAiCategorySlugs) {
      const id = resolveCategorySlug(slug);
      if (id && !ids.includes(id)) ids.push(id);
    }
    if (ids.length > 0) {
      setForm((f) =>
        f.categoryIds.length > 0
          ? f
          : { ...f, categoryIds: ids.slice(0, MAX_CATEGORIES) },
      );
      setAiFields((current) => {
        const next = new Set(current);
        next.add("category");
        return next;
      });
    }
    setPendingAiCategorySlugs([]);
  }, [pendingAiCategorySlugs, categoryGroups, resolveCategorySlug]);

  // Restore the listing after Google OAuth round-trip.
  useEffect(() => {
    const restored = searchParams.get("restored") === "1";
    if (!restored) return;
    const draft = loadListingDraft();
    if (draft) {
      setForm((f) => {
        const next = { ...f };
        if (draft.title) next.title = draft.title;
        if (draft.description) next.description = draft.description;
        if (draft.categoryId) next.categoryIds = [draft.categoryId];
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save the form when coming from hero search.
  useEffect(() => {
    if (!cameFromHero) return;
    const timer = setTimeout(() => {
      if (form.description.trim().length > 0) {
        persistDraft();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [form.description, cameFromHero, persistDraft]);

  // First-paint AI run when arriving from the hero.
  useEffect(() => {
    if (!cameFromHero) return;
    void runAiImprove(initialDescription);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Suggestion → description append ──
  // User picks TAIP or NE on an AI recommendation; we append the matching
  // pre-written answer to the description so they don't have to type anything.
  function handleAnswerSuggestion(
    suggestion: AiSuggestion,
    choice: AiSuggestionChoice,
  ) {
    const answer = choice === "yes" ? suggestion.yesAnswer : suggestion.noAnswer;
    setForm((f) => {
      const sep = f.description.length === 0 || f.description.endsWith("\n") ? "" : "\n";
      return { ...f, description: `${f.description}${sep}- ${answer}` };
    });
    setAiFields((current) => {
      if (!current.has("description")) return current;
      const next = new Set(current);
      next.delete("description");
      return next;
    });
  }

  // ── Validation ──
  const titleOk = form.title.trim().length >= 5;
  const descOk = form.description.trim().length >= 20;
  const categoryOk = form.categoryIds.length > 0;
  const nameOk = form.clientName.trim().length >= 2;
  const phoneOk = form.clientPhone.trim().length >= 6;
  const emailOk = emailVerified || isLoggedIn;
  const hasContact = emailOk || phoneOk;

  const listingComplete = titleOk && descOk && categoryOk;
  const contactsComplete = isLoggedIn && nameOk && hasContact;
  const showContactsEditor = contactsEditorOpen || !contactsComplete;

  const ready = listingComplete && nameOk && hasContact;
  const showErrors = attemptedPublish;

  const publishHint = (() => {
    const gaps: string[] = [];
    if (!titleOk) gaps.push("pavadinimą");
    if (!descOk) gaps.push("aprašymą");
    if (!categoryOk) gaps.push("kategoriją");
    if (!nameOk) gaps.push("vardą");
    if (!hasContact) gaps.push("el. pašto arba telefono");
    if (gaps.length > 0) return `Dar reikia: ${gaps.join(", ")}`;
    return "";
  })();

  async function handlePublish() {
    setAttemptedPublish(true);
    if (!ready || publishing) return;
    setPublishing(true);
    setPublishError("");
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
        setPublishError(data?.error || "Nepavyko paskelbti skelbimo");
        setPublishing(false);
      }
    } catch {
      setPublishError("Nepavyko paskelbti. Bandyk dar kartą.");
      setPublishing(false);
    }
  }

  if (sessionStatus === "loading") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <LoadingSpinner />
      </div>
    );
  }

  const selectedCategories = form.categoryIds.map((id) => ({
    id,
    label: categoryNameById.get(id) || "",
  }));
  const aiIsRunning = aiStatus === "running";

  function addCategoryId(id: string) {
    if (!id) return;
    setForm((current) => {
      if (current.categoryIds.includes(id)) return current;
      if (current.categoryIds.length >= MAX_CATEGORIES) return current;
      return { ...current, categoryIds: [...current.categoryIds, id] };
    });
    setAiFields((prev) => {
      if (!prev.has("category")) return prev;
      const next = new Set(prev);
      next.delete("category");
      return next;
    });
  }

  function removeCategoryId(id: string) {
    setForm((current) => ({
      ...current,
      categoryIds: current.categoryIds.filter((existing) => existing !== id),
    }));
    setAiFields((prev) => {
      if (!prev.has("category")) return prev;
      const next = new Set(prev);
      next.delete("category");
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">
        Tavo skelbimas
      </h1>
      <p className="mt-1 text-body-sm text-surface-500 dark:text-surface-400">
        {aiIsRunning
          ? "AI ruošia tvarkingą versiją. Iškart galėsi pakoreguoti ir paskelbti."
          : "Patikrink, paredaguok ir paskelbk."}
      </p>

      {aiStatus === "error" && aiError && (
        <div className="mt-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-body-sm text-amber-800 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{aiError} Užpildyk laukus rankiniu būdu.</span>
        </div>
      )}

      {aiIsRunning && <AiProcessingSkeleton />}

      {!aiIsRunning && (
        <>
          {aiSuggestions.length > 0 && (
            <AiSuggestionsStrip
              suggestions={aiSuggestions}
              onAnswer={handleAnswerSuggestion}
            />
          )}

          <div className="mt-6">
            <InlineListingCard
              title={form.title}
              onTitleChange={(value) => setField("title", value, "title")}
              description={form.description}
              onDescriptionChange={(value) => setField("description", value, "description")}
              attachmentUrls={form.attachmentUrls}
              onRemovePhoto={removePhoto}
              onUploadFiles={uploadPhotos}
              photosUploading={photosUploading}
              photoError={photoError ?? undefined}
              photoDragOver={photoDragOver}
              dropHandlers={photoDropHandlers}
              selectedCategories={selectedCategories}
              maxCategories={MAX_CATEGORIES}
              categoryGroups={categoryGroups}
              categoryFromAi={aiFields.has("category")}
              onAddCategory={addCategoryId}
              onRemoveCategory={removeCategoryId}
              location={form.location}
              locationFromAi={aiFields.has("location")}
              onLocationChange={(value) => setField("location", value, "location")}
              budget={form.budget}
              budgetFromAi={aiFields.has("budget")}
              onBudgetChange={(value) => setField("budget", value, "budget")}
              deadline={form.deadline}
              deadlineFromAi={aiFields.has("deadline")}
              onDeadlineChange={(value) => setField("deadline", value, "deadline")}
              titleError={showErrors && !titleOk ? "Bent 5 simboliai" : undefined}
              descriptionError={
                showErrors && !descOk ? "Bent 20 simbolių" : undefined
              }
              showCategoryError={showErrors && !categoryOk}
              onTriggerAi={() => void runAiImprove(form.description)}
              aiRunning={aiIsRunning}
            />
          </div>
        </>
      )}

      {/* ── Contacts (same pattern as v1) ── */}
      {!showContactsEditor ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-surface-200/60 bg-white px-5 py-4 shadow-card dark:border-surface-700/50 dark:bg-surface-900/50">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="flex items-center gap-1.5 text-body-sm font-medium text-emerald-700 dark:text-emerald-400">
              <Check className="h-4 w-4 shrink-0" /> Kontaktai paruošti
            </span>
            {form.clientPhone.trim() ? (
              <span className="text-micro text-surface-500 dark:text-surface-400">
                Telefonas: {form.clientPhone}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-micro text-surface-500 dark:text-surface-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                Telefonas nepridėtas
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
        <div className="mt-6 rounded-2xl border border-surface-200/60 bg-white p-6 shadow-card dark:border-surface-700/50 dark:bg-surface-900/50">
          <h2 className="mb-4 text-body-sm font-semibold text-surface-900 dark:text-white">
            Kontaktai
          </h2>
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
                  <PhoneVerification
                    phone={form.clientPhone}
                    onPhoneChange={(value) => setField("clientPhone", value)}
                    verified={phoneVerified}
                    onVerifiedChange={setPhoneVerified}
                    onVerified={(verifiedPhone, verifiedAt) => {
                      setAccountPhone(verifiedPhone);
                      setAccountPhoneVerifiedAt(verifiedAt);
                    }}
                    helper="Telefonas neprivalomas."
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
              onChange={(e) => setField("clientName", e.target.value)}
              error={showErrors && !nameOk ? "Bent 2 simboliai" : undefined}
            />
            {!isLoggedIn && (
              <EmailVerification
                email={form.clientEmail}
                onEmailChange={(value) => setField("clientEmail", value)}
                verified={emailVerified}
                onVerifiedChange={setEmailVerified}
              />
            )}
            {isLoggedIn && (
              <PhoneVerification
                phone={form.clientPhone}
                onPhoneChange={(value) => setField("clientPhone", value)}
                verified={phoneVerified}
                onVerifiedChange={setPhoneVerified}
                onVerified={(verifiedPhone, verifiedAt) => {
                  setAccountPhone(verifiedPhone);
                  setAccountPhoneVerifiedAt(verifiedAt);
                }}
                helper="Telefonas neprivalomas."
                error={showErrors && !hasContact ? "Įvesk telefoną" : undefined}
              />
            )}
            <input
              type="text"
              name="website_url"
              value={form.honeypot}
              onChange={(e) => setField("honeypot", e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="pointer-events-none absolute -left-[9999px] -top-[9999px] h-0 w-0 opacity-0"
            />
          </div>
        </div>
      )}

      {publishError && (
        <div className="mt-4 rounded-xl bg-red-50 p-3 text-body-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {publishError}
        </div>
      )}

      <div className="mt-6">
        <Button
          type="button"
          size="lg"
          variant={ready ? "primary" : "secondary"}
          className="w-full"
          onClick={handlePublish}
          isLoading={publishing}
          disabled={aiIsRunning}
        >
          {!publishing &&
            (aiIsRunning ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />)}
          {aiIsRunning ? "AI dirba…" : "Paskelbti skelbimą"}
        </Button>
        {!publishing && publishHint && !aiIsRunning && (
          <p className="mt-2 text-center text-micro text-surface-400">{publishHint}</p>
        )}
        <p className="mt-3 text-center text-micro text-surface-400">
          Paskelbus, skelbimą iškart matys tiekėjai ir netrukus gausi pasiūlymų.
        </p>
      </div>
    </div>
  );
}
