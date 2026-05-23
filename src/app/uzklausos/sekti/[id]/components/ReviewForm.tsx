"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Star } from "lucide-react";
import Button from "@/components/ui/Button";

interface ReviewFormProps {
  requestId: string;
  responseId: string;
  providerName: string;
  trackingToken: string;
  clientId?: string | null;
  onSubmitted: () => void;
}

export default function ReviewForm({
  requestId,
  responseId,
  providerName,
  trackingToken,
  clientId,
  onSubmitted,
}: ReviewFormProps) {
  const { data: session } = useSession();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState("");

  async function handleSubmit() {
    if (rating === 0) {
      setReviewError("Pasirinkite įvertinimą");
      return;
    }
    setSubmitting(true);
    setReviewError("");
    try {
      const useSessionEndpoint = session?.user?.id && clientId === session.user.id;
      const url = useSessionEndpoint
        ? "/api/reviews"
        : `/api/tracking/${trackingToken}/reviews`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, responseId, rating, comment }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        onSubmitted();
      } else {
        setReviewError(data.error || "Klaida");
      }
    } catch {
      setReviewError("Klaida pateikiant atsiliepimą");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mt-4 rounded-xl border border-emerald-200/60 bg-emerald-50 p-4 dark:border-emerald-800/40 dark:bg-emerald-500/10">
        <p className="text-body-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
          <Star className="h-4 w-4 fill-emerald-500 text-emerald-500" />
          Ačiū už atsiliepimą!
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-brand-200/60 bg-brand-50/30 p-4 dark:border-brand-800/40 dark:bg-brand-950/30">
      <p className="text-body-sm font-medium text-surface-900 dark:text-white mb-3">
        Įvertinkite {providerName}
      </p>

      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={`h-7 w-7 transition-colors ${
                star <= (hoveredRating || rating)
                  ? "fill-amber-400 text-amber-400"
                  : "text-surface-300 dark:text-surface-600"
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-body-sm text-surface-500 self-center">
            {rating}/5
          </span>
        )}
      </div>

      <textarea
        placeholder="Palikite komentarą (neprivaloma)..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        className="w-full rounded-xl border border-surface-200 bg-white px-3 py-2 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-all dark:border-surface-700 dark:bg-surface-800 dark:text-white mb-3"
      />

      {reviewError && (
        <p className="text-body-sm text-red-600 dark:text-red-400 mb-2">{reviewError}</p>
      )}

      <Button size="sm" onClick={handleSubmit} isLoading={submitting} disabled={rating === 0}>
        <Star className="h-3.5 w-3.5 mr-1" />
        Pateikti atsiliepimą
      </Button>
    </div>
  );
}
