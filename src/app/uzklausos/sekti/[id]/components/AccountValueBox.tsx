"use client";

import { useState } from "react";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { UserPlus, Eye, Bell, Zap } from "lucide-react";
import Button from "@/components/ui/Button";
import { clearGuestRequest } from "@/lib/guest-request";

interface AccountValueBoxProps {
  clientId?: string | null;
  trackingToken: string;
  onClaimed: () => void;
}

export default function AccountValueBox({
  clientId,
  trackingToken,
  onClaimed,
}: AccountValueBoxProps) {
  const { data: session } = useSession();
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [accountExists, setAccountExists] = useState(false);

  if (clientId) return null;

  async function handleCreateAccount() {
    if (password.length < 8) {
      setCreateError("Slaptažodis turi būti bent 8 simbolių");
      return;
    }
    setCreating(true);
    setCreateError("");
    setAccountExists(false);
    try {
      const res = await fetch("/api/requests/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingToken, password }),
      });
      const data = await res.json();
      if (data.success) {
        clearGuestRequest();
        await signIn("credentials", {
          email: data.data.email,
          password,
          callbackUrl: "/paskyra/uzklausos",
        });
      } else if (data.code === "ACCOUNT_EXISTS") {
        setAccountExists(true);
        setCreateError(data.error || "Su šiuo el. paštu paskyra jau yra.");
      } else {
        setCreateError(data.error || "Nepavyko sukurti paskyros");
      }
    } catch {
      setCreateError("Klaida");
    } finally {
      setCreating(false);
    }
  }

  async function handleClaim() {
    setClaiming(true);
    setClaimError("");
    try {
      const res = await fetch("/api/requests/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingToken }),
      });
      const data = await res.json();
      if (data.success) {
        clearGuestRequest();
        setClaimed(true);
        onClaimed();
      } else {
        setClaimError(data.error || "Nepavyko priskirti");
      }
    } catch {
      setClaimError("Klaida");
    } finally {
      setClaiming(false);
    }
  }

  if (session) {
    if (claimed) {
      return (
        <div className="mb-6 rounded-xl border border-emerald-200/60 bg-emerald-50 px-4 py-3 dark:border-emerald-800/40 dark:bg-emerald-500/10">
          <p className="text-body-sm text-emerald-700 dark:text-emerald-400">
            {/* eslint-disable-next-line react/no-unescaped-entities */}
            Užklausa priskirta jūsų paskyrai. Dabar ją matysite skiltyje &bdquo;Mano užklausos".
          </p>
        </div>
      );
    }

    return (
      <div className="mb-6 rounded-2xl border border-brand-200/60 bg-brand-50/50 p-5 dark:border-brand-800/40 dark:bg-brand-950/30">
        <h3 className="text-body font-semibold text-surface-900 dark:text-white mb-1">
          Priskirti šią užklausą savo paskyrai?
        </h3>
        <p className="text-body-sm text-surface-500 dark:text-surface-400 mb-3">
          {/* eslint-disable-next-line react/no-unescaped-entities */}
          Tada ją matysite &bdquo;Mano užklausos" skiltyje ir nereikės saugoti nuorodos.
        </p>
        {claimError && (
          <p className="text-body-sm text-red-600 dark:text-red-400 mb-2">{claimError}</p>
        )}
        <Button size="sm" onClick={handleClaim} isLoading={claiming}>
          Priskirti prie mano paskyros
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-surface-200/60 bg-white p-5 dark:border-surface-700/50 dark:bg-surface-900/50">
      <div className="flex items-center gap-2 mb-3">
        <UserPlus className="h-4 w-4 text-brand-600 dark:text-brand-400" />
        <h3 className="text-body font-semibold text-surface-900 dark:text-white">Sukurti nemokamą paskyrą</h3>
      </div>
      <ul className="space-y-2 mb-4">
        {[
          { icon: <Eye className="h-3.5 w-3.5" />, text: "Visos užklausos vienoje vietoje" },
          { icon: <Bell className="h-3.5 w-3.5" />, text: "Pranešimai apie naujus pasiūlymus" },
          { icon: <Zap className="h-3.5 w-3.5" />, text: "Matysite, kiek tiekėjų peržiūrėjo užklausą" },
        ].map((item) => (
          <li key={item.text} className="flex items-center gap-2.5 text-body-sm text-surface-600 dark:text-surface-400">
            <span className="text-brand-500">{item.icon}</span>
            {item.text}
          </li>
        ))}
      </ul>
      <p className="mb-2 text-micro text-surface-500 dark:text-surface-400">
        Paskyra bus sukurta el. paštui, kurį nurodėte užklausoje — pakartotinai jo tvirtinti nereikės.
      </p>
      <div className="space-y-2.5">
        <input
          type="password"
          placeholder="Slaptažodis (bent 8 simboliai)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCreateAccount(); }}
          className="h-10 w-full rounded-xl border border-surface-200 bg-white px-3.5 text-body-sm text-surface-900 placeholder:text-surface-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100"
        />
        <Button size="sm" onClick={handleCreateAccount} isLoading={creating}>
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          Sukurti paskyrą
        </Button>
      </div>
      {createError && (
        <p className="mt-2 text-body-sm text-red-600 dark:text-red-400">
          {createError}
          {accountExists && (
            <>
              {" "}
              <Link href="/prisijungti" className="font-medium underline">Prisijungti</Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}
