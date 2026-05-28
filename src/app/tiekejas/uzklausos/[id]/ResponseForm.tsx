"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import Input from "@/components/ui/Input";
import GenerateProposalButton from "@/components/ai/GenerateProposalButton";

interface ResponseFormProps {
  requestId: string;
  totalResponses?: number;
}

export default function ResponseForm({ requestId, totalResponses }: ResponseFormProps) {
  const router = useRouter();
  const [responseMessage, setResponseMessage] = useState("");
  const [responsePrice, setResponsePrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmitResponse() {
    if (responseMessage.length < 10) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/tiekejas/uzklausos/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: responseMessage,
          price: responsePrice ? parseFloat(responsePrice) : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResponseMessage("");
        setResponsePrice("");
        router.refresh();
      } else {
        setError(data.error || "Klaida");
      }
    } catch {
      setError("Klaida");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mb-8">
      <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white mb-1">Pateikti pasiūlymą</h3>
      {totalResponses != null && (
        <p className={`text-micro mb-4 ${
          totalResponses === 0
            ? "text-emerald-600 dark:text-emerald-400"
            : totalResponses <= 2
              ? "text-amber-600 dark:text-amber-400"
              : "text-surface-400"
        }`}>
          {totalResponses === 0
            ? "Dar niekas neatsakė — būkite pirmas!"
            : `Jau ${totalResponses} ${totalResponses === 1 ? "pasiūlymas" : "pasiūlymai"}`}
        </p>
      )}
      {error && <p className="text-body-sm text-red-500 mb-3">{error}</p>}
      <div className="space-y-4">
        <div>
          <Textarea
            id="response"
            label="Jūsų pasiūlymas"
            placeholder="Aprašykite ką galite pasiūlyti, terminus, sąlygas..."
            value={responseMessage}
            onChange={(e) => setResponseMessage(e.target.value)}
            autoResize
          />
          <div className="mt-1.5 flex items-center justify-between text-micro">
            <span className={responseMessage.length > 0 && responseMessage.length < 10 ? "text-red-500 dark:text-red-400" : "text-surface-400"}>
              {responseMessage.length > 0 && responseMessage.length < 10
                ? `Bent 10 simbolių (dar ${10 - responseMessage.length})`
                : "Bent 10 simbolių"}
            </span>
            <span className={responseMessage.length >= 10 ? "text-emerald-600 dark:text-emerald-400" : "text-surface-400"}>
              {responseMessage.length}/10
            </span>
          </div>
          <GenerateProposalButton
            requestId={requestId}
            value={responseMessage}
            onChange={setResponseMessage}
            targetId="response"
            className="mt-2"
          />
        </div>
        <Input
          id="price"
          label="Kaina, € (neprivaloma)"
          type="number"
          placeholder="Pvz.: 150"
          value={responsePrice}
          onChange={(e) => setResponsePrice(e.target.value)}
        />
        <Button onClick={handleSubmitResponse} isLoading={submitting} disabled={responseMessage.length < 10}>
          <Send className="h-4 w-4 mr-2" /> Siųsti pasiūlymą
        </Button>
      </div>
    </Card>
  );
}
