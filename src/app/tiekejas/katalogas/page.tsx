import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Edit, ExternalLink, MapPin } from "lucide-react";
import { getUserManagedSuppliers } from "@/lib/imported/supplier-access";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mano tiekeju profiliai — PaslaugosRinka",
};

export const dynamic = "force-dynamic";

export default async function MyClaimedSuppliersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/prisijungti");

  const identities = await getUserManagedSuppliers(session.user.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link
        href="/tiekejas"
        className="mb-6 inline-flex items-center gap-1.5 text-body-sm text-surface-500 transition-colors hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Valdymo panelė
      </Link>

      <div className="mb-6">
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">
          Mano tiekeju profiliai
        </h1>
        <p className="mt-0.5 text-body-sm text-surface-500 dark:text-surface-400">
          Importuoti profiliai, kuriuos esate perėmę
        </p>
      </div>

      {identities.length === 0 ? (
        <div className="rounded-2xl border border-surface-200/60 bg-white p-12 text-center dark:border-surface-700/50 dark:bg-surface-900/50">
          <Building2 className="mx-auto h-10 w-10 text-surface-300 dark:text-surface-600 mb-3" />
          <p className="text-body font-medium text-surface-700 dark:text-surface-300">
            Neturite perimtų profilių
          </p>
          <p className="mt-1 text-body-sm text-surface-500 dark:text-surface-400 max-w-sm mx-auto">
            Raskite savo įmonės profilį kataloge ir pateikite perėmimo prašymą.
          </p>
          <Link
            href="/tiekejai/katalogas"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2 text-body-sm font-semibold text-white shadow-sm hover:bg-brand-700 transition-colors"
          >
            Perziureti kataloga
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {identities.map((identity) => {
            const s = identity.supplier;
            return (
              <div
                key={identity.id}
                className="flex items-center gap-4 rounded-2xl bg-white p-5 dark:bg-surface-900/50"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-100 dark:bg-surface-800">
                  <Building2 className="h-5 w-5 text-surface-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-surface-900 dark:text-white truncate">
                      {s.displayName}
                    </span>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-micro font-medium ${
                      s.status === "claimed"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                    }`}>
                      {s.status === "claimed" ? "Perimtas" : s.status === "unclaimed" ? "Laisvas" : s.status}
                    </span>
                    <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-micro font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                      {identity.ownershipStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-body-sm text-surface-500 mt-0.5">
                    {s.city && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {s.city}
                      </span>
                    )}
                    <span>{s._count.categoryLinks} kategorijos</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/tiekejai/katalogas/${s.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-surface-100 px-3 py-1.5 text-body-sm text-surface-700 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Perziureti
                  </Link>
                  <Link
                    href={`/tiekejas/katalogas/${s.slug}/redaguoti`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-body-sm font-medium text-white hover:bg-brand-700 transition-colors"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Redaguoti
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
