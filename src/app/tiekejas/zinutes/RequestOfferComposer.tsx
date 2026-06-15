"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Wallet } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import GenerateProposalButton from "@/components/ai/GenerateProposalButton";
import { decodeHtmlEntities, formatRelativeDate } from "@/lib/utils";

type RequestResponse = {
  id: string;
};

type ProviderRequest = {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryNames: string[];
  location: string;
  budget?: string | null;
  deadline?: string | null;
  status: string;
  createdAt: string;
  responses: RequestResponse[];
  totalResponses: number;
  isUnlocked: boolean;
  creditBalance: number;
  canRespond: boolean;
  eligibilityMessage?: string | null;
};

export default function RequestOfferComposer({
  requestId,
  onBack,
  onCreated,
}: {
  requestId: string;
  onBack: () => void;
  onCreated: (responseId: string) => void;
}) {
  const [request, setRequest] = useState<ProviderRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");

  const loadRequest = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/tiekejas/uzklausos/${requestId}`, { cache: "no-store" });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.error || "Nepavyko įkelti užklausos");
      const data = payload.data as ProviderRequest;
      const existingResponseId = data.responses[0]?.id;
      if (existingResponseId) {
        onCreated(existingResponseId);
        return;
      }
      setRequest(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepavyko įkelti užklausos");
    } finally {
      setLoading(false);
    }
  }, [onCreated, requestId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount: setState runs inside async loadRequest, not synchronously in the effect body
    void loadRequest();
  }, [loadRequest]);

  async function unlockRequest() {
    if (unlocking) return;
    setUnlocking(true);
    setError("");
    try {
      const res = await fetch(`/api/tiekejas/uzklausos/${requestId}/unlock`, {
        method: "POST",
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.error || "Nepavyko atrakinti užklausos");
      await loadRequest();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepavyko atrakinti užklausos");
    } finally {
      setUnlocking(false);
    }
  }

  async function submitOffer() {
    if (!request || message.trim().length < 10 || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/tiekejas/uzklausos/${request.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          price: price ? Number(price) : undefined,
        }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) throw new Error(payload?.error || "Nepavyko išsiųsti pasiūlymo");
      onCreated(payload.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepavyko išsiųsti pasiūlymo");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center text-body-sm text-[#6B6760]">
        Kraunama...
      </div>
    );
  }

  if (!request) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center px-6 text-center">
        <div>
          <p className="text-body-sm text-red-600">{error || "Užklausa nerasta"}</p>
          <button
            type="button"
            onClick={onBack}
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#DDD3C5] bg-white px-4 text-body-sm font-semibold text-[#1E1B18]"
          >
            Grįžti į žinutes
          </button>
        </div>
      </div>
    );
  }

  const categoryLabel = request.categoryNames[0] || request.category;
  const canStart = request.status === "OPEN" && request.canRespond;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#FFFDF8]">
      <div className="flex min-h-[54px] items-center gap-3 border-b border-[#DDD3C5] px-4 py-1.5 md:px-5">
        <button
          type="button"
          onClick={onBack}
          className="grid min-h-11 min-w-11 place-items-center rounded-xl text-[#6B6760] hover:bg-[#F1E7DA] hover:text-[#1E1B18]"
          aria-label="Grįžti į žinutes"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-body font-semibold text-[#1E1B18]">
            {decodeHtmlEntities(request.title)}
          </p>
          <p className="truncate text-caption text-[#6B6760]">
            {categoryLabel} · {request.location}
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
        <section className="rounded-2xl border border-[#DED2C1] bg-white p-4 shadow-[0_8px_24px_rgba(93,70,54,0.08)]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-micro font-bold text-brand-700">
              Užklausa
            </span>
            <span className="rounded-full bg-[#F1EEE8] px-2.5 py-1 text-micro font-bold text-[#6D675F]">
              {formatRelativeDate(request.createdAt)}
            </span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-body-sm leading-relaxed text-[#4D4740]">
            {decodeHtmlEntities(request.description)}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-caption text-[#6B6760]">
            {request.budget && <span>Biudžetas: {request.budget}</span>}
            {request.deadline && <span>Terminas: {request.deadline}</span>}
            <span>{request.totalResponses} pasiūlymai</span>
          </div>
        </section>

        {!canStart ? (
          <section className="mt-4 rounded-2xl border border-[#DED2C1] bg-white p-4 text-body-sm text-[#6B6760]">
            {request.eligibilityMessage || "Šiai užklausai pasiūlymo siųsti negalima."}
          </section>
        ) : !request.isUnlocked ? (
          <section className="mt-4 rounded-2xl border border-[#DED2C1] bg-white p-4">
            <div className="flex items-start gap-3">
              <Wallet className="mt-0.5 h-5 w-5 text-brand-600" />
              <div className="min-w-0 flex-1">
                <h2 className="text-body font-semibold text-[#1E1B18]">Atrakinkite kontaktą</h2>
                <p className="mt-1 text-body-sm text-[#6B6760]">
                  Turite {request.creditBalance} kredit{request.creditBalance === 1 ? "ą" : "us"}.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" onClick={unlockRequest} isLoading={unlocking}>
                    Atrakinti užklausą
                  </Button>
                  <Link
                    href="/tiekejas/planai"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#DDD3C5] px-4 text-body-sm font-semibold text-[#1E1B18]"
                  >
                    Kreditai
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-4 rounded-2xl border border-[#DED2C1] bg-white p-4">
            <h2 className="text-body font-semibold text-[#1E1B18]">Pasiūlymas klientui</h2>
            <div className="mt-4 space-y-4">
              <Textarea
                id="provider-offer-message"
                label="Žinutė"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Trumpai parašykite, kada galite pradėti, kokia preliminari kaina ir ką reikia patikslinti."
                autoResize
              />
              <GenerateProposalButton
                requestId={request.id}
                value={message}
                onChange={setMessage}
                targetId="provider-offer-message"
              />
              <Input
                id="provider-offer-price"
                label="Orientacinė kaina, €"
                type="number"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="Pvz.: 150"
              />
              {error && <p className="text-body-sm text-red-600">{error}</p>}
              <Button
                type="button"
                onClick={submitOffer}
                isLoading={submitting}
                disabled={message.trim().length < 10}
              >
                <Send className="mr-2 h-4 w-4" />
                Siųsti ir atidaryti pokalbį
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
