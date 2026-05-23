import type { Metadata } from &rdquo;next&rdquo;;
import Link from &rdquo;next/link&rdquo;;
import { ArrowLeft, Building2, MapPin, Shield } from &rdquo;lucide-react&rdquo;;
import * as supplierService from &rdquo;@/lib/imported/supplier-service&rdquo;;
import ClaimForm from &rdquo;./ClaimForm&rdquo;;

export const metadata: Metadata = {
  title: &rdquo;Perimti profilį — PaslaugųRinka&rdquo;,
  description: &rdquo;Pateikite prašymą perimti tiekėjo profilį.&rdquo;,
};

export const dynamic = &rdquo;force-dynamic&rdquo;;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ClaimPage({ params }: PageProps) {
  const { slug } = await params;
  const supplier = await supplierService.getBySlug(slug);

  if (!supplier) {
    return (
      <div className=&rdquo;min-h-screen bg-surface-50 dark:bg-surface-950&rdquo;>
        <div className=&rdquo;mx-auto max-w-lg px-4 py-12 text-center&rdquo;>
          <Building2 className=&rdquo;mx-auto h-12 w-12 text-surface-300 dark:text-surface-600&rdquo; />
          <h1 className=&rdquo;mt-4 text-xl font-bold text-surface-900 dark:text-white&rdquo;>
            Tiekėjas nerastas
          </h1>
          <p className=&rdquo;mt-2 text-body-sm text-surface-500&rdquo;>
            Profilis &ldquo;{slug}&rdquo; neegzistuoja arba buvo pašalintas.
          </p>
          <Link
            href=&rdquo;/meistrai/katalogas&rdquo;
            className=&rdquo;mt-6 inline-flex items-center gap-2 text-body-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400&rdquo;
          >
            <ArrowLeft className=&rdquo;h-4 w-4&rdquo; />
            Grįžti į katalogą
          </Link>
        </div>
      </div>
    );
  }

  if (supplier.status !== &rdquo;unclaimed&rdquo;) {
    return (
      <div className=&rdquo;min-h-screen bg-surface-50 dark:bg-surface-950&rdquo;>
        <div className=&rdquo;mx-auto max-w-lg px-4 py-12 text-center&rdquo;>
          <Shield className=&rdquo;mx-auto h-12 w-12 text-emerald-400&rdquo; />
          <h1 className=&rdquo;mt-4 text-xl font-bold text-surface-900 dark:text-white&rdquo;>
            Profilis jau perimtas
          </h1>
          <p className=&rdquo;mt-2 text-body-sm text-surface-500&rdquo;>
            Tiekėjas &ldquo;{supplier.displayName}&rdquo; jau turi savininką.
          </p>
          <Link
            href={`/meistrai/katalogas/${slug}`}
            className=&rdquo;mt-6 inline-flex items-center gap-2 text-body-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400&rdquo;
          >
            <ArrowLeft className=&rdquo;h-4 w-4&rdquo; />
            Grįžti į profilį
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className=&rdquo;min-h-screen bg-surface-50 dark:bg-surface-950&rdquo;>
      <div className=&rdquo;mx-auto max-w-lg px-4 sm:px-6 py-8 sm:py-12&rdquo;>
        {/* Back link */}
        <Link
          href={`/meistrai/katalogas/${slug}`}
          className=&rdquo;mb-6 inline-flex items-center gap-1.5 text-body-sm text-surface-500 hover:text-surface-700 transition-colors dark:hover:text-surface-300&rdquo;
        >
          <ArrowLeft className=&rdquo;h-3.5 w-3.5&rdquo; />
          Grįžti į profilį
        </Link>

        {/* Supplier summary */}
        <div className=&rdquo;mb-8&rdquo;>
          <h1 className=&rdquo;text-xl font-bold text-surface-900 dark:text-white sm:text-2xl&rdquo;>
            Perimti profilį
          </h1>
          <div className=&rdquo;mt-3 flex items-center gap-3 rounded-xl bg-white p-4 dark:bg-surface-900/50&rdquo;>
            <div className=&rdquo;flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-800&rdquo;>
              <Building2 className=&rdquo;h-5 w-5 text-surface-400&rdquo; />
            </div>
            <div className=&rdquo;min-w-0&rdquo;>
              <p className=&rdquo;font-semibold text-surface-900 dark:text-white truncate&rdquo;>
                {supplier.displayName}
              </p>
              <div className=&rdquo;flex items-center gap-2 text-micro text-surface-500&rdquo;>
                {supplier.city && (
                  <span className=&rdquo;inline-flex items-center gap-1&rdquo;>
                    <MapPin className=&rdquo;h-3 w-3&rdquo; />
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
        <div className=&rdquo;rounded-2xl bg-white p-6 sm:p-8 dark:bg-surface-900/50&rdquo;>
          <ClaimForm supplierSlug={slug} supplierName={supplier.displayName} />
        </div>
      </div>
    </div>
  );
}
