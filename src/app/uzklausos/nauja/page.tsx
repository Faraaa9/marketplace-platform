"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, ArrowRight, Check, Sparkles } from "lucide-react";
import { SERVICE_CATEGORIES, LITHUANIAN_CITIES } from "@/lib/constants";
import { saveGuestRequest } from "@/lib/guest-request";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmailVerification from "@/components/requests/EmailVerification";
import ListingPreview from "@/components/requests/ListingPreview";
import PhotoUpload from "@/components/requests/PhotoUpload";
import ImproveDescriptionButton from "@/components/ai/ImproveDescriptionButton";

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
  category: string;
  location: string;
  budget: string;
  deadline: string;
  attachmentUrls: string[];
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  honeypot: string;
}

function NewRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const initialDescription = (searchParams.get("description") || "").slice(0, 2000);
  const cameFromHero = initialDescription.trim().length >= 15;

  const [form, setForm] = useState<FormState>({
    title: "",
    description: initialDescription,
    category: "",
    location: "",
    budget: "",
    deadline: "",
    attachmentUrls: [],
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    honeypot: "",
  });
  const [aiLoading, setAiLoading] = useState(cameFromHero);
  const [aiFailed, setAiFailed] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [attemptedPublish, setAttemptedPublish] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  const isLoggedIn = status === "authenticated" && !!session?.user;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Pre-fill name + email for logged-in users.
  useEffect(() => {
    const user = session?.user;
    if (status === "authenticated" && user) {
      setForm((f) => ({
        ...f,
        clientName: f.clientName || user.name || "",
        clientEmail: user.email || f.clientEmail,
      }));
    }
  }, [status, session]);

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
            category: d.category || f.category,
            location: d.location || f.location,
            budget: d.budget || f.budget,
            deadline: d.deadline || f.deadline,
          }));
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

  // ── Validation ──
  const titleOk = form.title.trim().length >= 5;
  const descOk = form.description.trim().length >= 20;
  const nameOk = form.clientName.trim().length >= 2;

  const missingListing: string[] = [];
  if (!titleOk) missingListing.push("pavadinimą");
  if (!descOk) missingListing.push("aprašymą");
  if (!form.category) missingListing.push("kategoriją");
  if (!form.location.trim()) missingListing.push("miestą");
  if (!form.budget.trim()) missingListing.push("biudžetą");
  if (!form.deadline.trim()) missingListing.push("terminą");

  const emailOk = emailVerified || isLoggedIn;
  const ready = missingListing.length === 0 && nameOk && emailOk;

  const publishHint = (() => {
    const gaps = [...missingListing];
    if (!nameOk) gaps.push("vardą");
    if (gaps.length > 0) return `Dar reikia užpildyti: ${gaps.join(", ")}`;
    if (!emailOk) return "Patvirtink el. paštą, kad galėtum paskelbti";
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

  const categoryLabel = SERVICE_CATEGORIES.find((c) => c.value === form.category)?.label;

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
      />

      {/* ── Complete & fix ── */}
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
            <Textarea
              id="description"
              label="Aprašymas"
              placeholder="Aprašyk, ko reikia — ką padaryti, mastai, medžiagos..."
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              autoResize
              error={showErrors && !descOk ? "Bent 20 simbolių" : undefined}
            />
            <ImproveDescriptionButton
              value={form.description}
              onChange={(value) => update("description", value)}
              onMeta={(meta) =>
                setForm((prev) => ({
                  ...prev,
                  category: prev.category || meta.category,
                  title: prev.title || meta.title,
                  location: prev.location || meta.location,
                }))
              }
              targetId="description"
              category={categoryLabel}
              title={form.title}
              tone="form"
              className="mt-2"
            />
          </div>
          <div>
            <p className="mb-2 text-body-sm font-medium text-surface-700 dark:text-surface-300">
              Nuotraukos <span className="font-normal text-surface-400">(neprivaloma)</span>
            </p>
            <PhotoUpload
              value={form.attachmentUrls}
              onChange={(urls) => update("attachmentUrls", urls)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="category"
              label="Kategorija"
              options={SERVICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
              placeholder="Pasirink kategoriją"
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              error={showErrors && !form.category ? "Privaloma" : undefined}
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

      {/* ── Contacts ── */}
      <div className="mt-4 rounded-2xl border border-surface-200/60 bg-white p-6 shadow-card dark:border-surface-700/50 dark:bg-surface-900/50">
        <h2 className="mb-4 text-body-sm font-semibold text-surface-900 dark:text-white">Kontaktai</h2>
        <div className="space-y-4">
          <Input
            id="clientName"
            label="Tavo vardas"
            placeholder="Jonas"
            value={form.clientName}
            onChange={(e) => update("clientName", e.target.value)}
            error={showErrors && !nameOk ? "Bent 2 simboliai" : undefined}
          />
          <EmailVerification
            email={form.clientEmail}
            onEmailChange={(v) => update("clientEmail", v)}
            verified={emailVerified}
            onVerifiedChange={setEmailVerified}
            accountLocked={isLoggedIn}
          />
          <Input
            id="clientPhone"
            label="Telefonas (neprivaloma)"
            type="tel"
            placeholder="+370..."
            value={form.clientPhone}
            onChange={(e) => update("clientPhone", e.target.value)}
          />
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
