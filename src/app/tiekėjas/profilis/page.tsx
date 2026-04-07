"use client";

import { useEffect, useState } from "react";
import { SERVICE_CATEGORIES, LITHUANIAN_CITIES } from "@/lib/constants";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Save, Check } from "lucide-react";

export default function ProviderProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    description: "",
    specializations: [] as string[],
    location: "",
    phone: "",
    website: "",
  });

  useEffect(() => {
    fetch("/api/tiekėjas/profilis")
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
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/tiekėjas/profilis", {
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

  if (loading) return <LoadingSpinner />;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white mb-8">Profilio redagavimas</h1>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-body-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</div>
      )}

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
