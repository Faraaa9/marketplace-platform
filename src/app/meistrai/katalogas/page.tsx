import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { unstable_cache } from "next/cache";
import { Building2, MapPin, ArrowLeft, ArrowRight, Star, Shield } from "lucide-react";
import * as supplierService from "@/lib/imported/supplier-service";

export const metadata: Metadata = {
  title: "Importuotas katalogas — PaslaugosRinka",
  description: "Importuoti tiekėjų profiliai iš paslaugos.lt katalogo. Perimkite savo profilį.",
  // Imported/unclaimed profiles must not be broadly indexed by search engines.
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{
    page?: string;
    city?: string;
    category?: string;
  }>;
}

const PER_PAGE = 50;

const getCatalogPageData = unstable_cache(
  async (limit: number, offset: number, city: string | undefined) => {
    const [result, stats] = await Promise.all([
      supplierService.list({ limit, offset, city }),
      supplierService.getStats(),
    ]);
    return { result, stats };
  },
  ["imported-catalog-page"],
  { revalidate: 600, tags: ["suppliers"] }
);

export default async function ImportedCatalogPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1"));
  const city = params.city || undefined;
  const offset = (page - 1) * PER_PAGE;

  const { result, stats } = await getCatalogPageData(PER_PAGE, offset, city);

  const totalPages = Math.ceil(result.total / PER_PAGE);

  // Build query string for pagination
  function pageUrl(p: number) {
    const qs = new URLSearchParams();
    qs.set("page", String(p));
    if (city) qs.set("city", city);
    return `/meistrai/katalogas?${qs.toString()}`;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-surface-200/50 dark:border-surface-800/50">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <Link
            href="/meistrai"
            className="mb-4 inline-flex items-center gap-1.5 text-body-sm text-surface-500 transition-colors hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Visi meistrai
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950">
              <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">
              Importuotas katalogas
            </h1>
          </div>
          <p className="text-body text-surface-500 dark:text-surface-400 ml-[52px]">
            {stats.total} tiekėjų iš paslaugos.lt, {stats.unclaimed} laukia perėmimo
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Pagination top */}
        <div className="mb-4 flex items-center justify-between text-body-sm text-surface-500">
          <span>
            Rodoma {offset + 1}–{Math.min(offset + PER_PAGE, result.total)} is {result.total}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={pageUrl(page - 1)} className="text-brand-600 hover:text-brand-700">
                <ArrowLeft className="h-4 w-4 inline" /> Ankstesni
              </Link>
            )}
            {page < totalPages && (
              <Link href={pageUrl(page + 1)} className="text-brand-600 hover:text-brand-700">
                Kiti <ArrowRight className="h-4 w-4 inline" />
              </Link>
            )}
          </div>
        </div>

        {/* Supplier list */}
        <div className="grid gap-3">
          {result.suppliers.map((s) => (
            <Link
              key={s.id}
              href={`/meistrai/katalogas/${s.slug}`}
              className="flex items-center gap-4 rounded-2xl bg-white p-4 transition-all hover:shadow-md dark:bg-surface-900/50 dark:hover:bg-surface-800/50"
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-100 dark:bg-surface-800">
                {s.heroImageUrl ? (
                  <Image
                    src={s.heroImageUrl}
                    alt={s.displayName}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Building2 className="h-5 w-5 text-surface-400" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-surface-900 dark:text-white truncate">
                    {s.displayName}
                  </span>
                  {s.isVerified && (
                    <Shield className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  )}
                  <StatusBadge status={s.status} />
                </div>
                {s.shortSummary && (
                  <p className="mt-0.5 text-body-sm text-surface-600 dark:text-surface-400 truncate">
                    {s.shortSummary}
                  </p>
                )}
                <div className="flex items-center gap-3 text-body-sm text-surface-500 mt-0.5">
                  {s.rating != null && s.rating > 0 && (
                    <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                      <Star className="h-3 w-3 fill-current" />
                      {s.rating.toFixed(1)}
                      {s.reviewCount > 0 && (
                        <span className="font-normal text-surface-400">({s.reviewCount})</span>
                      )}
                    </span>
                  )}
                  {s.city && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {s.city}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}

          {result.suppliers.length === 0 && (
            <div className="rounded-2xl bg-white p-12 text-center dark:bg-surface-900/50">
              <p className="text-surface-500">Nera tiekeju pagal pasirinktus filtrus.</p>
            </div>
          )}
        </div>

        {/* Pagination bottom */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2 text-body-sm">
            {page > 1 && (
              <Link
                href={pageUrl(page - 1)}
                className="rounded-lg bg-surface-100 px-3 py-1.5 text-surface-700 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300"
              >
                <ArrowLeft className="h-4 w-4 inline" /> Ankstesni
              </Link>
            )}
            <span className="text-surface-500">
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={pageUrl(page + 1)}
                className="rounded-lg bg-surface-100 px-3 py-1.5 text-surface-700 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300"
              >
                Kiti <ArrowRight className="h-4 w-4 inline" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    unclaimed: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    claimed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    hidden: "bg-surface-100 text-surface-500",
    suspended: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  };

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-micro font-medium ${styles[status] || styles.unclaimed}`}>
      {status === "claimed" ? "Perimtas" : status === "unclaimed" ? "Laisvas" : status}
    </span>
  );
}
