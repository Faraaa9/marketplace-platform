"use client";

import { useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Shield, MessageSquare, Search, Clock, Award, Star, ArrowRight } from "lucide-react";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import {
  useProviderFilterStore,
  type ProviderCardData,
} from "@/store/useProviderFilterStore";

interface ProviderListingClientProps {
  providers: ProviderCardData[];
  serverSearch: string;
  serverPage: number;
  serverTotalPages: number;
  serverTotal: number;
}

const categoryLabel = (val: string) =>
  SERVICE_CATEGORIES.find((c) => c.value === val)?.label || val;

export default function ProviderListingClient({
  providers,
  serverSearch,
  serverPage,
  serverTotalPages,
  serverTotal,
}: ProviderListingClientProps) {
  const setServerProviders = useProviderFilterStore((s) => s.setServerProviders);
  const clientCategory = useProviderFilterStore((s) => s.clientCategory);
  const clientLocation = useProviderFilterStore((s) => s.clientLocation);
  const getFilteredProviders = useProviderFilterStore((s) => s.getFilteredProviders);

  // Hydrate store when server data changes
  useEffect(() => {
    setServerProviders(providers);
  }, [providers, setServerProviders]);

  const filtered = useMemo(
    () => getFilteredProviders(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [providers, clientCategory, clientLocation]
  );

  const hasClientFilters = clientCategory || clientLocation;
  const hasAnyFilters = hasClientFilters || serverSearch;

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    if (overrides.search ?? serverSearch) p.set("search", overrides.search ?? serverSearch);
    const np = overrides.page ?? String(serverPage);
    if (np !== "1") p.set("page", np);
    const qs = p.toString();
    return `/tiekejai${qs ? `?${qs}` : ""}`;
  }

  return (
    <>
      {/* Provider cards */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link key={p.id} href={`/tiekejai/${p.id}`} className="group block">
              <article className="h-full rounded-2xl border border-surface-200/60 bg-white p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-brand-200/60 dark:border-surface-700/50 dark:bg-surface-900/50 dark:hover:border-brand-700/50 flex flex-col">
                {/* Avatar + name */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`shrink-0 rounded-full ${p.hasActiveStory ? "bg-gradient-to-tr from-brand-500 via-violet-500 to-amber-400 p-[3px]" : ""}`}>
                    <div className={`h-12 w-12 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center overflow-hidden ${p.hasActiveStory ? "border-2 border-white dark:border-surface-900" : ""}`}>
                      {p.profileImage ? (
                        <Image src={p.profileImage} alt={p.name || ""} width={48} height={48} sizes="48px" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-brand-600 dark:text-brand-400">
                          {(p.name || "T")[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-body font-semibold text-surface-900 dark:text-white truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {p.name}
                      </h3>
                      {p.badge && (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro font-medium shrink-0 ${
                          p.planType === "PRO"
                            ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                        }`}>
                          <Shield className="h-3 w-3" />
                          {p.badge}
                        </span>
                      )}
                    </div>
                    {/* Rating row */}
                    {p.avgRating !== null ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3 w-3 ${
                                star <= Math.round(p.avgRating!)
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-surface-200 dark:text-surface-700"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-micro font-medium text-surface-600 dark:text-surface-300">
                          {p.avgRating}
                        </span>
                        <span className="text-micro text-surface-400">
                          ({p.reviewCount})
                        </span>
                      </div>
                    ) : (
                      p.location && (
                        <p className="text-micro text-surface-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {p.location}
                        </p>
                      )
                    )}
                  </div>
                </div>

                {/* Location — show separately if rating exists */}
                {p.avgRating !== null && p.location && (
                  <p className="text-micro text-surface-400 flex items-center gap-1 mb-2">
                    <MapPin className="h-3 w-3" />
                    {p.location}
                  </p>
                )}

                {/* Description */}
                {p.description && (
                  <p className="text-body-sm text-surface-500 dark:text-surface-400 line-clamp-2 mb-3 leading-relaxed">
                    {p.description}
                  </p>
                )}

                {/* Specializations */}
                {p.specializations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {p.specializations.slice(0, 3).map((spec) => (
                      <span key={spec} className="rounded-md bg-surface-100 px-2 py-0.5 text-micro text-surface-600 dark:bg-surface-800 dark:text-surface-400">
                        {categoryLabel(spec)}
                      </span>
                    ))}
                    {p.specializations.length > 3 && (
                      <span className="text-micro text-surface-400">+{p.specializations.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Spacer to push footer down */}
                <div className="flex-1" />

                {/* Trust footer */}
                <div className="flex items-center justify-between pt-3 border-t border-surface-100 dark:border-surface-800">
                  <div className="flex items-center gap-3 text-micro text-surface-400">
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {p.responseCount}
                    </span>
                    {p.acceptedCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <Award className="h-3 w-3" />
                        {p.acceptedCount} priimtų
                      </span>
                    )}
                    {p.isRecentlyActive && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <Clock className="h-3 w-3" />
                        Aktyvus
                      </span>
                    )}
                  </div>
                  <span className="text-micro font-medium text-brand-600 dark:text-brand-400 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-0.5">
                    Profilis
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-surface-300 bg-white p-12 text-center dark:border-surface-700 dark:bg-surface-900">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-100 dark:bg-surface-800">
            <Search className="h-6 w-6 text-surface-400" />
          </div>
          <p className="text-body font-medium text-surface-600 dark:text-surface-300">
            {hasAnyFilters ? "Tiekėjų pagal pasirinktus filtrus nerasta" : "Tiekėjų kol kas nėra"}
          </p>
          <p className="mt-1 text-body-sm text-surface-400 max-w-md mx-auto">
            {hasAnyFilters
              ? "Pabandykite pakeisti filtrus arba peržiūrėti visus tiekėjus"
              : "Platforma dar tik auga. Paskelbkite užklausą — ji bus matoma visiems būsimiems tiekėjams."}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            {hasAnyFilters && (
              <Link
                href="/tiekejai"
                className="inline-flex items-center gap-1.5 rounded-xl border border-surface-200 bg-white px-5 py-2.5 text-body-sm font-semibold text-surface-700 hover:bg-surface-50 transition-colors dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
              >
                Išvalyti filtrus
              </Link>
            )}
            <Link
              href="/uzklausos/nauja"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-body-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
            >
              Paskelbti užklausą
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Pagination — only for server-level paging */}
      {serverTotalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {serverPage > 1 && (
            <Link
              href={buildUrl({ page: String(serverPage - 1) })}
              className="rounded-xl border border-surface-200 bg-white px-5 py-2.5 text-body-sm font-medium text-surface-600 hover:bg-surface-50 transition-all dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
            >
              Ankstesnis
            </Link>
          )}
          <span className="flex items-center px-4 text-body-sm text-surface-500 font-medium">{serverPage} / {serverTotalPages}</span>
          {serverPage < serverTotalPages && (
            <Link
              href={buildUrl({ page: String(serverPage + 1) })}
              className="rounded-xl border border-surface-200 bg-white px-5 py-2.5 text-body-sm font-medium text-surface-600 hover:bg-surface-50 transition-all dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
            >
              Kitas
            </Link>
          )}
        </div>
      )}
    </>
  );
}
