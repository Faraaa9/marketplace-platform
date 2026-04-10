"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Sparkles } from "lucide-react";

interface Settings {
  storyEnabled: boolean;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setSettings(data.data);
      })
      .catch(() => setError("Nepavyko užkrauti nustatymų"))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(key: keyof Settings) {
    if (!settings || saving) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: !settings[key] }),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        setError(data.error || "Nepavyko išsaugoti");
      }
    } catch {
      setError("Nepavyko išsaugoti nustatymo");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white mb-2">Nustatymai</h1>
      <p className="text-body-sm text-surface-500 dark:text-surface-400 mb-8">
        Platformos funkcijų valdymas
      </p>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-body-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {settings && (
        <Card>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-500/10">
                <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-body font-semibold text-surface-900 dark:text-white">
                  Tiekėjų story
                </p>
                <p className="text-micro text-surface-500 dark:text-surface-400">
                  {settings.storyEnabled
                    ? "Tiekėjai gali kurti ir rodyti story savo profiliuose"
                    : "Story funkcija išjungta visoje platformoje"}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleToggle("storyEnabled")}
              disabled={saving}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-60 ${
                settings.storyEnabled
                  ? "bg-brand-600"
                  : "bg-surface-300 dark:bg-surface-600"
              }`}
              role="switch"
              aria-checked={settings.storyEnabled}
              aria-label="Tiekėjų story"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  settings.storyEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          {/* Status indicator */}
          <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-800">
            <p className="text-micro text-surface-400">
              Būsena:{" "}
              <span className={`font-medium ${settings.storyEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                {settings.storyEnabled ? "Įjungta" : "Išjungta"}
              </span>
              {saving && <span className="ml-2 text-surface-400">Saugoma...</span>}
              {saved && !saving && <span className="ml-2 text-emerald-600 dark:text-emerald-400">Išsaugota</span>}
            </p>
            {!settings.storyEnabled && (
              <p className="text-micro text-surface-400 mt-1.5">
                Esamos story lieka duomenų bazėje, bet yra paslėptos nuo visų vartotojų. Įjungus — vėl bus matomos.
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
