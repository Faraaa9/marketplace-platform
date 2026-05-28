"use client";

import { useState, useEffect, useMemo, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Globe,
  ScanText,
  Brain,
  Image as ImageIcon,
  Tag,
  CheckCircle2,
  Link2,
  PencilLine,
  X,
} from "lucide-react";
import GroupedCategoryPicker from "@/components/categories/GroupedCategoryPicker";
import type {
  ServiceCategoryGroup,
  ServiceCategoryItem,
} from "@/lib/service-categories";
import { FREE_CATEGORY_LIMIT } from "@/lib/category-pricing";

interface LoadingStep {
  icon: typeof Globe;
  label: string;
  funFact: string;
}

const LOADING_STEPS_URL: LoadingStep[] = [
  {
    icon: Globe,
    label: "Atveriam tavo nuorodą...",
    funFact: "Robotas pučia dulkes nuo monitoriaus 🤖",
  },
  {
    icon: ScanText,
    label: "Skaitome turinį...",
    funFact: "Žodžių daugiau nei rytinėje kavoje ☕",
  },
  {
    icon: Brain,
    label: "AI galvoja...",
    funFact: "Krypsta antakiu, mąsto giliai 🧠",
  },
  {
    icon: ImageIcon,
    label: "Rūšiuojame nuotraukas...",
    funFact: "Ieškom geriausios pozos 📸",
  },
  {
    icon: Tag,
    label: "Parenkam kategorijas...",
    funFact: "Tinkamiausios paslaugos jūsų darbui 🏷️",
  },
  {
    icon: CheckCircle2,
    label: "Saugome profilį...",
    funFact: "Tuoj viskas bus paruošta ✨",
  },
];

const LOADING_STEPS_SCRATCH: LoadingStep[] = [
  {
    icon: ScanText,
    label: "Analizuojam tavo aprašymą...",
    funFact: "AI uosto žodyną 📖",
  },
  {
    icon: Brain,
    label: "AI rašo profesionalų aprašymą...",
    funFact: "Klaviatūros klavišai dega ⌨️",
  },
  {
    icon: Tag,
    label: "Parenkam kategorijas...",
    funFact: "Suderinam tinkamiausias 🏷️",
  },
  {
    icon: ImageIcon,
    label: "Piešiam tavo darbo nuotrauką...",
    funFact: "AI vis dar nesupranta kodėl reikia mokytis pieštis 🎨",
  },
  {
    icon: CheckCircle2,
    label: "Saugome profilį...",
    funFact: "Beveik atlikta ✨",
  },
];

const STEP_INTERVALS_URL = [2000, 2500, 5000, 3000, 2000, 2500];
const STEP_INTERVALS_SCRATCH = [1500, 4000, 2000, 6000, 2000];

const ENCOURAGEMENT_MESSAGES = [
  "Beveik atlikta...",
  "Šedevras gimsta...",
  "Verta palaukti — bus gražu",
  "Kiekvienas geras dalykas užtruko",
  "Robotas dar suka ratu...",
];

type Mode = "url" | "scratch";

export function AIProfileSetup() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("scratch");

  // URL mode state
  const [url, setUrl] = useState("");
  const [source, setSource] = useState<"services_lt" | "linkedin">(
    "services_lt"
  );

  // Scratch mode state
  const [businessName, setBusinessName] = useState("");
  const [servicesText, setServicesText] = useState("");
  const [scratchLocation, setScratchLocation] = useState("");
  const [scratchExperience, setScratchExperience] = useState("");
  const [scratchPhone, setScratchPhone] = useState("");
  const [scratchWebsite, setScratchWebsite] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [overtimeMessageIdx, setOvertimeMessageIdx] = useState(0);

  // Post-generation category confirmation step
  const [generatedSlug, setGeneratedSlug] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [categoryGroups, setCategoryGroups] = useState<ServiceCategoryGroup[]>([]);
  const [confirmCategoryIds, setConfirmCategoryIds] = useState<string[]>([]);
  const [savingCategories, setSavingCategories] = useState(false);

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    function add(item: ServiceCategoryItem) {
      map.set(item.id, item.name);
      for (const child of item.children ?? []) add(child);
    }
    for (const group of categoryGroups) {
      for (const cat of group.categories) add(cat);
    }
    return map;
  }, [categoryGroups]);

  function toggleConfirmCategory(id: string) {
    setConfirmCategoryIds((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= FREE_CATEGORY_LIMIT) return prev;
      return [...prev, id];
    });
  }

  function goToProfile() {
    if (generatedSlug) {
      router.push(`/meistrai/${generatedSlug}?welcome=1`);
    } else {
      router.push("/tiekejas/profilis");
    }
  }

  async function handleConfirmCategories() {
    setSavingCategories(true);
    try {
      await fetch("/api/tiekejas/profilis/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryIds: confirmCategoryIds }),
      });
    } catch {
      // Categories were already saved by the generator; a failed tweak here
      // shouldn't trap the user on this screen — proceed to the profile.
    } finally {
      goToProfile();
    }
  }

  const loadingSteps = mode === "url" ? LOADING_STEPS_URL : LOADING_STEPS_SCRATCH;
  const stepIntervals = mode === "url" ? STEP_INTERVALS_URL : STEP_INTERVALS_SCRATCH;

  useEffect(() => {
    if (!loading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveStep(0);
      setOvertimeMessageIdx(0);
      return;
    }
    let cancelled = false;
    function advance(stepIdx: number) {
      if (cancelled) return;
      if (stepIdx >= loadingSteps.length) {
        const interval = setInterval(() => {
          if (cancelled) return clearInterval(interval);
          setOvertimeMessageIdx((i) => (i + 1) % ENCOURAGEMENT_MESSAGES.length);
        }, 2500);
        return;
      }
      setActiveStep(stepIdx);
      const delay = stepIntervals[stepIdx] ?? 2000;
      setTimeout(() => advance(stepIdx + 1), delay);
    }
    advance(0);
    return () => {
      cancelled = true;
    };
  }, [loading, loadingSteps.length, stepIntervals]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (mode === "url") {
      if (!url.trim()) {
        setError("Prašau nurodykite URL");
        return;
      }
    } else {
      if (!businessName.trim()) {
        setError("Įveskite savo vardą arba įmonės pavadinimą");
        return;
      }
      if (!servicesText.trim()) {
        setError("Aprašykite kokias paslaugas teikiate");
        return;
      }
    }

    setLoading(true);
    setError("");

    try {
      const body =
        mode === "url"
          ? { url, source }
          : {
              source: "scratch" as const,
              businessName: businessName.trim(),
              servicesText: servicesText.trim(),
              location: scratchLocation.trim() || undefined,
              experienceYears: scratchExperience
                ? parseInt(scratchExperience, 10)
                : undefined,
              phone: scratchPhone.trim() || undefined,
              website: scratchWebsite.trim() || undefined,
            };

      const response = await fetch("/api/profile/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const raw = await response.text();
        let message = "Nepavyko sugeneruoti profilio";
        try {
          const data = JSON.parse(raw);
          message = data.error || message;
        } catch {
          if (response.status === 504 || response.status === 408) {
            message =
              "Generavimas užtruko per ilgai. Pabandykite dar kartą.";
          }
        }
        throw new Error(message);
      }

      const result = await response.json();
      setGeneratedSlug(result.slug ?? null);
      setConfirmCategoryIds(
        Array.isArray(result.categoryIds) ? result.categoryIds : []
      );
      try {
        const catRes = await fetch("/api/service-categories");
        const catData = await catRes.json();
        setCategoryGroups(catData?.data ?? []);
      } catch {
        setCategoryGroups([]);
      }
      setLoading(false);
      setConfirming(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nepavyko sugeneruoti profilio"
      );
      setLoading(false);
    }
  };

  if (confirming) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="space-y-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Profilis sukurtas!</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Patikrink, ar AI teisingai parinko tavo veiklos sritis. Pašalink
              netinkamas arba pridėk trūkstamas.
            </p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Tavo veiklos sritys
              </label>
              <span
                className={`text-xs tabular-nums font-medium ${
                  confirmCategoryIds.length >= FREE_CATEGORY_LIMIT
                    ? "text-amber-500"
                    : "text-gray-400"
                }`}
              >
                {confirmCategoryIds.length}/{FREE_CATEGORY_LIMIT}
              </span>
            </div>
            <GroupedCategoryPicker
              groups={categoryGroups}
              multiple
              selectedValues={confirmCategoryIds}
              onToggle={toggleConfirmCategory}
              onClearAll={() => setConfirmCategoryIds([])}
              mode="id"
              variant="form"
              placeholder="Pasirinkite veiklos sritis"
            />
            {confirmCategoryIds.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {confirmCategoryIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 py-1 pl-2.5 pr-1 text-xs font-medium text-orange-700"
                  >
                    {categoryNameById.get(id) ?? "Kategorija"}
                    <button
                      type="button"
                      onClick={() => toggleConfirmCategory(id)}
                      aria-label={`Pašalinti ${categoryNameById.get(id) ?? "kategoriją"}`}
                      className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-orange-200/60"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
            <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            <span>Nuotraukas galėsi įkelti ar pakeisti bet kada savo profilyje.</span>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleConfirmCategories}
              disabled={savingCategories}
              className="w-full bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {savingCategories ? "Saugome..." : "Patvirtinti ir tęsti"}
            </button>
            <button
              type="button"
              onClick={goToProfile}
              disabled={savingCategories}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              Praleisti
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    const overtime = activeStep >= loadingSteps.length - 1;
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="space-y-8">
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center w-20 h-20 mb-4">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 animate-pulse" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 opacity-50 blur-xl animate-pulse" />
              <Sparkles className="relative w-10 h-10 text-white animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {overtime
                ? ENCOURAGEMENT_MESSAGES[overtimeMessageIdx]
                : loadingSteps[activeStep]?.label || "Tuoj baigsim..."}
            </h2>
            <p className="text-gray-500 italic">
              {loadingSteps[Math.min(activeStep, loadingSteps.length - 1)]?.funFact}
            </p>
          </div>
          <div className="rounded-2xl border border-surface-200/60 bg-white p-5 dark:border-surface-700/50 dark:bg-surface-900/50 space-y-3">
            {loadingSteps.map((step, idx) => {
              const Icon = step.icon;
              const done = idx < activeStep;
              const current = idx === activeStep;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 transition-all duration-300 ${
                    done
                      ? "opacity-100"
                      : current
                        ? "opacity-100 scale-[1.02]"
                        : "opacity-40"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                      done
                        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400"
                        : current
                          ? "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400"
                          : "bg-surface-100 text-surface-400 dark:bg-surface-800"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : current ? (
                      <Icon className="h-5 w-5 animate-pulse" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-body-sm font-medium ${
                        done
                          ? "text-emerald-700 dark:text-emerald-300 line-through decoration-emerald-400/50"
                          : current
                            ? "text-surface-900 dark:text-white"
                            : "text-surface-500 dark:text-surface-400"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                  {current && (
                    <div className="flex gap-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-center text-xs text-gray-400">
            Nereikia atnaujinti puslapio — profilis išsisaugos automatiškai
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-100 mb-4">
            <Sparkles className="w-8 h-8 text-orange-600" />
          </div>
          <h2 className="text-3xl font-bold mb-3">
            Sukurk profilį per kelias sekundes
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">
            AI sukurs profilį už tave — pasirink kaip pradedi.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("url");
              setError("");
            }}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              mode === "url"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Link2 className="w-4 h-4" />
            Iš URL
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("scratch");
              setError("");
            }}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              mode === "scratch"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <PencilLine className="w-4 h-4" />
            Nuo nulio
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "url" ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Šaltinis
                </label>
                <select
                  value={source}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setSource(e.target.value as "services_lt" | "linkedin")
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="services_lt">paslaugos.lt profilis</option>
                  <option value="linkedin">LinkedIn profilis</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Profilio URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError("");
                  }}
                  placeholder={
                    source === "services_lt"
                      ? "https://paslaugos.lt/..."
                      : "https://linkedin.com/in/..."
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Vardas arba įmonės pavadinimas <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => {
                    setBusinessName(e.target.value);
                    setError("");
                  }}
                  placeholder="Pvz. Tomas Kazlauskas arba UAB Statybos meistrai"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Kokias paslaugas teikiate? <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={servicesText}
                  onChange={(e) => {
                    setServicesText(e.target.value);
                    setError("");
                  }}
                  rows={4}
                  placeholder="Trumpai aprašyk, ką dirbi. Pvz.: Santechnikos darbai — vamzdžių keitimas, šildymo sistemų montavimas, čiaupų remontas. Dirbu Vilniuje ir aplink, taip pat skubūs darbai."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Nesirūpink rašyba — AI viską sutvarkys.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Miestas
                  </label>
                  <input
                    type="text"
                    value={scratchLocation}
                    onChange={(e) => setScratchLocation(e.target.value)}
                    placeholder="Vilnius"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Patirtis (metais)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={scratchExperience}
                    onChange={(e) => setScratchExperience(e.target.value)}
                    placeholder="5"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Telefonas (neprivaloma)
                  </label>
                  <input
                    type="tel"
                    value={scratchPhone}
                    onChange={(e) => setScratchPhone(e.target.value)}
                    placeholder="+370..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Tinklalapis (neprivaloma)
                  </label>
                  <input
                    type="url"
                    value={scratchWebsite}
                    onChange={(e) => setScratchWebsite(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-orange-600 text-white py-3 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            <Sparkles className="w-5 h-5" />
            Sukurti profilį su AI
          </button>
        </form>

        <div className="text-center text-sm text-gray-500">
          Po sugeneravimo galėsi viską redaguoti savo profilyje
        </div>
      </div>
    </div>
  );
}
