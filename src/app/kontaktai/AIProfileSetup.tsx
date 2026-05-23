"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface Category {
  id: string;
  name: string;
  selected: boolean;
}

interface GeneratedProfile {
  description: string;
  categories: Category[];
  phone?: string;
  avatarUrl: string;
  sourceData: {
    title?: string;
    companyName?: string;
    rawText: string;
  };
}

export function AIProfileSetup() {
  const router = useRouter();
  const [step, setStep] = useState<"input" | "preview" | "confirm">("input");
  const [url, setUrl] = useState("");
  const [source, setSource] = useState<"services_lt" | "linkedin">(
    "services_lt"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<GeneratedProfile | null>(null);
  const [editedProfile, setEditedProfile] = useState<GeneratedProfile | null>(
    null
  );
  const [regenerateCount, setRegenerateCount] = useState(0);

  const handleUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    setError("");
  };

  const handleSourceChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSource(e.target.value as "services_lt" | "linkedin");
  };

  const handleGenerateClick = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError("Prašau nurodykite URL");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/profile/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, source }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Nepavyko sugeneruoti profilio");
      }

      const data: GeneratedProfile = await response.json();
      setProfile(data);
      setEditedProfile(JSON.parse(JSON.stringify(data)));
      setStep("preview");
      setRegenerateCount(0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nepavyko sugeneruoti profilio"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (regenerateCount >= 2) {
      setError(
        "Pasiekėte regeneravimo limitą (3 kartai per dieną). Bandykite vėliau."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/profile/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, source }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Nepavyko sugeneruoti profilio");
      }

      const data: GeneratedProfile = await response.json();
      setProfile(data);
      setEditedProfile(JSON.parse(JSON.stringify(data)));
      setRegenerateCount(regenerateCount + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nepavyko sugeneruoti profilio"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    if (!editedProfile) return;
    const updated = {
      ...editedProfile,
      categories: editedProfile.categories.map((cat) =>
        cat.id === categoryId ? { ...cat, selected: !cat.selected } : cat
      ),
    };
    setEditedProfile(updated);
  };

  const handleDescriptionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    if (!editedProfile) return;
    setEditedProfile({
      ...editedProfile,
      description: e.target.value,
    });
  };

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!editedProfile) return;
    setEditedProfile({
      ...editedProfile,
      phone: e.target.value,
    });
  };

  const handleConfirm = async () => {
    if (!editedProfile) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/paskyra/profile-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editedProfile.description,
          categoryIds: editedProfile.categories
            .filter((c) => c.selected)
            .map((c) => c.id),
          phone: editedProfile.phone,
          image: editedProfile.avatarUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Nepavyko išsaugoti profilio");
      }

      router.push("/meistrai");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nepavyko išsaugoti profilio"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {step === "input" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">
              Greitai sukurti profilį
            </h2>
            <p className="text-gray-600">
              Nurodykite savo paslaugos.lt ar LinkedIn profilį, o mes sudarysime
              pilnumą jūsų paskyrą
            </p>
          </div>

          <form onSubmit={handleGenerateClick} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Šaltinis</label>
              <select
                value={source}
                onChange={handleSourceChange}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="services_lt">paslaugos.lt profilis</option>
                <option value="linkedin">LinkedIn profilis</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Profilio URL
              </label>
              <input
                type="url"
                value={url}
                onChange={handleUrlChange}
                placeholder="https://paslaugos.lt/..."
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 text-white py-2 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? "Sugeneruojama..." : "Sugeneruoti profilį"}
            </button>
          </form>
        </div>
      )}

      {step === "preview" && editedProfile && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Peržiūrėti profilį</h2>
            <p className="text-gray-600">
              Patikrinkite ir redaguokite sugeneruotą informaciją
            </p>
          </div>

          <div className="border rounded-lg p-6 space-y-6">
            {/* Avatar */}
            {editedProfile.avatarUrl && (
              <div className="flex justify-center">
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-orange-500">
                  <Image
                    src={editedProfile.avatarUrl}
                    alt="Avatar"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Aprašymas</label>
              <textarea
                value={editedProfile.description}
                onChange={handleDescriptionChange}
                rows={6}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-sm"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Telefonas
              </label>
              <input
                type="tel"
                value={editedProfile.phone || ""}
                onChange={handlePhoneChange}
                placeholder="+370... arba (8-6)"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium mb-3">
                Kategorijos (išrinkite reikalingas)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {editedProfile.categories.map((cat) => (
                  <label key={cat.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={cat.selected}
                      onChange={() => handleCategoryToggle(cat.id)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm">{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("input")}
              className="flex-1 px-4 py-2 border rounded-lg font-medium hover:bg-gray-50"
            >
              Grįžti
            </button>
            <button
              onClick={handleRegenerate}
              disabled={loading || regenerateCount >= 2}
              className="flex-1 px-4 py-2 border border-orange-500 text-orange-500 rounded-lg font-medium hover:bg-orange-50 disabled:opacity-50"
            >
              {loading
                ? "Regeneruojama..."
                : `Regeneruoti (${3 - regenerateCount})`}
            </button>
            <button
              onClick={() => setStep("confirm")}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              Tęsti
            </button>
          </div>
        </div>
      )}

      {step === "confirm" && editedProfile && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Patvirtinti profilį</h2>
            <p className="text-gray-600">
              Jūsų profilis yra paruoštas. Patvirtinkite, kad jis sukurtinas.
            </p>
          </div>

          <div className="border rounded-lg p-6 bg-gray-50">
            <div className="space-y-4 text-sm">
              <div>
                <span className="font-medium">Aprašymas:</span>
                <p className="text-gray-600 mt-1 line-clamp-3">
                  {editedProfile.description}
                </p>
              </div>
              <div>
                <span className="font-medium">Kategorijos:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {editedProfile.categories
                    .filter((c) => c.selected)
                    .map((cat) => (
                      <span
                        key={cat.id}
                        className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs"
                      >
                        {cat.name}
                      </span>
                    ))}
                </div>
              </div>
              {editedProfile.phone && (
                <div>
                  <span className="font-medium">Telefonas:</span>
                  <p className="text-gray-600">{editedProfile.phone}</p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep("preview")}
              className="flex-1 px-4 py-2 border rounded-lg font-medium hover:bg-gray-50"
            >
              Grįžti redaguoti
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? "Kuriama..." : "Sukurti profilį"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
