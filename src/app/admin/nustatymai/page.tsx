"use client";

import { useEffect, useState, type FormEvent } from "react";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { CreditCard, Gift, Mail, PanelRight, Sparkles, X } from "lucide-react";
import CreditPacksCard from "./CreditPacksCard";

interface Settings {
  storyEnabled: boolean;
  emailTestMode: boolean;
  emailAllowlist: string[];
  freeStarterCredits: number;
  profilePreviewEnabled: boolean;
  multilabelCategoriesEnabled: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [starterInput, setStarterInput] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setSettings(data.data);
          setStarterInput(String(data.data.freeStarterCredits ?? 3));
        }
      })
      .catch(() => setError("Nepavyko užkrauti nustatymų"))
      .finally(() => setLoading(false));
  }, []);

  async function save(patch: Partial<Settings>): Promise<boolean> {
    if (!settings || saving) return false;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.data);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        return true;
      }
      setError(data.error || "Nepavyko išsaugoti");
      return false;
    } catch {
      setError("Nepavyko išsaugoti nustatymo");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function toggleStory() {
    if (!settings) return;
    save({ storyEnabled: !settings.storyEnabled });
  }

  function toggleProfilePreview() {
    if (!settings) return;
    save({ profilePreviewEnabled: !settings.profilePreviewEnabled });
  }

  function toggleMultilabel() {
    if (!settings) return;
    save({ multilabelCategoriesEnabled: !settings.multilabelCategoriesEnabled });
  }

  function toggleEmailTestMode() {
    if (!settings) return;
    save({ emailTestMode: !settings.emailTestMode });
  }

  async function saveStarter() {
    const count = parseInt(starterInput, 10);
    if (!Number.isInteger(count) || count < 0) {
      setError("Startinių kreditų skaičius turi būti 0 arba daugiau");
      return;
    }
    await save({ freeStarterCredits: count });
  }

  async function handleAddEmail(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    const email = newEmail.trim().toLowerCase();
    setEmailError("");
    if (!email) return;
    if (!EMAIL_RE.test(email)) {
      setEmailError("Neteisingas el. pašto formatas");
      return;
    }
    if (settings.emailAllowlist.includes(email)) {
      setEmailError("Šis adresas jau pridėtas");
      return;
    }
    const ok = await save({ emailAllowlist: [...settings.emailAllowlist, email] });
    if (ok) setNewEmail("");
  }

  function handleRemoveEmail(email: string) {
    if (!settings) return;
    save({ emailAllowlist: settings.emailAllowlist.filter((e) => e !== email) });
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
        <div className="space-y-4">
          {/* Tiekėjų story */}
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
                onClick={toggleStory}
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

          {/* Profilio peržiūros langas */}
          <Card>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
                  <PanelRight className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <p className="text-body font-semibold text-surface-900 dark:text-white">
                    Profilio peržiūros langas
                  </p>
                  <p className="text-micro text-surface-500 dark:text-surface-400">
                    {settings.profilePreviewEnabled
                      ? "Paspaudus tiekėją, šone atsidaro greita profilio peržiūra"
                      : "Paspaudus tiekėją, iškart atidaromas pilnas profilis"}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleProfilePreview}
                disabled={saving}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-60 ${
                  settings.profilePreviewEnabled
                    ? "bg-brand-600"
                    : "bg-surface-300 dark:bg-surface-600"
                }`}
                role="switch"
                aria-checked={settings.profilePreviewEnabled}
                aria-label="Profilio peržiūros langas"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    settings.profilePreviewEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            {/* Status indicator */}
            <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-800">
              <p className="text-micro text-surface-400">
                Būsena:{" "}
                <span className={`font-medium ${settings.profilePreviewEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                  {settings.profilePreviewEnabled ? "Įjungta" : "Išjungta"}
                </span>
                {saving && <span className="ml-2 text-surface-400">Saugoma...</span>}
                {saved && !saving && <span className="ml-2 text-emerald-600 dark:text-emerald-400">Išsaugota</span>}
              </p>
            </div>
          </Card>

          {/* Multi-label kategorijų pipeline (kill switch) */}
          <Card>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
                  <PanelRight className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <p className="text-body font-semibold text-surface-900 dark:text-white">
                    Multi-label kategorijos (AI)
                  </p>
                  <p className="text-micro text-surface-500 dark:text-surface-400">
                    {settings.multilabelCategoriesEnabled
                      ? "Užklausa skaidoma į darbus, kiekvienam siūlomos kategorijos"
                      : "Senas elgesys: viena kategorija visam tekstui"}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleMultilabel}
                disabled={saving}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-60 ${
                  settings.multilabelCategoriesEnabled ? "bg-brand-600" : "bg-surface-300 dark:bg-surface-600"
                }`}
                role="switch"
                aria-checked={settings.multilabelCategoriesEnabled}
                aria-label="Multi-label kategorijos"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    settings.multilabelCategoriesEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-800">
              <p className="text-micro text-surface-400">
                Būsena:{" "}
                <span className={`font-medium ${settings.multilabelCategoriesEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
                  {settings.multilabelCategoriesEnabled ? "Įjungta (100%)" : "Išjungta"}
                </span>
                {saving && <span className="ml-2 text-surface-400">Saugoma...</span>}
                {saved && !saving && <span className="ml-2 text-emerald-600 dark:text-emerald-400">Išsaugota</span>}
              </p>
            </div>
          </Card>

          {/* El. laiškų testavimo režimas */}
          <Card>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
                  <Mail className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <p className="text-body font-semibold text-surface-900 dark:text-white">
                    El. laiškų testavimo režimas
                  </p>
                  <p className="text-micro text-surface-500 dark:text-surface-400">
                    {settings.emailTestMode
                      ? "Laiškai siunčiami tik žemiau nurodytais adresais"
                      : "Laiškai siunčiami visiems gavėjams įprastai"}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleEmailTestMode}
                disabled={saving}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-60 ${
                  settings.emailTestMode
                    ? "bg-brand-600"
                    : "bg-surface-300 dark:bg-surface-600"
                }`}
                role="switch"
                aria-checked={settings.emailTestMode}
                aria-label="El. laiškų testavimo režimas"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    settings.emailTestMode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Allowlist editor */}
            <div className="mt-4 pt-4 border-t border-surface-100 dark:border-surface-800">
              <p className="text-body-sm font-medium text-surface-900 dark:text-white">
                Leidžiami el. pašto adresai
              </p>
              <p className="text-micro text-surface-500 dark:text-surface-400 mt-0.5 mb-3">
                {settings.emailTestMode
                  ? "Tik šie adresai gauna laiškus. Visiems kitiems gavėjams laiškai nesiunčiami."
                  : "Įveskite adresus iš anksto — jie pradės veikti, kai įjungsite testavimo režimą."}
              </p>

              {settings.emailAllowlist.length > 0 ? (
                <ul className="mb-3 space-y-1.5">
                  {settings.emailAllowlist.map((email) => (
                    <li
                      key={email}
                      className="flex items-center justify-between gap-3 rounded-lg border border-surface-200 bg-white px-3 py-2 dark:border-surface-700 dark:bg-surface-800"
                    >
                      <span className="text-body-sm text-surface-900 dark:text-white truncate">
                        {email}
                      </span>
                      <button
                        onClick={() => handleRemoveEmail(email)}
                        disabled={saving}
                        className="shrink-0 rounded-md p-1 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 disabled:opacity-60 dark:hover:bg-surface-700 dark:hover:text-surface-200"
                        aria-label={`Pašalinti ${email}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-3 rounded-lg border border-dashed border-surface-200 px-3 py-2 text-micro text-surface-400 dark:border-surface-700">
                  Sąrašas tuščias. Įjungus testavimo režimą su tuščiu sąrašu, nebus išsiųstas nė vienas laiškas.
                </p>
              )}

              <form onSubmit={handleAddEmail} className="flex gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  placeholder="vardas@pavyzdys.lt"
                  className="min-w-0 flex-1 rounded-lg border border-surface-200 bg-white px-3 py-2 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={saving || !newEmail.trim()}
                  className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
                >
                  Pridėti
                </button>
              </form>
              {emailError && (
                <p className="mt-1.5 text-micro text-red-500 dark:text-red-400">{emailError}</p>
              )}

              {/* Status indicator */}
              <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-800">
                <p className="text-micro text-surface-400">
                  Būsena:{" "}
                  <span className={`font-medium ${settings.emailTestMode ? "text-brand-600 dark:text-brand-400" : "text-surface-500 dark:text-surface-400"}`}>
                    {settings.emailTestMode ? "Testavimo režimas įjungtas" : "Įprastas siuntimas"}
                  </span>
                  {saving && <span className="ml-2 text-surface-400">Saugoma...</span>}
                  {saved && !saving && <span className="ml-2 text-emerald-600 dark:text-emerald-400">Išsaugota</span>}
                </p>
                {settings.emailTestMode && (
                  <p className="text-micro text-surface-400 mt-1.5">
                    Kol režimas įjungtas, tikri klientai negaus jokių laiškų (užklausų patvirtinimų, pasiūlymų, kodų). Išjunkite, kai baigsite testuoti.
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Startiniai kreditai */}
          <Card>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                <Gift className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-body font-semibold text-surface-900 dark:text-white">
                  Startiniai kreditai
                </p>
                <p className="text-micro text-surface-500 dark:text-surface-400">
                  Kiek nemokamų kreditų gauna naujas tiekėjas, susikūręs profilį
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={starterInput}
                onChange={(e) => setStarterInput(e.target.value)}
                className="w-24 rounded-lg border border-surface-200 bg-white px-3 py-2 text-body-sm text-surface-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
              />
              <button
                onClick={saveStarter}
                disabled={saving}
                className="rounded-lg bg-brand-600 px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
              >
                Išsaugoti
              </button>
              {saving && <span className="text-micro text-surface-400">Saugoma...</span>}
              {saved && !saving && (
                <span className="text-micro text-emerald-600 dark:text-emerald-400">Išsaugota</span>
              )}
            </div>
          </Card>

          {/* Kreditų paketai */}
          <CreditPacksCard />

          {/* Prenumeratos */}
          <Card>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-100 dark:bg-surface-800">
                  <CreditCard className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-body font-semibold text-surface-900 dark:text-white">
                      Prenumeratos modelis
                    </p>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-micro font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                      Išjungta
                    </span>
                  </div>
                  <p className="mt-1 text-micro text-surface-500 dark:text-surface-400">
                    BASIC / PRO planai šiuo metu nerodomi tiekėjams. Aktyvus monetizacijos modelis yra kreditai už užklausų atrakinimą.
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-dashed border-surface-200 bg-surface-50 px-4 py-3 text-micro text-surface-500 dark:border-surface-700 dark:bg-surface-800/50 dark:text-surface-400 sm:max-w-xs">
                Reikia atskiro darbo: aiškūs planų limitai, Stripe subscription flow, billing portal ir migracija nuo kreditų arba hibridinis modelis.
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
