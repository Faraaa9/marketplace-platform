"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { CheckCircle, KeyRound, UserRound } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PhoneVerification from "@/components/requests/PhoneVerification";
import { BRAND_PALETTES, BRAND_COLOR_VALUES, normalizeBrandColor, type BrandColor } from "@/lib/brand-theme";
import ProfileEmailEditor from "./ProfileEmailEditor";

interface ProfileData {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  emailVerified: Date | string | null;
  phoneVerifiedAt: Date | string | null;
  brandColor: string | null;
  createdAt: Date | string;
  _count: { serviceRequests: number };
}

interface ProfileFormProps {
  initialProfile: ProfileData;
}

export default function ProfileForm({ initialProfile }: ProfileFormProps) {
  const { update } = useSession();
  const [profile, setProfile] = useState(initialProfile);
  const [name, setName] = useState(initialProfile.name ?? "");
  const [phone, setPhone] = useState(initialProfile.phone ?? "");
  const [brandColor, setBrandColor] = useState<BrandColor>(
    normalizeBrandColor(initialProfile.brandColor),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [phoneVerificationCleared, setPhoneVerificationCleared] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetCooldown, setResetCooldown] = useState(0);

  useEffect(() => {
    if (resetCooldown <= 0) return;
    const t = setTimeout(() => setResetCooldown((value) => value - 1), 1000);
    return () => clearTimeout(t);
  }, [resetCooldown]);

  const dirty =
    name.trim() !== (profile.name ?? "").trim() ||
    phone.trim() !== (profile.phone ?? "").trim() ||
    brandColor !== normalizeBrandColor(profile.brandColor);
  const phoneVerified =
    !phoneVerificationCleared && !!profile.phoneVerifiedAt && phone.trim() === (profile.phone ?? "");
  const emailVerified = !!profile.emailVerified;

  const completion = useMemo(() => {
    const done = [name.trim().length >= 2, emailVerified, phoneVerified].filter(Boolean).length;
    return Math.round((done / 3) * 100);
  }, [name, emailVerified, phoneVerified]);

  async function sendPasswordReset() {
    if (resetSending || resetCooldown > 0) return;
    setResetSending(true);
    setResetError("");
    setResetMessage("");
    try {
      const res = await fetch("/api/paskyra/profilis/send-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setResetMessage(
          `Atstatymo nuoroda išsiųsta į ${data.data?.maskedEmail || profile.email}. Nuoroda galioja 1 val.`,
        );
        setResetCooldown(60);
      } else {
        setResetError(data?.error || "Nepavyko išsiųsti atstatymo laiško");
        if (typeof data?.retryIn === "number" && data.retryIn > 0) {
          setResetCooldown(data.retryIn);
        }
      }
    } catch {
      setResetError("Nepavyko išsiųsti atstatymo laiško. Bandykite dar kartą.");
    } finally {
      setResetSending(false);
    }
  }

  async function saveProfile() {
    if (saving) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/paskyra/profilis", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, brandColor }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setProfile(data.data);
        setName(data.data.name ?? "");
        setPhone(data.data.phone ?? "");
        setBrandColor(normalizeBrandColor(data.data.brandColor));
        await update({ brandColor: data.data.brandColor });
        setPhoneVerificationCleared(!data.data.phoneVerifiedAt);
        setMessage("Profilis išsaugotas.");
      } else {
        setError(data?.error || "Nepavyko išsaugoti profilio");
      }
    } catch {
      setError("Nepavyko išsaugoti profilio. Bandykite dar kartą.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
      <section className="rounded-xl border border-surface-100 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
        <div className="mb-5 flex items-center gap-2">
          <UserRound className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          <h2 className="text-body font-semibold text-surface-900 dark:text-white">
            Kontaktai
          </h2>
        </div>

        <div className="space-y-4">
          <Input
            id="profile-name"
            label="Vardas"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setMessage("");
              setError("");
            }}
            placeholder="Jonas"
            autoComplete="name"
          />

          <ProfileEmailEditor
            currentEmail={profile.email}
            verified={emailVerified}
            onChanged={(email, emailVerifiedAt) => {
              setProfile((current) => ({
                ...current,
                email,
                emailVerified: emailVerifiedAt,
              }));
              setMessage("El. paštas pakeistas.");
              setError("");
            }}
          />

          <PhoneVerification
            inputId="profile-phone"
            phone={phone}
            verified={phoneVerified}
            onPhoneChange={(value) => {
              setPhone(value);
              setMessage("");
              setError("");
              if (value.trim() !== (profile.phone ?? "")) setPhoneVerificationCleared(true);
            }}
            onVerifiedChange={(value) => {
              setPhoneVerificationCleared(!value);
              setMessage("");
              setError("");
            }}
            onVerified={(verifiedPhone, phoneVerifiedAt) => {
              setPhone(verifiedPhone);
              setProfile((current) => ({
                ...current,
                phone: verifiedPhone,
                phoneVerifiedAt,
              }));
              setPhoneVerificationCleared(false);
              setMessage("Telefonas patvirtintas.");
            }}
            helper="Telefoną patvirtinsime SMS kodu. Patvirtintas numeris bus naudojamas skelbimams."
          />

          {message && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-body-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              {message}
            </p>
          )}
          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-body-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </p>
          )}

          <Button
            type="button"
            onClick={saveProfile}
            isLoading={saving}
            disabled={
              !dirty ||
              name.trim().length < 2 ||
              (phone.trim().length > 0 && phone.trim().length < 6)
            }
            className="w-full sm:w-auto"
          >
            Išsaugoti profilį
          </Button>
        </div>

        <div className="mt-6 border-t border-surface-200/70 pt-5 dark:border-surface-700/50">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-4 w-4 rounded-full bg-brand-600" />
            <h3 className="text-body font-semibold text-surface-900 dark:text-white">
              Main spalva
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {BRAND_COLOR_VALUES.map((value) => {
              const palette = BRAND_PALETTES[value];
              const active = brandColor === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setBrandColor(value);
                    setMessage("");
                    setError("");
                  }}
                  aria-pressed={active}
                  className={`min-h-11 rounded-xl border px-3 text-left text-caption font-semibold transition ${
                    active
                      ? "border-brand-600 bg-brand-50 text-surface-900 ring-2 ring-brand-600/20"
                      : "border-surface-200 bg-white text-surface-600 hover:border-surface-300 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: palette.main }}
                      aria-hidden="true"
                    />
                    {palette.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 border-t border-surface-200/70 pt-5 dark:border-surface-700/50">
          <div className="mb-3 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <h3 className="text-body font-semibold text-surface-900 dark:text-white">
              Saugumas
            </h3>
          </div>
          <p className="mb-3 text-body-sm text-surface-600 dark:text-surface-300">
            Į jūsų el. paštą <span className="font-medium text-surface-800 dark:text-surface-100">{profile.email}</span> išsiųsime nuorodą, kuria galėsite nustatyti naują slaptažodį.
          </p>

          {resetMessage && (
            <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-body-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              {resetMessage}
            </p>
          )}
          {resetError && (
            <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-body-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {resetError}
            </p>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={sendPasswordReset}
            isLoading={resetSending}
            disabled={resetCooldown > 0}
            className="w-full sm:w-auto"
          >
            {resetCooldown > 0
              ? `Siųsti dar kartą (${resetCooldown}s)`
              : "Atstatyti slaptažodį"}
          </Button>
        </div>
      </section>

      <aside className="rounded-xl border border-surface-100 bg-white p-5 dark:border-surface-800 dark:bg-surface-900">
        <p className="text-body-sm font-semibold text-surface-900 dark:text-white">
          Profilio pilnumas
        </p>
        <div className="mt-3 h-2 rounded-full bg-surface-100 dark:bg-surface-800">
          <div
            className="h-full rounded-full bg-brand-600 transition-all"
            style={{ width: `${completion}%` }}
          />
        </div>
        <p className="mt-2 text-heading-3 font-semibold text-surface-900 dark:text-white">
          {completion}%
        </p>

        <div className="mt-5 space-y-2 text-body-sm text-surface-600 dark:text-surface-300">
          <StatusRow done={name.trim().length >= 2} label="Vardas" />
          <StatusRow done={emailVerified} label="El. paštas" />
          <StatusRow done={phoneVerified} label="Telefonas patvirtintas" />
        </div>

        <div className="mt-5 rounded-xl bg-surface-50 p-3 text-micro text-surface-500 dark:bg-surface-800 dark:text-surface-400">
          Užklausų:{" "}
          <span className="font-semibold text-surface-800 dark:text-surface-100">
            {profile._count.serviceRequests}
          </span>
        </div>
      </aside>
    </div>
  );
}

function StatusRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle className={done ? "h-4 w-4 text-emerald-500" : "h-4 w-4 text-surface-300"} />
      <span>{label}</span>
    </div>
  );
}
