"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { SERVICE_CATEGORIES, LITHUANIAN_CITIES } from "@/lib/constants";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Save, Check, X, ImageIcon, Camera, MapPin, Wrench, Euro, Clock, FileCheck, Zap, User, CheckCircle2, Mail, Eye, Sparkles } from "lucide-react";

interface ProviderImage {
  url: string;
  publicId: string;
}

export default function ProviderProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [images, setImages] = useState<ProviderImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Story state (read-only — management moved to dashboard)
  const [stories, setStories] = useState<{ id: string }[]>([]);
  const [storyEnabled, setStoryEnabled] = useState(true);

  const [account, setAccount] = useState<{
    userName: string | null;
    userEmail: string | null;
    emailVerified: boolean;
    isActive: boolean;
    userId: string | null;
  }>({ userName: null, userEmail: null, emailVerified: false, isActive: false, userId: null });
  const [form, setForm] = useState({
    description: "",
    headline: "",
    services: "",
    priceFrom: null as number | null,
    experienceYears: null as number | null,
    offersInvoices: false,
    availableForUrgent: false,
    specializations: [] as string[],
    location: "",
    phone: "",
    website: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/tiekejas/profilis").then((r) => r.json()),
      fetch("/api/provider/stories").then((r) => r.json()),
    ])
      .then(([profileData, storiesData]) => {
        if (profileData.success && profileData.data) {
          setForm({
            description: profileData.data.description || "",
            headline: profileData.data.headline || "",
            services: profileData.data.services || "",
            priceFrom: profileData.data.priceFrom ?? null,
            experienceYears: profileData.data.experienceYears ?? null,
            offersInvoices: profileData.data.offersInvoices ?? false,
            availableForUrgent: profileData.data.availableForUrgent ?? false,
            specializations: profileData.data.specializations || [],
            location: profileData.data.location || "",
            phone: profileData.data.phone || "",
            website: profileData.data.website || "",
          });
          setImages(Array.isArray(profileData.data.images) ? profileData.data.images : []);
          setAccount({
            userName: profileData.data.userName || null,
            userEmail: profileData.data.userEmail || null,
            emailVerified: profileData.data.emailVerified ?? false,
            isActive: profileData.data.isActive ?? false,
            userId: profileData.data.userId || null,
          });
        }
        if (storiesData.success) {
          setStories(storiesData.data || []);
          if (storiesData.disabled) setStoryEnabled(false);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/tiekejas/profilis", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(data.error || "Klaida");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      setError("Klaida išsaugant");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  function toggleSpecialization(value: string) {
    setForm((prev) => ({
      ...prev,
      specializations: prev.specializations.includes(value)
        ? prev.specializations.filter((s) => s !== value)
        : [...prev.specializations, value],
    }));
  }

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Leidžiami tik paveikslėliai");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Failas per didelis (max 5MB)");
      return;
    }
    if (images.length >= 5) {
      setError("Maksimalus nuotraukų skaičius — 5");
      return;
    }

    setUploading(true);
    setUploadProgress(30);
    setError("");

    try {
      const formData = new FormData();
      formData.append("image", file);

      setUploadProgress(60);
      const res = await fetch("/api/provider/upload-image", {
        method: "POST",
        body: formData,
      });
      setUploadProgress(90);

      const data = await res.json();
      if (data.success) {
        setImages((prev) => [...prev, { url: data.data.url, publicId: data.data.publicId }]);
        setUploadProgress(100);
      } else {
        setError(data.error || "Nepavyko įkelti");
      }
    } catch {
      setError("Nepavyko įkelti nuotraukos");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  async function handleDeleteImage(publicId: string) {
    setDeletingId(publicId);
    try {
      const res = await fetch(`/api/provider/images/${encodeURIComponent(publicId)}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setImages((prev) => prev.filter((img) => img.publicId !== publicId));
      } else {
        setError(data.error || "Nepavyko ištrinti nuotraukos");
      }
    } catch {
      setError("Nepavyko ištrinti nuotraukos");
    } finally {
      setDeletingId(null);
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  // Profile completeness — mirrors stats API logic
  const completeness = useMemo(() => {
    const items = [
      { done: !!(form.description && form.description.length >= 20), label: "Aprašymas" },
      { done: !!form.headline, label: "Antraštė" },
      { done: form.specializations.length > 0, label: "Specializacijos" },
      { done: !!form.services, label: "Paslaugos" },
      { done: !!form.location, label: "Aptarnavimo zona" },
      { done: !!form.phone, label: "Telefonas" },
      { done: images.length > 0, label: "Nuotraukos" },
    ];
    const doneCount = items.filter((i) => i.done).length;
    const percent = Math.round((doneCount / items.length) * 100);
    const missing = items.filter((i) => !i.done).map((i) => i.label);
    return { percent, missing, isComplete: percent === 100 };
  }, [form.description, form.headline, form.specializations, form.services, form.location, form.phone, images.length]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-10 pb-24">
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white mb-1">Profilio redagavimas</h1>
      <p className="text-body-sm text-surface-500 dark:text-surface-400 mb-5">
        Užpildykite profilį — klientai matys jūsų informaciją prieš kreipdamiesi.
      </p>

      {/* Profile completeness + Account — combined compact header */}
      <div className="mb-5 rounded-2xl border border-surface-200/60 bg-white p-4 dark:border-surface-700/50 dark:bg-surface-900/50">
        {/* Completeness */}
        <div className="flex items-center justify-between mb-2">
          <p className="text-body-sm font-medium text-surface-700 dark:text-surface-300">
            {completeness.isComplete ? "Profilis užpildytas" : "Profilio užpildymas"}
          </p>
          <span className={`text-body-sm font-bold ${completeness.isComplete ? "text-emerald-600 dark:text-emerald-400" : "text-surface-900 dark:text-white"}`}>
            {completeness.percent}%
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              completeness.isComplete
                ? "bg-emerald-500"
                : completeness.percent >= 70
                  ? "bg-brand-500"
                  : "bg-amber-500"
            }`}
            style={{ width: `${completeness.percent}%` }}
          />
        </div>
        {completeness.missing.length > 0 && (
          <p className="mt-2 text-micro text-surface-400">
            Trūksta: {completeness.missing.join(", ")}
          </p>
        )}

        {/* Account status — separator + compact row */}
        <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-800">
          <div className="flex items-center gap-2 flex-wrap">
            {account.userEmail && (
              <span className="text-micro text-surface-400 truncate max-w-[200px]">
                {account.userEmail}
              </span>
            )}
            <span className="hidden sm:inline text-surface-200 dark:text-surface-700">·</span>
            {account.emailVerified ? (
              <span className="inline-flex items-center gap-1 text-micro font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Patvirtintas
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-micro font-medium text-amber-600 dark:text-amber-400">
                <Mail className="h-3 w-3" />
                Nepatvirtintas
              </span>
            )}
            <span className="hidden sm:inline text-surface-200 dark:text-surface-700">·</span>
            <span className={`text-micro font-medium ${account.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-surface-400"}`}>
              {account.isActive ? "Aktyvus" : "Neaktyvus"}
            </span>
            {account.userId && (
              <>
                <span className="hidden sm:inline text-surface-200 dark:text-surface-700">·</span>
                {account.isActive && account.emailVerified ? (
                  <Link
                    href={`/tiekejai/${account.userId}`}
                    className="inline-flex items-center gap-1 text-micro font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                  >
                    <Eye className="h-3 w-3" />
                    Viešas profilis
                  </Link>
                ) : (
                  <span className="text-micro text-surface-400">
                    Profilis dar nematomas klientams
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-body-sm text-red-600 dark:bg-red-500/10 dark:text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-600 ml-2 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="space-y-5">
        {/* Section 1: Basic Info */}
        <Card>
          <SectionHeader icon={<User className="h-4 w-4" />} title="Pagrindinė informacija" step={1} totalSteps={account.isActive && storyEnabled ? 5 : 4} />
          <div className="space-y-4">
            <div>
              <Input
                id="headline"
                label="Antraštė"
                placeholder="Pvz.: Santechnikos meistras su 10 metų patirtimi"
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-micro text-surface-400">Trumpas sakinys, matomas po jūsų vardu.</p>
                <span className={`text-micro tabular-nums ${form.headline.length > 100 ? "text-amber-500" : "text-surface-300"}`}>
                  {form.headline.length}/120
                </span>
              </div>
            </div>

            <div>
              <Textarea
                id="description"
                label="Aprašymas"
                placeholder="Aprašykite savo paslaugas, patirtį, privalumus..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              {form.description.length > 0 && form.description.length < 20 && (
                <p className="text-micro text-amber-500 mt-1">
                  Dar {20 - form.description.length} simb. iki minimalaus ilgio
                </p>
              )}
            </div>

            <div>
              <label className="block text-body-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                Specializacijos
              </label>
              <p className="text-micro text-surface-400 mb-2">Pasirinkite sritis, kuriose dirbate — pagal jas gausite tinkamas užklausas.</p>
              <div className="flex flex-wrap gap-2">
                {SERVICE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => toggleSpecialization(cat.value)}
                    className={`rounded-full px-3 py-1.5 text-body-sm border transition-all duration-150 ${
                      form.specializations.includes(cat.value)
                        ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                        : "border-surface-300 text-surface-700 hover:border-brand-300 hover:text-brand-600 dark:border-surface-600 dark:text-surface-300 dark:hover:border-brand-500"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              {form.specializations.length > 0 && (
                <p className="text-micro text-surface-400 mt-2">
                  Pasirinkta: {form.specializations.length}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Section 2: Services & Experience */}
        <Card>
          <SectionHeader icon={<Wrench className="h-4 w-4" />} title="Paslaugos ir patirtis" step={2} totalSteps={account.isActive && storyEnabled ? 5 : 4} />
          <div className="space-y-4">
            <Textarea
              id="services"
              label="Teikiamos paslaugos"
              placeholder="Išvardinkite konkrečias paslaugas, po vieną eilutėje:&#10;• Vamzdžių keitimas&#10;• Čiaupų montavimas&#10;• Šildymo sistemų remontas"
              value={form.services}
              onChange={(e) => setForm({ ...form, services: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="experienceYears" className="block text-body-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  <Clock className="h-3.5 w-3.5 inline mr-1 opacity-50" />
                  Patirtis (metais)
                </label>
                <input
                  id="experienceYears"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99}
                  placeholder="Pvz.: 5"
                  value={form.experienceYears ?? ""}
                  onChange={(e) => setForm({ ...form, experienceYears: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full rounded-xl border border-surface-300 bg-white px-3.5 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-all dark:border-surface-600 dark:bg-surface-800 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="priceFrom" className="block text-body-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                  <Euro className="h-3.5 w-3.5 inline mr-1 opacity-50" />
                  Kaina nuo (€)
                </label>
                <input
                  id="priceFrom"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="Pvz.: 30"
                  value={form.priceFrom ?? ""}
                  onChange={(e) => setForm({ ...form, priceFrom: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full rounded-xl border border-surface-300 bg-white px-3.5 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-all dark:border-surface-600 dark:bg-surface-800 dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-surface-200/60 bg-surface-50/50 px-4 py-2.5 transition-colors hover:bg-surface-100/50 dark:border-surface-700/50 dark:bg-surface-800/30 dark:hover:bg-surface-800/50">
                <input
                  type="checkbox"
                  checked={form.offersInvoices}
                  onChange={(e) => setForm({ ...form, offersInvoices: e.target.checked })}
                  className="h-4 w-4 rounded-md border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-600"
                />
                <div className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-surface-400" />
                  <span className="text-body-sm font-medium text-surface-700 dark:text-surface-300">Išrašau sąskaitas faktūras</span>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-surface-200/60 bg-surface-50/50 px-4 py-2.5 transition-colors hover:bg-surface-100/50 dark:border-surface-700/50 dark:bg-surface-800/30 dark:hover:bg-surface-800/50">
                <input
                  type="checkbox"
                  checked={form.availableForUrgent}
                  onChange={(e) => setForm({ ...form, availableForUrgent: e.target.checked })}
                  className="h-4 w-4 rounded-md border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-600"
                />
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-surface-400" />
                  <span className="text-body-sm font-medium text-surface-700 dark:text-surface-300">Galiu atlikti skubius darbus</span>
                </div>
              </label>
            </div>
          </div>
        </Card>

        {/* Section 3: Photos */}
        <Card>
          <SectionHeader icon={<Camera className="h-4 w-4" />} title="Nuotraukos ir darbų pavyzdžiai" step={3} totalSteps={account.isActive && storyEnabled ? 5 : 4} />

          {/* Profile photo */}
          <div className="mb-4">
            <p className="text-body-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Profilio nuotrauka</p>
            <p className="text-micro text-surface-400 mb-3">Ši nuotrauka bus matoma klientams šalia jūsų vardo.</p>
            {images.length > 0 ? (
              <div className="flex items-center gap-3">
                <div className={`relative group h-16 w-16 shrink-0 rounded-xl overflow-hidden border-2 border-brand-200 dark:border-brand-800 ${deletingId === images[0].publicId ? "opacity-50" : ""}`}>
                  <Image src={images[0].url} alt="Profilio nuotrauka" fill className="object-cover" sizes="64px" />
                  <button
                    onClick={() => handleDeleteImage(images[0].publicId)}
                    disabled={deletingId === images[0].publicId}
                    className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-red-500/90 text-white flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity disabled:opacity-50"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
                <span className="text-micro text-surface-400">Pirmoji įkelta nuotrauka naudojama kaip profilio nuotrauka.</span>
              </div>
            ) : (
              <p className="text-micro text-surface-400 italic">Dar neįkėlėte nuotraukų — įkelkite bent vieną žemiau.</p>
            )}
          </div>

          {/* Work examples */}
          {images.length > 1 && (
            <div className="mb-4">
              <p className="text-body-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Darbų pavyzdžiai</p>
              <p className="text-micro text-surface-400 mb-3">Klientai dažniau renkasi tiekėjus su realiais darbų pavyzdžiais.</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {images.slice(1).map((img, i) => (
                  <div key={img.publicId} className={`relative group aspect-square rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700 ${deletingId === img.publicId ? "opacity-50" : ""}`}>
                    <Image src={img.url} alt={`Darbas ${i + 1}`} fill className="object-cover" sizes="150px" />
                    <button
                      onClick={() => handleDeleteImage(img.publicId)}
                      disabled={deletingId === img.publicId}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500/90 text-white flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {images.length === 1 && (
            <div className="mb-4">
              <p className="text-body-sm font-medium text-surface-700 dark:text-surface-300 mb-1">Darbų pavyzdžiai</p>
              <p className="text-micro text-surface-400">Pridėkite nuotraukų iš atliktų darbų — tai didina pasitikėjimą.</p>
            </div>
          )}

          {images.length < 5 && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${
                dragOver
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                  : "border-surface-300 hover:border-brand-400 dark:border-surface-600"
              }`}
            >
              <ImageIcon className="h-6 w-6 text-surface-400 mx-auto mb-1.5" />
              <p className="text-body-sm text-surface-500">
                Nutempkite arba{" "}
                <label className="text-brand-600 font-medium cursor-pointer hover:text-brand-700">
                  pasirinkite nuotrauką
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadFile(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </p>
              {uploading && (
                <div className="mt-3">
                  <div className="h-1.5 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                    <div
                      className="h-full bg-brand-600 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-micro text-surface-400 mt-1">Įkeliama...</p>
                </div>
              )}
              <p className="text-micro text-surface-300 dark:text-surface-600 mt-1.5">
                Iki 5MB · {5 - images.length} iš 5 liko
              </p>
            </div>
          )}
        </Card>

        {/* Section 4: Stories — compact secondary, main entry point is in dashboard */}
        {account.isActive && storyEnabled && (
          <Card>
            <SectionHeader icon={<Sparkles className="h-4 w-4" />} title="Story" />
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-body-sm text-surface-600 dark:text-surface-400">
                  {stories.length > 0
                    ? `${stories.length} ${stories.length === 1 ? "aktyvi story" : "aktyvios story"}`
                    : "Neturite aktyvių story"
                  }
                </p>
                <p className="text-micro text-surface-400 mt-0.5">
                  Story galite greitai valdyti valdymo panelėje — paspaudę ant savo avataro.
                </p>
              </div>
              <Link
                href="/tiekejas"
                className="shrink-0 rounded-xl bg-brand-50 px-3 py-2 text-body-sm font-medium text-brand-700 hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/20 transition-colors"
              >
                Valdyti →
              </Link>
            </div>
          </Card>
        )}

        {/* Section 5: Location & Contact */}
        <Card>
          <SectionHeader icon={<MapPin className="h-4 w-4" />} title="Kontaktai ir lokacija" step={account.isActive && storyEnabled ? 5 : 4} totalSteps={account.isActive && storyEnabled ? 5 : 4} />
          <div className="space-y-4">
            <div>
              <Select
                id="location"
                label="Aptarnavimo zona"
                options={LITHUANIAN_CITIES.map((c) => ({ value: c, label: c }))}
                placeholder="Pasirinkite miestą"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
              <p className="text-micro text-surface-400 mt-1">
                Pasirinkite &bdquo;Visa Lietuva&ldquo;, jei dirbate visoje šalyje.
              </p>
            </div>

            <div>
              <Input
                id="phone"
                label="Telefonas"
                type="tel"
                placeholder="+370..."
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <p className="text-micro text-surface-400 mt-1">
                Nerodomas viešame profilyje. Naudojamas tik vidiniams pranešimams.
              </p>
            </div>

            <Input
              id="website"
              label="Svetainė (neprivaloma)"
              type="url"
              placeholder="https://..."
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>
        </Card>
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-10 px-4 pb-4 pt-2 pointer-events-none">
        <div className="mx-auto max-w-2xl pointer-events-auto">
          <div className="rounded-2xl border border-surface-200/60 bg-white/95 backdrop-blur-md px-4 py-2.5 shadow-lg dark:border-surface-700/50 dark:bg-surface-900/95 flex items-center justify-between">
            <p className="text-micro text-surface-400 hidden sm:block">
              {saved ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Pakeitimai išsaugoti</span>
              ) : (
                "Nepamirškite išsaugoti pakeitimų"
              )}
            </p>
            <Button onClick={handleSave} isLoading={saving} className="ml-auto">
              {saved ? <><Check className="h-4 w-4 mr-1.5" /> Išsaugota</> : <><Save className="h-4 w-4 mr-1.5" /> Išsaugoti</>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, step, totalSteps }: { icon: React.ReactNode; title: string; step?: number; totalSteps?: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
        {icon}
      </div>
      <h3 className="text-body font-semibold text-surface-900 dark:text-white">{title}</h3>
      {step && (
        <span className="ml-auto text-micro text-surface-300 dark:text-surface-600">{step}/{totalSteps || 4}</span>
      )}
    </div>
  );
}
