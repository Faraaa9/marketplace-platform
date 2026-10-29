"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { BUTTON_GHOST } from "@/components/account/ui";
import { clearGuestRequest } from "@/lib/guest-request";
import { trackEvent } from "@/lib/analytics-events";
import { cn } from "@/lib/utils";
import { useMounted } from "@/lib/use-mounted";

/** "← Mano užklausos" — only meaningful for a signed-in owner; guests reach
 *  the tracker from an emailed link and have no list to go back to. */
export function BackToRequests() {
  const { status } = useSession();
  const mounted = useMounted();
  if (!mounted || status !== "authenticated") return null;
  return (
    <Link href="/paskyra/uzklausos" className={cn(BUTTON_GHOST, "self-start")}>
      ← Mano užklausos
    </Link>
  );
}

interface RequestActionsProps {
  trackingToken: string;
  status: string;
  /** Public board link; null while the request is not publicly listed. */
  publicHref: string | null;
}

export default function RequestActions({ trackingToken, status, publicHref }: RequestActionsProps) {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [busy, setBusy] = useState<"" | "close" | "delete" | "reopen">("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const isOpen = status === "OPEN";
  const isExpired = status === "EXPIRED";
  const isClosed = status === "CLOSED" || isExpired;

  async function share() {
    if (!publicHref) return;
    // The public listing, never the tracking link: the token grants control
    // over the request (accepting offers, deleting).
    const url = new URL(publicHref, window.location.origin).toString();
    try {
      if (navigator.share) {
        await navigator.share({ url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Share sheet dismissed — nothing to do.
    }
  }

  async function changeStatus(action: "close" | "reopen", failMessage: string) {
    setBusy(action);
    setError("");
    try {
      const res = await fetch(`/api/tracking/${trackingToken}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => null);
      if (data?.success) router.refresh();
      else setError(data?.error || failMessage);
    } catch {
      setError(failMessage);
    } finally {
      setBusy("");
    }
  }

  async function closeRequest() {
    if (!confirm("Ar tikrai norite uždaryti šią užklausą? Nauji pasiūlymai nebebus priimami.")) return;
    await changeStatus("close", "Nepavyko uždaryti užklausos");
  }

  async function deleteRequest() {
    if (!confirm("Ar tikrai norite ištrinti šią užklausą? Šio veiksmo atšaukti negalėsite.")) return;
    setBusy("delete");
    setError("");
    try {
      const res = await fetch(`/api/tracking/${trackingToken}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        clearGuestRequest();
        router.push(sessionStatus === "authenticated" ? "/paskyra/uzklausos" : "/");
        return;
      }
      setError(data?.error || "Nepavyko ištrinti užklausos");
    } catch {
      setError("Nepavyko ištrinti. Bandykite dar kartą.");
    }
    setBusy("");
  }

  if (isClosed && !isExpired && !publicHref) return null;

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        {isOpen && (
          <Link
            href={`/uzklausos/sekti/${trackingToken}/redaguoti`}
            onClick={() => trackEvent("request_tracker_edit_clicked", { source: "toolbar" })}
            className={BUTTON_GHOST}
          >
            Redaguoti
          </Link>
        )}
        {publicHref && (
          <button type="button" onClick={share} className={BUTTON_GHOST}>
            {copied ? "Nuoroda nukopijuota" : "Dalintis nuoroda"}
          </button>
        )}
        {isExpired && (
          <button
            type="button"
            onClick={() => changeStatus("reopen", "Nepavyko atnaujinti užklausos")}
            disabled={busy !== ""}
            className={BUTTON_GHOST}
          >
            {busy === "reopen" ? "Atnaujinama…" : "Atnaujinti užklausą"}
          </button>
        )}
        {!isClosed && (
          <button type="button" onClick={closeRequest} disabled={busy !== ""} className={BUTTON_GHOST}>
            {busy === "close" ? "Uždaroma…" : "Uždaryti"}
          </button>
        )}
        {isOpen && (
          <button
            type="button"
            onClick={deleteRequest}
            disabled={busy !== ""}
            className={cn(BUTTON_GHOST, "text-red-700 hover:border-red-600 hover:text-red-700 dark:text-red-400")}
          >
            {busy === "delete" ? "Trinama…" : "Ištrinti"}
          </button>
        )}
      </div>
      {error && <p className="text-caption text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}

/** Pending-confirmation notice with a working "send again" button. */
export function ResendConfirmation({ trackingToken }: { trackingToken: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function resend() {
    setState("sending");
    try {
      const res = await fetch(`/api/tracking/${trackingToken}/resend-confirmation`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setState("sent");
        return;
      }
      setError(data?.error || "Nepavyko išsiųsti laiško.");
    } catch {
      setError("Nepavyko išsiųsti laiško.");
    }
    setState("error");
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 px-4 py-3.5 text-body-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
      <div className="min-w-0 flex-[1_1_260px]">
        <p className="font-semibold">Patvirtinkite el. paštą</p>
        <p className="mt-0.5 opacity-90">
          {state === "sent"
            ? "Laiškas išsiųstas — paspauskite jame esančią nuorodą."
            : state === "error"
              ? error
              : "Meistrai užklausą pamatys tik ją patvirtinus. Ieškokite laiško savo pašte."}
        </p>
      </div>
      {state !== "sent" && (
        <button type="button" onClick={resend} disabled={state === "sending"} className={BUTTON_GHOST}>
          {state === "sending" ? "Siunčiama…" : "Siųsti laišką iš naujo"}
        </button>
      )}
    </div>
  );
}
