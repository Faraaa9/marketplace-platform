"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { formatRelativeDate } from "@/lib/utils";
import {
  MapPin,
  Shield,
  MessageSquare,
  Calendar,
  Globe,
  ArrowLeft,
  Clock,
  CheckCircle,
  ArrowRight,
  Award,
  Zap,
  UserCheck,
  Star,
  Euro,
  FileCheck,
  Wrench,
} from "lucide-react";

interface ReviewData {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  clientName: string | null;
  requestTitle: string;
  requestCategory: string;
}

interface ProviderData {
  id: string;
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
  reviews: ReviewData[];
  lastActiveAt: string;
  memberSince: string;
}

export default function PublicProviderProfilePage() {
  const params = useParams();
  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/tiekejai/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setProvider(data.data);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <LoadingSpinner />;
  if (error || !provider) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState title="Tiekėjas nerastas" description="Šis profilis neegzistuoja arba yra neaktyvus." />
      </div>
    );
  }

  const categoryLabel = (val: string) =>
    SERVICE_CATEGORIES.find((c) => c.value === val)?.label || val;

  const daysSinceActive = Math.floor(
    (Date.now() - new Date(provider.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const isRecentlyActive = daysSinceActive <= 7;

  const responseTimeLabel = (hours: number | null) => {
    if (hours === null) return null;
    if (hours < 1) return "< 1 val.";
    if (hours < 24) return `~${hours} val.`;
    const days = Math.round(hours / 24);
    return `~${days} d.`;
  };

  const memberMonths = Math.max(
    1,
    Math.floor((Date.now() - new Date(provider.memberSince).getTime()) / (1000 * 60 * 60 * 24 * 30))
  );

  // Acceptance rate for CTA context
  const acceptanceRate = provider.responseCount > 0
    ? Math.round((provider.acceptedCount / provider.responseCount) * 100)
    : null;

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/tiekejai"
          className="mb-6 inline-flex items-center gap-1.5 text-body-sm text-surface-500 hover:text-surface-700 transition-colors dark:text-surface-400 dark:hover:text-surface-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Visi tiekėjai
        </Link>

        {/* Header card */}
        <div className="rounded-2xl border border-surface-200/60 bg-white p-6 sm:p-8 dark:border-surface-700/50 dark:bg-surface-900/50 mb-6">
          <div className="flex items-start gap-4 sm:gap-5">
            {/* Avatar */}
            <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-2xl bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center overflow-hidden">
              {provider.image ? (
                <img src={provider.image} alt={provider.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl sm:text-3xl font-bold text-brand-600 dark:text-brand-400">
                  {provider.name[0].toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* Name + badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-surface-900 dark:text-white">
                  {provider.name}
                </h1>
                {provider.badge && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-micro font-medium ${
                    provider.planType === "PRO"
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                  }`}>
                    <Shield className="h-3 w-3" />
                    {provider.badge}
                  </span>
                )}
              </div>

              {/* Headline */}
              {provider.headline && (
                <p className="text-body-sm text-surface-500 dark:text-surface-400 mt-1">
                  {provider.headline}
                </p>
              )}

              {/* Rating - separate row for clarity */}
              {provider.avgRating !== null && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= Math.round(provider.avgRating!)
                            ? "fill-amber-400 text-amber-400"
                            : "text-surface-200 dark:text-surface-700"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-body-sm font-semibold text-surface-900 dark:text-white">
                    {provider.avgRating}
                  </span>
                  <span className="text-body-sm text-surface-400">
                    ({provider.totalReviews} {provider.totalReviews === 1 ? "atsiliepimas" : provider.totalReviews < 10 ? "atsiliepimai" : "atsiliepimų"})
                  </span>
                </div>
              )}

              {/* Meta info */}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-surface-500">
                {provider.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {provider.location}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Narys nuo {new Date(provider.memberSince).toLocaleDateString("lt-LT", { year: "numeric", month: "long" })}
                </span>
                {provider.website && (
                  <a
                    href={provider.website.startsWith("http") ? provider.website : `https://${provider.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 dark:text-brand-400"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Svetainė
                  </a>
                )}
                {isRecentlyActive && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Clock className="h-3.5 w-3.5" />
                    Aktyvus šią savaitę
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Trust stats — single consolidated grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <TrustStat
            label="Pasiūlymų pateikta"
            value={String(provider.responseCount)}
            icon={<MessageSquare className="h-4 w-4 text-brand-500" />}
          />
          <TrustStat
            label="Klientų pasirinktas"
            value={String(provider.acceptedCount)}
            icon={<Award className="h-4 w-4 text-emerald-500" />}
          />
          <TrustStat
            label="Atsakymo laikas"
            value={responseTimeLabel(provider.avgResponseTimeHours) || "—"}
            icon={<Zap className="h-4 w-4 text-blue-500" />}
          />
          <TrustStat
            label="Platformoje"
            value={memberMonths >= 12 ? `${Math.floor(memberMonths / 12)} m.` : `${memberMonths} mėn.`}
            icon={<UserCheck className="h-4 w-4 text-violet-500" />}
          />
        </div>

        {/* Professional quick facts */}
        {(provider.experienceYears || provider.priceFrom || provider.offersInvoices || provider.availableForUrgent) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {provider.experienceYears && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-surface-200/60 bg-white px-3 py-1.5 text-body-sm text-surface-700 dark:border-surface-700/50 dark:bg-surface-900/50 dark:text-surface-300">
                <Clock className="h-3.5 w-3.5 text-violet-500" />
                {provider.experienceYears} m. patirtis
              </span>
            )}
            {provider.priceFrom !== null && provider.priceFrom > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-surface-200/60 bg-white px-3 py-1.5 text-body-sm text-surface-700 dark:border-surface-700/50 dark:bg-surface-900/50 dark:text-surface-300">
                <Euro className="h-3.5 w-3.5 text-emerald-500" />
                Nuo {provider.priceFrom} €
              </span>
            )}
            {provider.offersInvoices && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-surface-200/60 bg-white px-3 py-1.5 text-body-sm text-surface-700 dark:border-surface-700/50 dark:bg-surface-900/50 dark:text-surface-300">
                <FileCheck className="h-3.5 w-3.5 text-blue-500" />
                Sąskaitos faktūros
              </span>
            )}
            {provider.availableForUrgent && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200/60 bg-amber-50 px-3 py-1.5 text-body-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-500/10 dark:text-amber-300">
                <Zap className="h-3.5 w-3.5" />
                Skubūs darbai
              </span>
            )}
          </div>
        )}

        {/* Services */}
        {provider.services && (
          <div className="rounded-2xl border border-surface-200/60 bg-white p-6 dark:border-surface-700/50 dark:bg-surface-900/50 mb-6">
            <h2 className="text-heading-3 font-semibold text-surface-900 dark:text-white mb-3 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-surface-400" />
              Teikiamos paslaugos
            </h2>
            <p className="text-body text-surface-600 dark:text-surface-400 whitespace-pre-wrap leading-relaxed">
              {provider.services}
            </p>
          </div>
        )}

        {/* Description */}
        {provider.description && (
          <div className="rounded-2xl border border-surface-200/60 bg-white p-6 dark:border-surface-700/50 dark:bg-surface-900/50 mb-6">
            <h2 className="text-heading-3 font-semibold text-surface-900 dark:text-white mb-3">Apie tiekėją</h2>
            <p className="text-body text-surface-600 dark:text-surface-400 whitespace-pre-wrap leading-relaxed">
              {provider.description}
            </p>
          </div>
        )}

        {/* Specializations */}
        {provider.specializations.length > 0 && (
          <div className="rounded-2xl border border-surface-200/60 bg-white p-6 dark:border-surface-700/50 dark:bg-surface-900/50 mb-6">
            <h2 className="text-heading-3 font-semibold text-surface-900 dark:text-white mb-3">Specializacijos</h2>
            <div className="flex flex-wrap gap-2">
              {provider.specializations.map((spec) => (
                <Link
                  key={spec}
                  href={`/tiekejai?category=${spec}`}
                  className="rounded-lg bg-brand-50 px-3 py-1.5 text-body-sm font-medium text-brand-700 hover:bg-brand-100 transition-colors dark:bg-brand-950 dark:text-brand-400 dark:hover:bg-brand-900"
                >
                  {categoryLabel(spec)}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Images/portfolio */}
        {provider.images.length > 0 && (
          <div className="rounded-2xl border border-surface-200/60 bg-white p-6 dark:border-surface-700/50 dark:bg-surface-900/50 mb-6">
            <h2 className="text-heading-3 font-semibold text-surface-900 dark:text-white mb-3">Darbų pavyzdžiai</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {provider.images.map((img, i) => (
                <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden bg-surface-100 dark:bg-surface-800">
                  <img src={img} alt={`${provider.name} darbas ${i + 1}`} className="h-full w-full object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="rounded-2xl border border-surface-200/60 bg-white p-6 dark:border-surface-700/50 dark:bg-surface-900/50 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-heading-3 font-semibold text-surface-900 dark:text-white">
              Atsiliepimai {provider.totalReviews > 0 && `(${provider.totalReviews})`}
            </h2>
            {provider.avgRating !== null && (
              <div className="flex items-center gap-1.5">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= Math.round(provider.avgRating!)
                          ? "fill-amber-400 text-amber-400"
                          : "text-surface-200 dark:text-surface-700"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-body-sm font-semibold text-surface-900 dark:text-white">
                  {provider.avgRating}
                </span>
              </div>
            )}
          </div>

          {provider.reviews.length > 0 ? (
            <div className="space-y-4">
              {provider.reviews.map((review) => (
                <div key={review.id} className="border-b border-surface-100 pb-4 last:border-0 last:pb-0 dark:border-surface-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                        <span className="text-micro font-semibold text-surface-500">
                          {(review.clientName || "K")[0].toUpperCase()}
                        </span>
                      </div>
                      <span className="text-body-sm font-medium text-surface-900 dark:text-white">
                        {review.clientName || "Klientas"}
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
                    <p className="text-body-sm text-surface-600 dark:text-surface-400 leading-relaxed ml-9">
                      {review.comment}
                    </p>
                  )}
                  <p className="mt-1 text-micro text-surface-400 ml-9">
                    {categoryLabel(review.requestCategory)}: {review.requestTitle}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <Star className="h-8 w-8 text-surface-200 dark:text-surface-700 mx-auto mb-2" />
              <p className="text-body-sm text-surface-400">
                Atsiliepimų kol kas nėra
              </p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-brand-200/60 bg-gradient-to-br from-brand-50/80 to-white p-6 sm:p-8 dark:border-brand-800/40 dark:from-brand-950/50 dark:to-surface-900/50">
          <div className="text-center">
            <h3 className="text-heading-3 font-bold text-surface-900 dark:text-white mb-2">
              Reikia {provider.name} paslaugų?
            </h3>
            <p className="text-body-sm text-surface-500 dark:text-surface-400 mb-5 max-w-md mx-auto">
              Pateikite nemokamą užklausą ir gaukite asmeninį pasiūlymą su kaina.
            </p>

            {/* Trust micro-signals */}
            <div className="flex flex-wrap justify-center gap-3 mb-5 text-micro text-surface-500">
              <span className="inline-flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                Nemokama užklausa
              </span>
              {provider.avgResponseTimeHours !== null && (
                <span className="inline-flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-blue-500" />
                  Atsako per {responseTimeLabel(provider.avgResponseTimeHours)}
                </span>
              )}
              {acceptanceRate !== null && acceptanceRate > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-emerald-500" />
                  {acceptanceRate}% priimtų pasiūlymų
                </span>
              )}
            </div>

            <Link href="/uzklausos/nauja">
              <Button size="lg">
                Pateikti užklausą
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-surface-200/60 bg-white p-4 text-center dark:border-surface-700/50 dark:bg-surface-900/50">
      <div className="flex justify-center mb-1.5">{icon}</div>
      <p className="text-lg font-bold text-surface-900 dark:text-white">{value}</p>
      <p className="text-micro text-surface-500 dark:text-surface-400">{label}</p>
    </div>
  );
}
