import { Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { formatRelativeDate } from "@/lib/utils";

interface ReviewsSectionProps {
  providerId: string;
  avgRating: number | null;
  totalReviews: number;
}

export default async function ReviewsSection({
  providerId,
  avgRating,
  totalReviews,
}: ReviewsSectionProps) {
  const reviews = await prisma.review.findMany({
    where: { providerId },
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      client: { select: { name: true } },
      request: { select: { title: true, category: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const categoryLabel = (val: string) =>
    SERVICE_CATEGORIES.find((c) => c.value === val)?.label || val;

  return (
    <div className="mb-6 rounded-2xl border border-surface-200/60 bg-white p-6 dark:border-surface-700/50 dark:bg-surface-900/50">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-heading-3 font-semibold text-surface-900 dark:text-white">
          Atsiliepimai {totalReviews > 0 && `(${totalReviews})`}
        </h2>
        {avgRating !== null && (
          <div className="flex items-center gap-1.5">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= Math.round(avgRating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-surface-200 dark:text-surface-700"
                  }`}
                />
              ))}
            </div>
            <span className="text-body-sm font-semibold text-surface-900 dark:text-white">
              {avgRating}
            </span>
          </div>
        )}
      </div>

      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="border-b border-surface-100 pb-4 last:border-0 last:pb-0 dark:border-surface-800"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800">
                    <span className="text-micro font-semibold text-surface-500">
                      {(review.client?.name || "K")[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="text-body-sm font-medium text-surface-900 dark:text-white">
                    {review.client?.name || "Klientas"}
                  </span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3 w-3 ${
                          star <= review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-surface-200 dark:text-surface-700"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-micro text-surface-400">
                  {formatRelativeDate(review.createdAt)}
                </span>
              </div>
              {review.comment && (
                <p className="ml-9 text-body-sm leading-relaxed text-surface-600 dark:text-surface-400">
                  {review.comment}
                </p>
              )}
              <p className="ml-9 mt-1 text-micro text-surface-400">
                {categoryLabel(review.request.category)}: {review.request.title}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-6 text-center">
          <Star className="mx-auto mb-2 h-8 w-8 text-surface-200 dark:text-surface-700" />
          <p className="text-body-sm text-surface-400">Atsiliepimų kol kas nėra</p>
        </div>
      )}
    </div>
  );
}
