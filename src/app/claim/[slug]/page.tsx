import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2, MapPin, Shield } from "lucide-react";
import * as supplierService from "@/lib/imported/supplier-service";
import ClaimForm from "./ClaimForm";

export const metadata: Metadata = {
  title: "Perimti profilį — PaslaugųRinka",
  description: "Pateikite prašymą perimti tiekėjo profilį.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ClaimPage({ params }: PageProps) {
  const { slug } = await params;
  const supplier = await supplierService.getBySlug(slug);

  if (!supplier) {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
        <div className="mx-auto max-w-lg px-4 py-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-surface-300 dark:text-surface-600" />
          <h1 className="mt-4 text-xl font-bold text-surface-900 dark:text-white">
            Tiekėjas nerastas
          </h1>
          <p className="mt-2 text-body-sm text-surface-500">
            {/* eslint-disable-next-line react/no-unescaped-entities */}
            Profilis "{slug}" neegzistuoja arba buvo pašalintas.
          </p>
          <Link
            href="/meistrai/katalogas"
            className="mt-6 inline-flex items-center gap-2 text-body-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Grįžti į katalogą
          </Link>
        </div>
      </div>
    );
  }

  if (supplier.status !== "unclaimed") {
    return (
      <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
        <div className="mx-auto max-w-lg px-4 py-12 text-center">
          <Shield className="mx-auto h-12 w-12 text-emerald-400" />
          <h1 className="mt-4 text-xl font-bold text-surface-900 dark:text-white">
            Profilis jau perimtas
          </h1>
          <p className="mt-2 text-body-sm text-surface-500">
            {/* eslint-disable-next-line react/no-unescaped-entities */}
            Tiekėjas "{supplier.displayName}" jau turi savininką.
          </p>
          <Link
            href={`/meistrai/katalogas/${slug}`}
            className="mt-6 inline-flex items-center gap-2 text-body-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Grįžti į profilį
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto max-w-lg px-4 sm:px-6 py-8 sm:py-12">
        {/* Back link */}
        <Link
          href={`/meistrai/katalogas/${slug}`}
          className="mb-6 inline-flex items-center gap-1.5 text-body-sm text-surface-500 hover:text-surface-700 transition-colors dark:hover:text-surface-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Grįžti į profilį
        </Link>

        {/* Supplier summary */}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-surface-900 dark:text-white sm:text-2xl">
            Perimti profilį
          </h1>
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-white p-4 dark:bg-surface-900/50">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-800">
              <Building2 className="h-5 w-5 text-surface-400" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-surface-900 dark:text-white truncate">
                {supplier.displayName}
              </p>
              <div className="flex items-center gap-2 text-micro text-surface-500">
                {supplier.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {supplier.city}
                  </span>
                )}
                {supplier.externalSource && (
                  <span>Šaltinis: {supplier.externalSource}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Claim form */}
        <div className="rounded-2xl bg-white p-6 sm:p-8 dark:bg-surface-900/50">
          <ClaimForm supplierSlug={slug} supplierName={supplier.displayName} />
        </div>
      </div>
    </div>
  );
}
