import Image from "next/image";
import { MapPin, Star, Clock } from "lucide-react";
import type { ProviderCardData } from "@/lib/provider-filters";
import VerifiedBadge from "@/components/ui/VerifiedBadge";

/* ═══════════════════════════════════════════════════════
   Card helpers — shared so the listing and any other surface
   (e.g. the service-landing "recommended masters" block) render
   identical cards and stay in sync.
   ═══════════════════════════════════════════════════════ */

const GRADIENTS = [
  "from-slate-600 to-slate-800",
  "from-slate-700 to-blue-900",
  "from-stone-600 to-stone-800",
  "from-zinc-600 to-zinc-800",
  "from-slate-600 to-emerald-900",
  "from-neutral-600 to-neutral-800",
];

export function pickGradient(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export function pickBadge(
  p: ProviderCardData
): { label: string; cls: string } | null {
  if (p.avgRating !== null && p.avgRating >= 4.5)
    return { label: "Aukštai vertinamas", cls: "bg-amber-500/80 text-white" };
  if (p.avgResponseTimeHours !== null && p.avgResponseTimeHours < 4)
    return { label: "Greitai atsako", cls: "bg-blue-500/80 text-white" };
  if (p.isRecentlyActive)
    return { label: "Aktyvus", cls: "bg-emerald-500/80 text-white" };
  if (p.availableForUrgent)
    return { label: "Skubūs", cls: "bg-orange-500/80 text-white" };
  return null;
}

export function formatResponseTime(hours: number): string {
  if (hours < 1) return "<1 val.";
  if (hours < 24) return `${hours} val.`;
  return `${Math.round(hours / 24)} d.`;
}

/**
 * The provider grid card. Pure presentational — no link/click behaviour of its
 * own; the parent wraps it in an `<a>` (listing → quick-preview drawer,
 * landing → straight to the profile). `selected` draws the drawer-open ring.
 */
export function ProviderCard({
  p,
  selected = false,
}: {
  p: ProviderCardData;
  selected?: boolean;
}) {
  const badge = pickBadge(p);
  const mainCategory =
    p.categories.length > 0 ? p.categories[0].name : "Paslaugų tiekėjas";
  const priceText =
    p.priceFrom !== null && p.priceFrom > 0
      ? `Nuo ${p.priceFrom} €`
      : "Kaina derinama";

  return (
    <article
      className={`h-full overflow-hidden rounded-[28px] bg-white ring-1 ring-black/[0.06] transition-shadow duration-200 hover:shadow-[0_4px_10px_rgba(0,0,0,0.13),0_16px_36px_rgba(0,0,0,0.26)] dark:bg-surface-900 dark:ring-white/[0.08] flex flex-col ${
        selected
          ? "ring-2 ring-brand-500 shadow-[0_4px_10px_rgba(0,0,0,0.13),0_16px_36px_rgba(0,0,0,0.26)]"
          : "shadow-[0_1px_2px_rgba(0,0,0,0.06),0_3px_10px_rgba(0,0,0,0.08)]"
      }`}
    >
      {/* ── Cover image ── */}
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {p.coverImage ? (
          <Image
            src={p.coverImage}
            alt={p.name || ""}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${pickGradient(p.id)}`}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl font-semibold text-white/25">
                {(p.name || "T")[0].toUpperCase()}
              </span>
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="text-lg font-bold text-white truncate leading-tight drop-shadow-sm">
              {p.name}
            </h3>
            {p.isVerified && <VerifiedBadge tier="verified" size="sm" className="drop-shadow-sm" />}
            {p.isYoungTalent && <VerifiedBadge tier="young-talent" size="sm" className="drop-shadow-sm" />}
            {p.isPremium && <VerifiedBadge tier="premium" size="sm" className="drop-shadow-sm" />}
            {p.isGoat && <VerifiedBadge tier="goat" size="sm" className="drop-shadow-sm" />}
          </div>
          {p.location && (
            <p className="mt-0.5 text-[13px] text-white/75 flex items-center gap-1 drop-shadow-sm">
              <MapPin className="h-3 w-3 shrink-0" />
              {p.location}
            </p>
          )}
        </div>

        {badge && (
          <span
            className={`absolute top-3 right-3 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm ${badge.cls}`}
          >
            {badge.label}
          </span>
        )}

        {p.presenceLabel && p.presenceLevel && (
          <span
            className={`absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold backdrop-blur-md ${
              p.presenceLevel === "online"
                ? "bg-white/30 text-white drop-shadow-sm"
                : "bg-white/25 text-white/95 drop-shadow-sm"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                p.presenceLevel === "online" ? "bg-emerald-400 ring-1 ring-emerald-300/40" : "bg-white/80"
              }`}
              aria-hidden
            />
            {p.presenceLabel}
          </span>
        )}
      </div>

      {/* ── Bottom info ── */}
      <div className="flex flex-1 flex-col px-5 py-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[13px] text-surface-500 dark:text-surface-400 truncate">
            {mainCategory}
          </span>
          <span className="text-[13px] font-semibold text-surface-900 dark:text-white whitespace-nowrap">
            {priceText}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-3 text-[12px] text-surface-400">
          {p.avgRating !== null && (
            <span className="inline-flex items-center gap-1 text-surface-600 dark:text-surface-300">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="font-medium">{p.avgRating}</span>
              <span className="text-surface-400">
                ({p.reviewCount})
              </span>
            </span>
          )}
          {p.avgResponseTimeHours !== null && (
            <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <Clock className="h-3 w-3" />
              Atsako per {formatResponseTime(p.avgResponseTimeHours)}
            </span>
          )}
          {p.responseCount > 0 && (
            <span>{p.responseCount} pasiūl.</span>
          )}
          {p.acceptedCount > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400">
              {p.acceptedCount} priimta
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
