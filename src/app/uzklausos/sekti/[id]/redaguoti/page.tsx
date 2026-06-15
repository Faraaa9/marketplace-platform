"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { LITHUANIAN_CITIES } from "@/lib/constants";
import type { ServiceCategoryGroup } from "@/lib/service-categories";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import ListingPreview from "@/components/requests/ListingPreview";
import PhotoUpload from "@/components/requests/PhotoUpload";
import CategorySelect from "@/components/requests/CategorySelect";
import ImproveDescriptionButton from "@/components/ai/ImproveDescriptionButton";

interface FormState {
  title: string;
  description: string;
  /** The primary category shown in the picker. */
  categoryId: string;
  /** Secondary categories (sortOrder 1+). The edit form doesn't let users
   *  modify these — they are preserved on save so multi-category requests
   *  don't silently lose their extra categories. */
  secondaryCategoryIds: string[];
  /** Display names for all categories (primary + secondaries), for the
   *  informational hint shown to the user. */
  allCategoryNames: string[];
  location: string;
  budget: string;
  deadline: string;
  attachmentUrls: string[];
  clientName: string;
}

export default function EditRequestPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.id as string;

  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    categoryId: "",
    secondaryCategoryIds: [],
    allCategoryNames: [],
    location: "",
    budget: "",
    deadline: "",
    attachmentUrls: [],
    clientName: "",
  });
  const [categoryGroups, setCategoryGroups] = useState<ServiceCategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState("");
  const [responseCount, setResponseCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/requests/${token}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.success) {
          const d = data.data;
          // Preserve multi-category info from the GET response so save doesn't
          // drop secondary categories. The primary stays editable via the
          // single picker; secondaries pass through untouched.
          const incomingIds: string[] = Array.isArray(d.categoryIds) && d.categoryIds.length > 0
            ? d.categoryIds
            : d.categoryId
              ? [d.categoryId]
              : [];
          const incomingNames: string[] = Array.isArray(d.categoryNames) && d.categoryNames.length > 0
            ? d.categoryNames
            : d.category
              ? [d.category]
              : [];
          setForm({
            title: d.title || "",
            description: d.description || "",
            categoryId: incomingIds[0] ?? "",
            secondaryCategoryIds: incomingIds.slice(1),
            allCategoryNames: incomingNames,
            location: d.location || "",
            budget: d.budget || "",
            deadline: d.deadline || "",
            attachmentUrls: d.attachmentUrls || [],
            clientName: d.clientName || "",
          });
          setStatus(d.status);
          setResponseCount(d.responses?.length || 0);
        } else {
          setLoadError(data.error || "Užklausa nerasta");
        }
      } catch {
        if (!cancelled) setLoadError("Klaida gaunant užklausą");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

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
        // Picker stays empty — categoryId is still validated as required.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const target = window.location.hash.replace("#", "");
    if (!target) return;
    const element = document.getElementById(target);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    ) {
      element.focus({ preventScroll: true });
    }
  }, [loading]);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of categoryGroups) {
      for (const cat of group.categories) map.set(cat.id, cat.name);
    }
    return map;
  }, [categoryGroups]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const titleOk = form.title.trim().length >= 5;
  const descOk = form.description.trim().length >= 20;
  const nameOk = form.clientName.trim().length >= 2;
  const ready =
    titleOk &&
    descOk &&
    nameOk &&
    !!form.categoryId &&
    !!form.location.trim() &&
    !!form.budget.trim() &&
    !!form.deadline.trim();

  async function handleSave() {
    setAttempted(true);
    if (!ready || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const { categoryId, secondaryCategoryIds, allCategoryNames: _names, ...rest } = form;
      void _names;
      // Preserve any pre-existing secondary categories on save — the single
      // picker only edits the primary. Dedupe in case the user picked one
      // that was already a secondary.
      const seen = new Set<string>();
      const categoryIds: string[] = [];
      for (const id of [categoryId, ...secondaryCategoryIds]) {
        if (!id || seen.has(id)) continue;
        seen.add(id);
        categoryIds.push(id);
      }
      const res = await fetch(`/api/tracking/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rest, categoryIds }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        router.push(`/uzklausos/sekti/${token}`);
      } else {
        setSaveError(data?.error || "Nepavyko išsaugoti pakeitimų");
        setSaving(false);
      }
    } catch {
      setSaveError("Nepavyko išsaugoti. Bandykite dar kartą.");
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <EmptyState title="Užklausa nerasta" description={loadError} />
      </div>
    );
  }

  if (status !== "OPEN") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <EmptyState
          title="Užklausos redaguoti nebegalima"
          description="Redaguoti galima tik atidarytą užklausą — ši jau vykdoma arba uždaryta."
        />
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" onClick={() => router.push(`/uzklausos/sekti/${token}`)}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Grįžti į užklausą
          </Button>
        </div>
      </div>
    );
  }

  const categoryLabel = form.categoryId ? categoryNameById.get(form.categoryId) : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href={`/uzklausos/sekti/${token}`}
        className="inline-flex items-center gap-1.5 text-body-sm text-surface-500 transition-colors hover:text-surface-700 dark:hover:text-surface-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Grįžti į užklausą
      </Link>

      <h1 className="mt-3 text-heading-1 font-bold text-surface-900 dark:text-white">Redaguoti užklausą</h1>
      <p className="mt-1 text-body-sm text-surface-500 dark:text-surface-400">
        Pakeitimus iškart matys tiekėjai.
      </p>

      <ListingPreview
        className="mt-6"
        title={form.title}
        description={form.description}
        categoryLabel={categoryLabel}
        location={form.location}
        budget={form.budget}
        deadline={form.deadline}
        showNewBadge={false}
        responseCount={responseCount}
      />

      <div className="mt-8 rounded-2xl border border-surface-200/60 bg-white p-6 shadow-card dark:border-surface-700/50 dark:bg-surface-900/50">
        <div className="space-y-4">
          <Input
            id="title"
            label="Pavadinimas"
            placeholder="Pvz. Vonios kambario remontas"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            error={attempted && !titleOk ? "Bent 5 simboliai" : undefined}
          />
          <div>
            <Textarea
              id="description"
              label="Aprašymas"
              placeholder="Aprašyk, ko reikia — ką padaryti, mastai, medžiagos..."
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              autoResize
              error={attempted && !descOk ? "Bent 20 simbolių" : undefined}
            />
            <ImproveDescriptionButton
              value={form.description}
              onChange={(value) => update("description", value)}
              targetId="description"
              category={categoryLabel}
              title={form.title}
              tone="form"
              className="mt-2"
            />
          </div>
          <div id="photos">
            <p className="mb-2 text-body-sm font-medium text-surface-700 dark:text-surface-300">
              Nuotraukos <span className="font-normal text-surface-400">(neprivaloma)</span>
            </p>
            <PhotoUpload
              value={form.attachmentUrls}
              onChange={(urls) => update("attachmentUrls", urls)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div id="category">
              <CategorySelect
                id="categoryId"
                label="Kategorija"
                groups={categoryGroups}
                value={form.categoryId}
                onChange={(v) => update("categoryId", v)}
                error={attempted && !form.categoryId ? "Privaloma" : undefined}
              />
              {form.secondaryCategoryIds.length > 0 && (
                <p className="mt-1.5 text-micro text-surface-500 dark:text-surface-400">
                  Skelbimas turi {form.secondaryCategoryIds.length + 1} kategorijas:{" "}
                  <span className="font-medium text-surface-700 dark:text-surface-200">
                    {form.allCategoryNames.join(", ")}
                  </span>
                  . Papildomos kategorijos išsaugomos automatiškai.
                </p>
              )}
            </div>
            <Input
              id="location"
              label="Miestas ar vietovė"
              placeholder="Pvz. Trakai"
              value={form.location}
              onChange={(e) => update("location", e.target.value)}
              list="city-suggestions"
              autoComplete="off"
              error={attempted && !form.location.trim() ? "Privaloma" : undefined}
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
              error={attempted && !form.budget.trim() ? "Privaloma" : undefined}
            />
            <Input
              id="deadline"
              label="Terminas"
              placeholder="Pvz. iki gegužės pabaigos"
              value={form.deadline}
              onChange={(e) => update("deadline", e.target.value)}
              error={attempted && !form.deadline.trim() ? "Privaloma" : undefined}
            />
          </div>
          <Input
            id="clientName"
            label="Tavo vardas"
            placeholder="Jonas"
            value={form.clientName}
            onChange={(e) => update("clientName", e.target.value)}
            error={attempted && !nameOk ? "Bent 2 simboliai" : undefined}
          />
        </div>
      </div>

      {saveError && (
        <div className="mt-4 rounded-xl bg-red-50 p-3 text-body-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {saveError}
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => router.push(`/uzklausos/sekti/${token}`)}
        >
          Atšaukti
        </Button>
        <Button
          type="button"
          variant="primary"
          className="w-full sm:w-auto"
          onClick={handleSave}
          isLoading={saving}
        >
          {!saving && <Save className="h-4 w-4" />}
          Išsaugoti pakeitimus
        </Button>
      </div>
    </div>
  );
}
