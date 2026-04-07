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
import { Save, Check, X, ImageIcon } from "lucide-react";

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
  const [dragOver, setDragOver] = useState(false);
  const [form, setForm] = useState({
    description: "",
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
            specializations: data.data.specializations || [],
            location: data.data.location || "",
            phone: data.data.phone || "",
            website: data.data.website || "",
          });
          // Parse images
          try {
            const rawImages: string[] = data.data.images ? (typeof data.data.images === "string" ? JSON.parse(data.data.images) : data.data.images) : [];
            const parsed = rawImages.map((imgStr: string) => {
              try { return JSON.parse(imgStr); } catch { return null; }
            }).filter(Boolean) as ProviderImage[];
            setImages(parsed);
          } catch { setImages([]); }
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
      }
    } catch {
      setError("Klaida išsaugant");
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
    try {
      const res = await fetch(`/api/provider/images/${encodeURIComponent(publicId)}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setImages((prev) => prev.filter((img) => img.publicId !== publicId));
      }
    } catch {
      setError("Nepavyko ištrinti nuotraukos");
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
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white mb-8">Profilio redagavimas</h1>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-body-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</div>
      )}

      {/* Image upload section */}
      <Card className="mb-6">
        <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white mb-4">Nuotraukos</h3>
        <p className="text-body-sm text-surface-500 mb-4">Pirmoji nuotrauka bus rodoma kaip profilio nuotrauka. Maks. 5 nuotraukos, iki 5MB kiekviena.</p>

        {/* Uploaded images grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
            {images.map((img, i) => (
              <div key={img.publicId} className="relative group aspect-square rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
                <Image src={img.url} alt={`Nuotrauka ${i + 1}`} fill className="object-cover" sizes="150px" />
                {i === 0 && (
                  <span className="absolute top-1 left-1 bg-brand-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-md">
                    Profilis
                  </span>
                )}
                <button
                  onClick={() => handleDeleteImage(img.publicId)}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Drop zone */}
        {images.length < 5 && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
              dragOver
                ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                : "border-surface-300 hover:border-brand-400 dark:border-surface-600"
            }`}
          >
            <ImageIcon className="h-8 w-8 text-surface-400 mx-auto mb-2" />
            <p className="text-body-sm text-surface-500">
              Nutempkite nuotrauką čia arba{" "}
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

      <Card>
        <div className="space-y-6">
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

          <Select
            id="location"
            label="Miestas"
            options={LITHUANIAN_CITIES.map((c) => ({ value: c, label: c }))}
            placeholder="Pasirinkite miestą"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />

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

          <Button onClick={handleSave} isLoading={saving}>
            {saved ? <><Check className="h-4 w-4 mr-2" /> Išsaugota</> : <><Save className="h-4 w-4 mr-2" /> Išsaugoti</>}
          </Button>
        </div>
      </Card>
    </div>
  );
}
