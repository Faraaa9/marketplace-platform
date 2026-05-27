import Image from "next/image";
import { MapPin, Wallet, CalendarClock, MessageSquare, Paperclip } from "lucide-react";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary-image";

interface ListingPreviewProps {
  title: string;
  description: string;
  /** Legacy single-category label. Used when categoryLabels is not provided. */
  categoryLabel?: string;
  /** Up to 3 category names, primary first. Preferred over categoryLabel. */
  categoryLabels?: string[];
  location: string;
  budget: string;
  deadline: string;
  attachmentUrls?: string[];
  showNewBadge?: boolean;
  responseCount?: number;
  className?: string;
}

/** Paper-note preview of a service request — exactly how providers see the listing. */
export default function ListingPreview({
  title,
  description,
  categoryLabel,
  categoryLabels,
  location,
  budget,
  deadline,
  attachmentUrls = [],
  showNewBadge = true,
  responseCount = 0,
  className = "",
}: ListingPreviewProps) {
  // Prefer the multi array when provided; fall back to the legacy single label
  // so existing callers that haven't migrated keep working unchanged.
  const labels: string[] = (() => {
    if (categoryLabels && categoryLabels.length > 0) {
      return categoryLabels.filter((label) => label.trim().length > 0);
    }
    if (categoryLabel && categoryLabel.trim().length > 0) {
      return [categoryLabel];
    }
    return [];
  })();
  const hasLabels = labels.length > 0;

  return (
    <article className={`paper-note ${className}`}>
      <div className="paper-note__shadow">
        <div className="paper-note__sheet px-6 pb-9 pt-11 sm:px-9">
          {hasLabels && (
            <div className="flex flex-wrap items-center gap-1.5">
              {labels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center rounded-md bg-[#ebe2cb] px-2.5 py-1 font-serif text-[0.78rem] font-medium text-[#6f6042] ring-1 ring-inset ring-[#d3c6a2]/70 dark:bg-surface-800 dark:text-surface-300 dark:ring-surface-700"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
          <h3
            className={`${hasLabels ? "mt-3.5" : ""} font-serif text-[1.5rem] font-semibold leading-snug text-surface-900 dark:text-white sm:text-[1.7rem]`}
          >
            {title.trim() || (
              <span className="text-surface-300 dark:text-surface-600">Skelbimo pavadinimas</span>
            )}
            {showNewBadge && (
              <span className="ml-2 inline-block -rotate-3 rounded border border-brand-500/50 px-1.5 py-0.5 align-middle text-[0.6rem] font-bold uppercase tracking-wider text-brand-600 dark:border-brand-400/50 dark:text-brand-400">
                Nauja
              </span>
            )}
          </h3>
          <p className="mt-2 whitespace-pre-wrap text-[0.92rem] leading-relaxed text-surface-600 dark:text-surface-300">
            {description.trim() || (
              <span className="text-surface-300 dark:text-surface-600">
                Aprašymas dar neįrašytas…
              </span>
            )}
          </p>
          {attachmentUrls.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {attachmentUrls.slice(0, 5).map((url, i) => (
                <div
                  key={url}
                  className="relative h-14 w-14 overflow-hidden rounded-md border border-[#d8cda6] dark:border-surface-700"
                >
                  <Image
                    src={optimizeCloudinaryUrl(url, { width: 112, height: 112, crop: "fill" })}
                    alt={`Nuotrauka ${i + 1}`}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
              ))}
              <span className="inline-flex items-center gap-1 text-[0.78rem] text-surface-500 dark:text-surface-400">
                <Paperclip className="h-3.5 w-3.5" />
                {attachmentUrls.length === 1
                  ? "1 nuotrauka"
                  : `${attachmentUrls.length} nuotraukos`}
              </span>
            </div>
          )}
          <div className="mt-5 border-t border-[#d8cda6] dark:border-surface-700/70" />
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.8rem] text-surface-600 dark:text-surface-300">
            {location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-surface-400" />
                {location}
              </span>
            )}
            {budget.trim() && (
              <span className="inline-flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-surface-400" />
                {budget}
              </span>
            )}
            {deadline.trim() && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5 text-surface-400" />
                {deadline}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-surface-400" />
              {responseCount} pasiūlymų
            </span>
          </div>
        </div>
      </div>
      <span aria-hidden className="pin absolute left-5 top-3.5" />
      <span aria-hidden className="pin absolute right-5 top-3.5" />
    </article>
  );
}
