"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin,
  Search,
  Star,
  ArrowRight,
  X,
  Clock,
  Euro,
  CheckCircle,
  MessageSquare,
  ExternalLink,
  Zap,
  FileCheck,
  Globe,
} from "lucide-react";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import type { ProviderCardData } from "@/lib/provider-filters";

/* ═══════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════ */

interface ProviderListingClientProps {
  providers: ProviderCardData[];
  page: number;
  totalPages: number;
  hasActiveFilters: boolean;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
}

interface ProviderDetail {
  id: string;
  slug: string | null;
  name: string;
  image: string | null;
  images: string[];
  description: string | null;
  headline: string | null;
  services: string | null;
  priceFrom: number | null;
  experienceYears: number | null;
  offersInvoices: boolean;
  availableForUrgent: boolean;
  specializations: string[];
  location: string | null;
  website: string | null;
  planType: string;
  badge: string | null;
  responseCount: number;
  acceptedCount: number;
  avgResponseTimeHours: number | null;
  profileCompleteness: number;
  avgRating: number | null;
  totalReviews: number;
  reviews: Array<{
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    clientName: string;
    requestTitle: string;
    requestCategory: string;
  }>;
  lastActiveAt: string;
  memberSince: string;
}

/* ═══════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════ */

const specLabel = (val: string) =>
  SERVICE_CATEGORIES.find((c) => c.value === val)?.label || val;

const GRADIENTS = [
  "from-slate-600 to-slate-800",
  "from-slate-700 to-blue-900",
  "from-stone-600 to-stone-800",
  "from-zinc-600 to-zinc-800",
  "from-slate-600 to-emerald-900",
  "from-neutral-600 to-neutral-800",
];

function pickGradient(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function pickBadge(
  p: ProviderCardData
): { label: string; cls: string } | null {
  if (p.avgRating !== null && p.avgRating >= 4.5)
    return { label: "Top", cls: "bg-amber-500/80 text-white" };
  if (p.avgResponseTimeHours !== null && p.avgResponseTimeHours < 4)
    return { label: "Greitai atsako", cls: "bg-blue-500/80 text-white" };
  if (p.isRecentlyActive)
    return { label: "Aktyvus", cls: "bg-emerald-500/80 text-white" };
  if (p.availableForUrgent)
    return { label: "Skubūs", cls: "bg-orange-500/80 text-white" };
  return null;
}

function formatResponseTime(hours: number): string {
  if (hours < 1) return "<1 val.";
  if (hours < 24) return `${hours} val.`;
  return `${Math.round(hours / 24)} d.`;
}

/* ═══════════════════════════════════════════════════════
   Prefetch cache — shared across renders
   ═══════════════════════════════════════════════════════ */

const prefetchCache = new Map<
  string,
  { data: ProviderDetail | null; promise: Promise<ProviderDetail | null> | null }
>();

function prefetchProvider(id: string) {
  if (prefetchCache.has(id)) return prefetchCache.get(id)!;

  const entry: {
    data: ProviderDetail | null;
    promise: Promise<ProviderDetail | null> | null;
  } = { data: null, promise: null };

  entry.promise = fetch(`/api/tiekejai/${id}`)
    .then((r) => r.json())
    .then((json) => {
      const d = json.success ? (json.data as ProviderDetail) : null;
      entry.data = d;
      return d;
    })
    .catch(() => {
      entry.data = null;
      return null;
    });

  prefetchCache.set(id, entry);
  return entry;
}

async function getProviderDetail(
  id: string
): Promise<ProviderDetail | null> {
  const entry = prefetchCache.get(id);
  if (entry?.data) return entry.data;
  if (entry?.promise) return entry.promise;
  return prefetchProvider(id).promise;
}

/* ═══════════════════════════════════════════════════════
   Sheet skeleton
   ═══════════════════════════════════════════════════════ */

function SheetSkeleton() {
  return (
    <div className="animate-pulse space-y-5 p-6">
      {/* Cover */}
      <div className="h-48 rounded-2xl bg-surface-200 dark:bg-surface-700" />
      {/* Title */}
      <div className="space-y-2">
        <div className="h-6 w-3/4 rounded bg-surface-200 dark:bg-surface-700" />
        <div className="h-4 w-1/2 rounded bg-surface-100 dark:bg-surface-800" />
      </div>
      {/* Stats row */}
      <div className="flex gap-3">
        <div className="h-10 w-20 rounded-xl bg-surface-100 dark:bg-surface-800" />
        <div className="h-10 w-20 rounded-xl bg-surface-100 dark:bg-surface-800" />
        <div className="h-10 w-20 rounded-xl bg-surface-100 dark:bg-surface-800" />
      </div>
      {/* Description */}
      <div className="space-y-2">
        <div className="h-3 w-full rounded bg-surface-100 dark:bg-surface-800" />
        <div className="h-3 w-full rounded bg-surface-100 dark:bg-surface-800" />
        <div className="h-3 w-2/3 rounded bg-surface-100 dark:bg-surface-800" />
      </div>
      {/* Reviews */}
      <div className="h-20 rounded-xl bg-surface-100 dark:bg-surface-800" />
      {/* CTA */}
      <div className="h-12 rounded-2xl bg-surface-200 dark:bg-surface-700" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Sheet content — provider details
   ═══════════════════════════════════════════════════════ */

function SheetContent({
  detail,
}: {
  detail: ProviderDetail;
}) {
  const coverImg = detail.images[0] || detail.image;
  const daysSince = Math.floor(
    (Date.now() - new Date(detail.lastActiveAt).getTime()) / (86400000)
  );
  const isActive = daysSince <= 7;
  const memberDate = new Date(detail.memberSince).toLocaleDateString("lt-LT", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* Cover */}
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          {coverImg ? (
            <Image
              src={coverImg}
              alt={detail.name || ""}
              fill
              sizes="480px"
              className="object-cover"
              priority
            />
          ) : (
            <div
              className={`absolute inset-0 bg-gradient-to-br ${pickGradient(detail.id)}`}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl font-semibold text-white/20">
                  {(detail.name || "T")[0].toUpperCase()}
                </span>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-4">
            <h2 className="text-xl font-bold text-white drop-shadow-sm">
              {detail.name}
            </h2>
            {detail.headline && (
              <p className="mt-0.5 text-sm text-white/80 line-clamp-1">
                {detail.headline}
              </p>
            )}
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Quick stats row */}
          <div className="flex flex-wrap gap-2">
            {detail.avgRating !== null && (
              <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 dark:bg-amber-500/10">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                  {detail.avgRating}
                </span>
                <span className="text-xs text-amber-600/70 dark:text-amber-400/70">
                  ({detail.totalReviews})
                </span>
              </div>
            )}
            {detail.location && (
              <div className="flex items-center gap-1.5 rounded-xl bg-surface-100 px-3 py-2 dark:bg-surface-800">
                <MapPin className="h-3.5 w-3.5 text-surface-400" />
                <span className="text-sm text-surface-600 dark:text-surface-300">
                  {detail.location}
                </span>
              </div>
            )}
            {isActive && (
              <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10">
                <Clock className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-sm text-emerald-700 dark:text-emerald-300">
                  Aktyvus
                </span>
              </div>
            )}
          </div>

          {/* Key info grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoTile
              label="Kaina nuo"
              value={
                detail.priceFrom
                  ? `${detail.priceFrom} €`
                  : "Derinama"
              }
              icon={<Euro className="h-4 w-4" />}
            />
            <InfoTile
              label="Pasiūlymai"
              value={String(detail.responseCount)}
              icon={<MessageSquare className="h-4 w-4" />}
            />
            {detail.acceptedCount > 0 && (
              <InfoTile
                label="Priimta"
                value={String(detail.acceptedCount)}
                icon={<CheckCircle className="h-4 w-4" />}
              />
            )}
            {detail.avgResponseTimeHours !== null && (
              <InfoTile
                label="Atsako per"
                value={
                  detail.avgResponseTimeHours < 1
                    ? "<1 val."
                    : `${detail.avgResponseTimeHours} val.`
                }
                icon={<Clock className="h-4 w-4" />}
              />
            )}
          </div>

          {/* Specializations */}
          {detail.specializations.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">
                Specializacijos
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {detail.specializations.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-surface-100 px-3 py-1 text-xs text-surface-600 dark:bg-surface-800 dark:text-surface-300"
                  >
                    {specLabel(s)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Trust badges */}
          <div className="flex flex-wrap gap-2">
            {detail.availableForUrgent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                <Zap className="h-3 w-3" />
                Atlieka skubius darbus
              </span>
            )}
            {detail.offersInvoices && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                <FileCheck className="h-3 w-3" />
                Išrašo sąskaitą
              </span>
            )}
            {detail.website && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-100 px-2.5 py-1 text-xs font-medium text-surface-600 dark:bg-surface-800 dark:text-surface-300">
                <Globe className="h-3 w-3" />
                Svetainė
              </span>
            )}
          </div>

          {/* Description */}
          {detail.description && (
            <div>
              <h4 className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">
                Apie
              </h4>
              <p className="text-sm text-surface-600 dark:text-surface-300 leading-relaxed line-clamp-6">
                {detail.description}
              </p>
            </div>
          )}

          {/* Top review */}
          {detail.reviews.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-surface-400 uppercase tracking-wider mb-2">
                Naujausias atsiliepimas
              </h4>
              <div className="rounded-2xl bg-surface-50 p-4 dark:bg-surface-800/50">
                <div className="flex items-center gap-1.5 mb-1.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < detail.reviews[0].rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-surface-200 dark:text-surface-600"
                      }`}
                    />
                  ))}
                </div>
                {detail.reviews[0].comment && (
                  <p className="text-sm text-surface-600 dark:text-surface-300 line-clamp-3 leading-relaxed">
                    &ldquo;{detail.reviews[0].comment}&rdquo;
                  </p>
                )}
                <p className="mt-1.5 text-xs text-surface-400">
                  — {detail.reviews[0].clientName}
                </p>
              </div>
            </div>
          )}

          {/* Member since */}
          <p className="text-xs text-surface-400">
            Narys nuo {memberDate}
          </p>
        </div>
      </div>

      {/* Sticky CTA footer */}
      <div className="shrink-0 border-t border-surface-200 bg-white px-6 py-4 dark:border-surface-700 dark:bg-surface-900">
        <div className="flex gap-3">
          <Link
            href={`/tiekejai/${detail.id}`}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors active:scale-[0.98]"
            onClick={(e) => e.stopPropagation()}
          >
            Visas profilis
            <ExternalLink className="h-4 w-4" />
          </Link>
          <Link
            href={`/tiekejai/${detail.id}#zinute`}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-surface-200 bg-white px-5 py-3 text-sm font-semibold text-surface-700 hover:bg-surface-50 transition-colors active:scale-[0.98] dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
            onClick={(e) => e.stopPropagation()}
          >
            <MessageSquare className="h-4 w-4" />
            Parašyti
          </Link>
        </div>
      </div>
    </div>
  );
}

function InfoTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-surface-50 px-4 py-3 dark:bg-surface-800/50">
      <div className="flex items-center gap-1.5 text-surface-400 mb-1">
        {icon}
        <span className="text-[11px] uppercase tracking-wider font-medium">
          {label}
        </span>
      </div>
      <p className="text-sm font-semibold text-surface-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════ */

export default function ProviderListingClient({
  providers,
  page,
  totalPages,
  hasActiveFilters,
  onPageChange,
  onClearFilters,
}: ProviderListingClientProps) {

  /* ── Sheet state ── */
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetProviderId, setSheetProviderId] = useState<string | null>(null);
  const [sheetDetail, setSheetDetail] = useState<ProviderDetail | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  /* ── Open sheet ── */
  const openSheet = useCallback(
    async (id: string) => {
      setSheetProviderId(id);
      setSheetOpen(true);
      setSheetLoading(true);
      setSheetDetail(null);

      // Shallow URL update
      const url = new URL(window.location.href);
      url.searchParams.set("provider", id);
      window.history.pushState({}, "", url.toString());

      const detail = await getProviderDetail(id);
      setSheetDetail(detail);
      setSheetLoading(false);
    },
    []
  );

  /* ── Close sheet ── */
  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    // Restore URL
    const url = new URL(window.location.href);
    url.searchParams.delete("provider");
    const qs = url.searchParams.toString();
    window.history.pushState(
      {},
      "",
      `${url.pathname}${qs ? `?${qs}` : ""}`
    );
    // Delay cleanup for exit animation
    setTimeout(() => {
      setSheetProviderId(null);
      setSheetDetail(null);
    }, 250);
  }, []);

  /* ── Handle popstate (back button) ── */
  useEffect(() => {
    function handlePop() {
      const url = new URL(window.location.href);
      const pid = url.searchParams.get("provider");
      if (!pid && sheetOpen) {
        setSheetOpen(false);
        setTimeout(() => {
          setSheetProviderId(null);
          setSheetDetail(null);
        }, 250);
      } else if (pid && !sheetOpen) {
        openSheet(pid);
      }
    }
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [sheetOpen, openSheet]);

  /* ── Open from URL on mount ── */
  useEffect(() => {
    const url = new URL(window.location.href);
    const pid = url.searchParams.get("provider");
    if (pid) openSheet(pid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Lock body scroll when sheet is open ── */
  useEffect(() => {
    if (sheetOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  /* ── Keyboard: Escape closes sheet ── */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && sheetOpen) closeSheet();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [sheetOpen, closeSheet]);

  /* ── Prefetch on hover ── */
  const handleMouseEnter = useCallback((id: string) => {
    prefetchProvider(id);
  }, []);

  /* ── Card click ── */
  const handleCardClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      openSheet(id);
    },
    [openSheet]
  );

  return (
    <>
      {providers.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => {
            const badge = pickBadge(p);
            const mainSpec =
              p.specializations.length > 0
                ? specLabel(p.specializations[0])
                : "Paslaugų tiekėjas";
            const priceText =
              p.priceFrom !== null && p.priceFrom > 0
                ? `Nuo ${p.priceFrom} €`
                : "Kaina derinama";

            return (
              <a
                key={p.id}
                href={`/tiekejai/${p.id}`}
                className="block h-full cursor-pointer select-none"
                onMouseEnter={() => handleMouseEnter(p.id)}
                onClick={(e) => handleCardClick(e, p.id)}
              >
                <article
                  className={`h-full overflow-hidden rounded-[28px] bg-white ring-1 ring-black/[0.06] transition-shadow duration-200 hover:shadow-[0_4px_10px_rgba(0,0,0,0.13),0_16px_36px_rgba(0,0,0,0.26)] dark:bg-surface-900 dark:ring-white/[0.08] flex flex-col ${
                    sheetProviderId === p.id
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
                      <h3 className="text-lg font-bold text-white truncate leading-tight drop-shadow-sm">
                        {p.name}
                      </h3>
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
                  </div>

                  {/* ── Bottom info ── */}
                  <div className="flex flex-1 flex-col px-5 py-3.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[13px] text-surface-500 dark:text-surface-400 truncate">
                        {mainSpec}
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
              </a>
            );
          })}
        </div>
      ) : (
        /* ── Empty state ── */
        <div className="rounded-[28px] border border-dashed border-surface-300 bg-white p-12 text-center dark:border-surface-700 dark:bg-surface-900">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-100 dark:bg-surface-800">
            <Search className="h-6 w-6 text-surface-400" />
          </div>
          <p className="text-body font-semibold text-surface-700 dark:text-surface-300">
            {hasActiveFilters
              ? "Tiekėjų pagal pasirinktus filtrus nerasta"
              : "Tiekėjų kol kas nėra"}
          </p>
          <p className="mt-1.5 text-body-sm text-surface-400 max-w-md mx-auto">
            {hasActiveFilters
              ? "Pabandykite pakeisti filtrus arba peržiūrėti visus tiekėjus"
              : "Platforma dar tik auga. Paskelbkite užklausą — ji bus matoma visiems būsimiems tiekėjams."}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="inline-flex items-center gap-1.5 rounded-full border border-surface-200 bg-white px-5 py-2.5 text-body-sm font-semibold text-surface-700 hover:bg-surface-50 transition-colors dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
              >
                Išvalyti filtrus
              </button>
            )}
            <Link
              href="/uzklausos/nauja"
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-body-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
            >
              Paskelbti užklausą
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center items-center gap-2">
          {page > 1 && (
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              className="rounded-full border border-surface-200 bg-white px-5 py-2.5 text-body-sm font-medium text-surface-600 hover:bg-surface-50 transition-all dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
            >
              Ankstesnis
            </button>
          )}
          <span className="flex items-center px-4 text-body-sm text-surface-500 font-medium">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              className="rounded-full border border-surface-200 bg-white px-5 py-2.5 text-body-sm font-medium text-surface-600 hover:bg-surface-50 transition-all dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
            >
              Kitas
            </button>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          Provider detail Sheet / Drawer
          ═══════════════════════════════════════════ */}

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] transition-opacity duration-250 ${
          sheetOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={closeSheet}
        aria-hidden="true"
      />

      {/* Sheet panel */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal={sheetOpen}
        aria-label="Tiekėjo peržiūra"
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-surface-900 shadow-2xl transition-transform duration-250 ease-out ${
          sheetOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Close button */}
        <button
          onClick={closeSheet}
          className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur-sm hover:bg-black/40 transition-colors"
          aria-label="Uždaryti"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="h-full flex flex-col">
          {sheetLoading || !sheetDetail ? (
            <SheetSkeleton />
          ) : (
            <SheetContent detail={sheetDetail} />
          )}
        </div>
      </div>
    </>
  );
}
