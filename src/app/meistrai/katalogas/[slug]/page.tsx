import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { unstable_cache } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  ArrowLeft,
  Building2,
  Database,
  Edit,
  ExternalLink,
  Globe,
  MapPin,
  Phone,
  Settings,
  Shield,
  Star,
  Tag,
} from "lucide-react";
import * as supplierService from "@/lib/imported/supplier-service";
import { canManageSupplier } from "@/lib/imported/supplier-access";
import EmptyState from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Tiekejo profilis — PaslaugosRinka",
  description: "Importuoto tiekejo profilis is paslaugos.lt katalogo.",
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

const getSupplierBySlugCached = unstable_cache(
  async (slug: string) => supplierService.getBySlug(slug),
  ["imported-supplier-detail"],
  { revalidate: 300, tags: ["suppliers"] }
);

export default async function ImportedSupplierDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [supplier, session] = await Promise.all([
    getSupplierBySlugCached(slug),
    getServerSession(authOptions),
  ]);

  // Check if current user is owner/manager of this supplier
  const isOwner = session?.user?.id
    ? !!(await canManageSupplier(session.user.id, slug))
    : false;

  if (!supplier) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState
          title="Tiekejas nerastas"
          description={`Profilis „${slug}" neegzistuoja arba buvo pasalintas.`}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-body-sm text-surface-500">
          <Link href="/meistrai" className="hover:text-surface-700 transition-colors">
            Meistrai
          </Link>
          <span>/</span>
          <Link href="/meistrai/katalogas" className="hover:text-surface-700 transition-colors">
            Katalogas
          </Link>
          <span>/</span>
          <span className="text-surface-900 dark:text-white">{supplier.displayName}</span>
        </div>

        {/* Main card */}
        <div className="rounded-3xl bg-white p-6 sm:p-8 dark:bg-surface-900/50">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-surface-100 dark:bg-surface-800">
              {supplier.heroImageUrl ? (
                <Image
                  src={supplier.heroImageUrl}
                  alt={supplier.displayName}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Building2 className="h-7 w-7 text-surface-400" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-surface-900 sm:text-2xl dark:text-white">
                  {supplier.displayName}
                </h1>
                <StatusBadge status={supplier.status} />
                {supplier.isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-micro font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <Shield className="h-3 w-3" />
                    verified
                  </span>
                )}
              </div>

              {/* Rating */}
              {supplier.rating != null && supplier.rating > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="text-body font-semibold text-surface-900 dark:text-white">
                    {supplier.rating.toFixed(1)}
                  </span>
                  {supplier.reviewCount > 0 && (
                    <span className="text-body-sm text-surface-500">
                      ({supplier.reviewCount} atsiliepimai)
                    </span>
                  )}
                </div>
              )}

              {/* Meta row */}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-surface-500">
                {supplier.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {supplier.city}
                  </span>
                )}
                {supplier.phonePublic && (
                  <a
                    href={`tel:${supplier.phonePublic}`}
                    className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 dark:text-brand-400"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {supplier.phonePublic}
                  </a>
                )}
                {supplier.websiteUrl && (
                  <a
                    href={supplier.websiteUrl.startsWith("http") ? supplier.websiteUrl : `https://${supplier.websiteUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 dark:text-brand-400"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Svetaine
                  </a>
                )}
                {supplier.companyCode && (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {supplier.companyCode}
                  </span>
                )}
                {supplier.externalSourceUrl && (
                  <a
                    href={supplier.externalSourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-surface-400 hover:text-surface-600"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {supplier.externalSource || "source"}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          {supplier.shortSummary && (
            <div className="mt-6 rounded-2xl bg-surface-50 p-4 text-body text-surface-700 dark:bg-surface-800/50 dark:text-surface-300">
              {supplier.shortSummary}
            </div>
          )}

          {/* Gallery */}
          {supplier.galleryUrls.length > 0 && (
            <div className="mt-6">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {supplier.galleryUrls.slice(0, 10).map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative aspect-square overflow-hidden rounded-xl bg-surface-100 dark:bg-surface-800 hover:opacity-90 transition-opacity"
                  >
                    <Image
                      src={url}
                      alt={`${supplier.displayName} ${i + 1}`}
                      fill
                      sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
                      className="object-cover"
                    />
                  </a>
                ))}
                {supplier.galleryUrls.length > 10 && (
                  <div className="flex aspect-square items-center justify-center rounded-xl bg-surface-100 text-body-sm font-medium text-surface-500 dark:bg-surface-800">
                    +{supplier.galleryUrls.length - 10}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Owner management CTA */}
          {isOwner && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950/30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-semibold text-surface-900 dark:text-white">
                    Jus valdote si profili
                  </p>
                  <p className="text-body-sm text-surface-500 dark:text-surface-400">
                    Redaguokite informacija, kad klientai rastų jusu paslaugas.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/tiekejas/katalogas/${supplier.slug}/redaguoti`}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-body-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
                  >
                    <Edit className="h-4 w-4" />
                    Redaguoti profili
                  </Link>
                  <Link
                    href="/tiekejas/katalogas"
                    className="inline-flex items-center gap-2 rounded-xl bg-surface-100 px-4 py-2.5 text-body-sm font-medium text-surface-700 transition-colors hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
                  >
                    <Settings className="h-4 w-4" />
                    Katalogo profiliai
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Claim CTA — only for unclaimed suppliers when viewer is not already owner */}
          {!isOwner && supplier.status === "unclaimed" && (
            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-950/30">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-semibold text-surface-900 dark:text-white">
                    Tai jūsų įmonė?
                  </p>
                  <p className="text-body-sm text-surface-500 dark:text-surface-400">
                    Perimkite šį profilį, kad galėtumėte valdyti informaciją ir gauti užklausas.
                  </p>
                </div>
                <ClaimButton slug={supplier.slug} />
              </div>
            </div>
          )}

          {/* Categories */}
          {supplier.categories.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-heading-3 font-semibold text-surface-900 dark:text-white">
                Kategorijos ({supplier.categories.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                {supplier.categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/meistrai/katalogas?category=${cat.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-surface-100 px-3 py-1.5 text-body-sm text-surface-700 transition-colors hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
                  >
                    <Tag className="h-3 w-3" />
                    {cat.name}
                    {cat.isPrimary && (
                      <span className="rounded bg-blue-100 px-1 text-micro text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                        primary
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Source provenance */}
          {supplier.snapshots.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-heading-3 font-semibold text-surface-900 dark:text-white">
                Saltinio informacija
              </h2>
              <div className="space-y-2">
                {supplier.snapshots.map((snap) => (
                  <div
                    key={snap.id}
                    className="flex items-center gap-3 rounded-xl bg-surface-50 p-3 text-body-sm dark:bg-surface-800/50"
                  >
                    <Database className="h-4 w-4 shrink-0 text-surface-400" />
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-surface-700 dark:text-surface-300">
                        {snap.sourceName}
                      </span>
                      {snap.rawTitle && (
                        <span className="text-surface-500"> — {snap.rawTitle}</span>
                      )}
                    </div>
                    <span className="shrink-0 text-micro text-surface-400">
                      {new Date(snap.capturedAt).toISOString().split("T")[0]}
                    </span>
                    {snap.sourceUrl && (
                      <a
                        href={snap.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-brand-600 hover:text-brand-700"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* JSON API link */}
          <div className="mt-8 border-t border-surface-200 pt-4 dark:border-surface-800">
            <a
              href={`/api/suppliers?slug=${supplier.slug}`}
              className="text-body-sm text-surface-400 hover:text-surface-600 transition-colors"
            >
              JSON API →
            </a>
          </div>
        </div>
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
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-micro font-medium ${styles[status] || styles.unclaimed}`}>
      {status === "claimed" ? "Perimtas" : status === "unclaimed" ? "Laisvas" : status}
    </span>
  );
}

function ClaimButton({ slug }: { slug: string }) {
  return (
    <Link
      href={`/claim/${slug}`}
      className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-body-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
    >
      Perimti profilį
    </Link>
  );
}
