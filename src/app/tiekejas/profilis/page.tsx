"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { SERVICE_CATEGORIES, LITHUANIAN_CITIES } from "@/lib/constants";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Save, Check, X, ImageIcon, Camera, MapPin, Briefcase, Phone, Wrench, Euro, Clock, FileCheck, Zap } from "lucide-react";

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
    fetch("/api/tiekejas/profilis")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setForm({
            description: data.data.description || "",
            headline: data.data.headline || "",
            services: data.data.services || "",
            priceFrom: data.data.priceFrom ?? null,
            experienceYears: data.data.experienceYears ?? null,
            offersInvoices: data.data.offersInvoices ?? false,
            availableForUrgent: data.data.availableForUrgent ?? false,
            specializations: data.data.specializations || [],
            location: data.data.location || "",
            phone: data.data.phone || "",
            website: data.data.website || "",
          });
          // Images already parsed by API
          setImages(Array.isArray(data.data.images) ? data.data.images : []);
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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white mb-2">Profilio redagavimas</h1>
      <p className="text-body-sm text-surface-500 dark:text-surface-400 mb-8">
        Kuo pilnesnis profilis, tuo daugiau klientų pasitikėjimo.
      </p>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-body-sm text-red-600 dark:bg-red-500/10 dark:text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-600 ml-2 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="space-y-6">
        {/* Section 1: Photos */}
        <Card>
          <SectionHeader icon={<Camera className="h-4 w-4" />} title="Nuotraukos" />
          <p className="text-micro text-surface-400 mb-4">Pirmoji — profilio nuotrauka. Maks. 5, iki 5MB.</p>

          {images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
              {images.map((img, i) => (
                <div key={img.publicId} className={`relative group aspect-square rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700 ${deletingId === img.publicId ? "opacity-50" : ""}`}>
                  <Image src={img.url} alt={`Nuotrauka ${i + 1}`} fill className="object-cover" sizes="150px" />
                  {i === 0 && (
                    <span className="absolute top-1 left-1 bg-brand-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md">
                      Profilis
                    </span>
                  )}
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
          )}

          {images.length < 5 && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
                dragOver
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                  : "border-surface-300 hover:border-brand-400 dark:border-surface-600"
              }`}
            >
              <ImageIcon className="h-7 w-7 text-surface-400 mx-auto mb-2" />
              <p className="text-body-sm text-surface-500">
                Nutempkite arba{" "}
                <label className="text-brand-600 font-medium cursor-pointer hover:text-brand-700">
                  pasirinkite failą
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
            </div>
          )}
        </Card>

        {/* Section 2: About */}
        <Card>
          <SectionHeader icon={<Briefcase className="h-4 w-4" />} title="Apie jus" />
          <div className="space-y-5">
            <Input
              id="headline"
              label="Antraštė"
              placeholder="Pvz.: Santechnikos meistras su 10 metų patirtimi"
              value={form.headline}
              onChange={(e) => setForm({ ...form, headline: e.target.value })}
            />
            <div className="flex items-center justify-between -mt-3">
              <p className="text-micro text-surface-400">Trumpas sakinys, kuris bus matomas po jūsų vardu.</p>
              <span className={`text-micro ${form.headline.length > 100 ? "text-amber-500" : "text-surface-300"}`}>
                {form.headline.length}/120
              </span>
            </div>

            <Textarea
              id="description"
              label="Aprašymas"
              placeholder="Aprašykite savo paslaugas, patirtį, privalumus..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            <div>
              <label className="block text-body-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                Specializacijos
              </label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => toggleSpecialization(cat.value)}
                    className={`rounded-full px-3.5 py-1.5 text-body-sm border transition-all duration-150 ${
                      form.specializations.includes(cat.value)
                        ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                        : "border-surface-300 text-surface-700 hover:border-brand-300 hover:text-brand-600 dark:border-surface-600 dark:text-surface-300 dark:hover:border-brand-500"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Section 3: Services & Experience */}
        <Card>
          <SectionHeader icon={<Wrench className="h-4 w-4" />} title="Paslaugos ir patirtis" />
          <div className="space-y-5">
            <Textarea
              id="services"
              label="Teikiamos paslaugos"
              placeholder="Išvardinkite konkrečias paslaugas, po vieną eilutėje:&#10;• Vamzdžių keitimas&#10;• Čiaupų montavimas&#10;• Šildymo sistemų remontas"
              value={form.services}
              onChange={(e) => setForm({ ...form, services: e.target.value })}
            />

            <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-surface-200/60 bg-surface-50/50 px-4 py-3 transition-colors hover:bg-surface-100/50 dark:border-surface-700/50 dark:bg-surface-800/30 dark:hover:bg-surface-800/50">
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
              <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-surface-200/60 bg-surface-50/50 px-4 py-3 transition-colors hover:bg-surface-100/50 dark:border-surface-700/50 dark:bg-surface-800/30 dark:hover:bg-surface-800/50">
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

        {/* Section 3: Location & Contact */}
        <Card>
          <SectionHeader icon={<MapPin className="h-4 w-4" />} title="Lokacija" />
          <Select
            id="location"
            label="Miestas"
            options={LITHUANIAN_CITIES.map((c) => ({ value: c, label: c }))}
            placeholder="Pasirinkite miestą"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </Card>

        <Card>
          <SectionHeader icon={<Phone className="h-4 w-4" />} title="Kontaktai" />
          <div className="space-y-5">
            <Input
              id="phone"
              label="Telefonas"
              type="tel"
              placeholder="+370..."
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
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

        {/* Sticky save bar */}
        <div className="sticky bottom-4 z-10">
          <div className="rounded-2xl border border-surface-200/60 bg-white/90 backdrop-blur-sm px-5 py-3 shadow-lg dark:border-surface-700/50 dark:bg-surface-900/90 flex items-center justify-between">
            <p className="text-micro text-surface-400 hidden sm:block">
              {saved ? "Pakeitimai išsaugoti" : "Nepamirškite išsaugoti pakeitimų"}
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

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
        {icon}
      </div>
      <h3 className="text-body font-semibold text-surface-900 dark:text-white">{title}</h3>
    </div>
  );
}
