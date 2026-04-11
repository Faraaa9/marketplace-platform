import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { SERVICE_CATEGORIES, getEffectivePlanType, PLAN_LIMITS } from "@/lib/constants";
import { isStoryEnabled } from "@/lib/platform-settings";
import EmptyState from "@/components/ui/EmptyState";
import DirectInquiryWidget from "./components/DirectInquiryWidget";
import ReviewsSection from "./components/ReviewsSection";
import SimilarProvidersSection from "./components/SimilarProvidersSection";
import StoryAvatarButton from "./components/StoryAvatarButton";
import type { ProviderProfileData, StoryData } from "./components/types";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Calendar,
  CheckCircle,
  Clock,
  Euro,
  FileCheck,
  Globe,
  MapPin,
  MessageSquare,
  Send,
  Shield,
  Star,
  UserCheck,
  Wrench,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Tiekėjo profilis — PaslaugųRinka",
  description: "Peržiūrėkite paslaugų tiekėjo profilį, darbus, atsiliepimus ir susisiekite tiesiogiai.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PublicProviderProfilePage({ params }: PageProps) {
  const { id } = await params;
  const [provider, stories, session] = await Promise.all([
    getProviderProfile(id),
    getActiveStories(id),
    getServerSession(authOptions),
  ]);

  if (!provider) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState
          title="Tiekėjas nerastas"
          description="Šis profilis neegzistuoja arba yra neaktyvus."
        />
      </div>
    );
  }

  const daysSinceActive = Math.floor(
    (Date.now() - new Date(provider.lastActiveAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  const isRecentlyActive = daysSinceActive <= 7;
  const memberMonths = Math.max(
    1,
    Math.floor((Date.now() - new Date(provider.memberSince).getTime()) / (1000 * 60 * 60 * 24 * 30))
  );
  const acceptanceRate =
    provider.responseCount > 0
      ? Math.round((provider.acceptedCount / provider.responseCount) * 100)
      : null;
  const isSelf = session?.user?.id === provider.id;

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/tiekejai"
          className="mb-6 inline-flex items-center gap-1.5 text-body-sm text-surface-500 transition-colors hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Visi tiekėjai
        </Link>

        <div className="mb-6 rounded-2xl border border-surface-200/60 bg-white p-6 sm:p-8 dark:border-surface-700/50 dark:bg-surface-900/50">
          <div className="flex items-start gap-4 sm:gap-5">
            <StoryAvatarButton
              stories={stories}
              providerName={provider.name}
              providerImage={provider.image}
            />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-surface-900 sm:text-2xl dark:text-white">
                  {provider.name}
                </h1>
                {provider.badge && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-micro font-medium ${
                      provider.planType === "PRO"
                        ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                    }`}
                  >
                    <Shield className="h-3 w-3" />
                    {provider.badge}
                  </span>
                )}
              </div>

              {provider.headline && (
                <p className="mt-1 text-body-sm text-surface-500 dark:text-surface-400">
                  {provider.headline}
                </p>
              )}

              {provider.avgRating !== null && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <RatingStars rating={provider.avgRating} />
                  <span className="text-body-sm font-semibold text-surface-900 dark:text-white">
                    {provider.avgRating}
                  </span>
                  <span className="text-body-sm text-surface-400">
                    ({provider.totalReviews} {reviewsLabel(provider.totalReviews)})
                  </span>
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-surface-500">
                {provider.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {provider.location}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Narys nuo{" "}
                  {new Date(provider.memberSince).toLocaleDateString("lt-LT", {
                    year: "numeric",
                    month: "long",
                  })}
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

              {!isSelf && (
                <div className="mt-3">
                  <a
                    href="#zinute"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-surface-200 bg-white px-5 text-body-sm font-medium text-surface-700 transition-all duration-150 hover:border-surface-300 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:border-surface-600"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Rašyti žinutę
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
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

        {(provider.experienceYears ||
          provider.priceFrom ||
          provider.offersInvoices ||
          provider.availableForUrgent) && (
          <div className="mb-6 flex flex-wrap gap-2">
            {provider.experienceYears && (
              <QuickFact icon={<Clock className="h-3.5 w-3.5 text-violet-500" />}>
                {provider.experienceYears} m. patirtis
              </QuickFact>
            )}
            {provider.priceFrom !== null && provider.priceFrom > 0 && (
              <QuickFact icon={<Euro className="h-3.5 w-3.5 text-emerald-500" />}>
                Nuo {provider.priceFrom} €
              </QuickFact>
            )}
            {provider.offersInvoices && (
              <QuickFact icon={<FileCheck className="h-3.5 w-3.5 text-blue-500" />}>
                Sąskaitos faktūros
              </QuickFact>
            )}
            {provider.availableForUrgent && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200/60 bg-amber-50 px-3 py-1.5 text-body-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-500/10 dark:text-amber-300">
                <Zap className="h-3.5 w-3.5" />
                Skubūs darbai
              </span>
            )}
          </div>
        )}

        {provider.services && (
          <ProfileSection
            title="Teikiamos paslaugos"
            icon={<Wrench className="h-4 w-4 text-surface-400" />}
          >
            <p className="whitespace-pre-wrap text-body leading-relaxed text-surface-600 dark:text-surface-400">
              {provider.services}
            </p>
          </ProfileSection>
        )}

        {provider.description && (
          <ProfileSection title="Apie tiekėją">
            <p className="whitespace-pre-wrap text-body leading-relaxed text-surface-600 dark:text-surface-400">
              {provider.description}
            </p>
          </ProfileSection>
        )}

        {provider.specializations.length > 0 && (
          <ProfileSection title="Specializacijos">
            <div className="flex flex-wrap gap-2">
              {provider.specializations.map((spec) => (
                <Link
                  key={spec}
                  href={`/tiekejai?category=${spec}`}
                  className="rounded-lg bg-brand-50 px-3 py-1.5 text-body-sm font-medium text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-950 dark:text-brand-400 dark:hover:bg-brand-900"
                >
                  {categoryLabel(spec)}
                </Link>
              ))}
            </div>
          </ProfileSection>
        )}

        {provider.images.length > 0 && (
          <ProfileSection title="Darbų pavyzdžiai">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {provider.images.map((img, i) => (
                <div
                  key={`${img}-${i}`}
                  className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-100 dark:bg-surface-800"
                >
                  <Image
                    src={img}
                    alt={`${provider.name} darbas ${i + 1}`}
                    fill
                    sizes="(max-width: 640px) 50vw, 240px"
                    className="object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </ProfileSection>
        )}

        <Suspense fallback={<SectionSkeleton title="Atsiliepimai" />}>
          <ReviewsSection
            providerId={provider.id}
            avgRating={provider.avgRating}
            totalReviews={provider.totalReviews}
          />
        </Suspense>

        <div className="mb-6 rounded-2xl border border-brand-200/60 bg-gradient-to-br from-brand-50/80 to-white p-6 sm:p-8 dark:border-brand-800/40 dark:from-brand-950/50 dark:to-surface-900/50">
          <div className="text-center">
            <h3 className="mb-2 text-heading-3 font-bold text-surface-900 dark:text-white">
              Reikia {provider.name} paslaugų?
            </h3>
            <p className="mx-auto mb-5 max-w-md text-body-sm text-surface-500 dark:text-surface-400">
              Pateikite nemokamą užklausą arba parašykite tiekėjui tiesiogiai.
            </p>

            <div className="mb-5 flex flex-wrap justify-center gap-3 text-micro text-surface-500">
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

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/uzklausos/nauja"
                className="inline-flex h-12 items-center justify-center gap-2.5 rounded-xl bg-brand-600 px-6 text-body font-medium text-white shadow-sm transition-all duration-150 hover:bg-brand-700 hover:shadow-md dark:bg-brand-500 dark:hover:bg-brand-600"
              >
                Pateikti užklausą
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
              {!isSelf && (
                <a
                  href="#zinute"
                  className="inline-flex h-12 items-center justify-center gap-2.5 rounded-xl border border-surface-200 bg-white px-6 text-body font-medium text-surface-700 transition-all duration-150 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800"
                >
                  <Send className="h-4 w-4" />
                  Rašyti žinutę
                </a>
              )}
            </div>
          </div>
        </div>

        <DirectInquiryWidget
          providerId={provider.id}
          providerName={provider.name}
          isSelf={isSelf}
        />

        <Suspense fallback={<SectionSkeleton title="Panašūs tiekėjai" />}>
          <SimilarProvidersSection
            providerId={provider.id}
            specializations={provider.specializations}
            location={provider.location}
          />
        </Suspense>
      </div>
    </div>
  );
}

async function getProviderProfile(id: string): Promise<ProviderProfileData | null> {
  const [provider, reviewSummary, recentResponses, acceptedRows] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id,
        role: "PROVIDER",
        emailVerified: { not: null },
        providerProfile: { isActive: true },
      },
      select: {
        id: true,
        name: true,
        image: true,
        createdAt: true,
        providerProfile: {
          select: {
            description: true,
            headline: true,
            services: true,
            priceFrom: true,
            experienceYears: true,
            offersInvoices: true,
            availableForUrgent: true,
            specializations: true,
            location: true,
            phone: true,
            website: true,
            images: true,
            planType: true,
            createdAt: true,
          },
        },
        subscription: { select: { status: true } },
        _count: { select: { responses: true } },
      },
    }),
    prisma.review.aggregate({
      where: { providerId: id },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.response.findMany({
      where: { providerId: id },
      select: {
        createdAt: true,
        request: { select: { createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM service_requests sr
      JOIN responses r ON sr."acceptedResponseId" = r.id
      WHERE r."providerId" = ${id}
    `,
  ]);

  if (!provider?.providerProfile) return null;

  const profile = provider.providerProfile;
  const planType = getEffectivePlanType(profile.planType || "FREE", provider.subscription?.status);
  const badge = PLAN_LIMITS[planType]?.badge || null;
  const images = parseImages(profile.images);
  const specializations = parseStringArray(profile.specializations);
  const profileCompleteness = calculateProfileCompleteness(profile, images, specializations);
  const avgResponseTimeHours = calculateAvgResponseTimeHours(recentResponses);
  const avgRating =
    reviewSummary._avg.rating !== null
      ? Math.round(reviewSummary._avg.rating * 10) / 10
      : null;
  const acceptedCount = Number(acceptedRows[0]?.count ?? 0);

  return {
    id: provider.id,
    name: provider.name || "Tiekėjas",
    image: images[0] || provider.image || null,
    images,
    description: profile.description,
    headline: profile.headline,
    services: profile.services,
    priceFrom: profile.priceFrom,
    experienceYears: profile.experienceYears,
    offersInvoices: profile.offersInvoices,
    availableForUrgent: profile.availableForUrgent,
    specializations,
    location: profile.location,
    website: profile.website,
    planType,
    badge,
    responseCount: provider._count.responses,
    acceptedCount,
    avgResponseTimeHours,
    profileCompleteness,
    avgRating,
    totalReviews: reviewSummary._count._all,
    lastActiveAt: (recentResponses[0]?.createdAt || profile.createdAt).toISOString(),
    memberSince: provider.createdAt.toISOString(),
  };
}

async function getActiveStories(providerId: string): Promise<StoryData[]> {
  if (!(await isStoryEnabled())) return [];

  const stories = await prisma.providerStory.findMany({
    where: {
      providerId,
      expiresAt: { gt: new Date() },
      provider: {
        role: "PROVIDER",
        emailVerified: { not: null },
        providerProfile: { isActive: true },
      },
    },
    select: {
      id: true,
      imageUrl: true,
      text: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return stories.map((story) => ({
    ...story,
    createdAt: story.createdAt.toISOString(),
    expiresAt: story.expiresAt.toISOString(),
  }));
}

function parseImages(raw: string | null): string[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed)
      ? parsed
          .map((img: { url?: string } | string) => (typeof img === "string" ? img : img.url || ""))
          .filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function parseStringArray(raw: string | null): string[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function calculateProfileCompleteness(
  profile: {
    description: string | null;
    headline: string | null;
    services: string | null;
    location: string | null;
    phone: string | null;
  },
  images: string[],
  specializations: string[]
) {
  let completenessPoints = 0;
  const maxPoints = 7;
  if (profile.description && profile.description.length >= 20) completenessPoints++;
  if (profile.headline) completenessPoints++;
  if (specializations.length > 0) completenessPoints++;
  if (profile.services) completenessPoints++;
  if (profile.location) completenessPoints++;
  if (profile.phone) completenessPoints++;
  if (images.length > 0) completenessPoints++;
  return Math.round((completenessPoints / maxPoints) * 100);
}

function calculateAvgResponseTimeHours(
  responses: Array<{ createdAt: Date; request: { createdAt: Date } }>
) {
  let totalMs = 0;
  let counted = 0;

  for (const response of responses) {
    const diff = response.createdAt.getTime() - response.request.createdAt.getTime();
    if (diff > 0) {
      totalMs += diff;
      counted++;
    }
  }

  return counted > 0 ? Math.round(totalMs / counted / (1000 * 60 * 60)) : null;
}

function categoryLabel(value: string) {
  return SERVICE_CATEGORIES.find((category) => category.value === value)?.label || value;
}

function responseTimeLabel(hours: number | null) {
  if (hours === null) return null;
  if (hours < 1) return "< 1 val.";
  if (hours < 24) return `~${hours} val.`;
  return `~${Math.round(hours / 24)} d.`;
}

function reviewsLabel(count: number) {
  if (count === 1) return "atsiliepimas";
  if (count < 10) return "atsiliepimai";
  return "atsiliepimų";
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-surface-200 dark:text-surface-700"
          }`}
        />
      ))}
    </div>
  );
}

function TrustStat({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-surface-200/60 bg-white p-4 text-center dark:border-surface-700/50 dark:bg-surface-900/50">
      <div className="mb-1.5 flex justify-center">{icon}</div>
      <p className="text-lg font-bold text-surface-900 dark:text-white">{value}</p>
      <p className="text-micro text-surface-500 dark:text-surface-400">{label}</p>
    </div>
  );
}

function QuickFact({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xl border border-surface-200/60 bg-white px-3 py-1.5 text-body-sm text-surface-700 dark:border-surface-700/50 dark:bg-surface-900/50 dark:text-surface-300">
      {icon}
      {children}
    </span>
  );
}

function ProfileSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mb-6 rounded-2xl border border-surface-200/60 bg-white p-6 dark:border-surface-700/50 dark:bg-surface-900/50">
      <h2 className="mb-3 flex items-center gap-2 text-heading-3 font-semibold text-surface-900 dark:text-white">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <div className="mb-6 rounded-2xl border border-surface-200/60 bg-white p-6 dark:border-surface-700/50 dark:bg-surface-900/50">
      <h2 className="mb-4 text-heading-3 font-semibold text-surface-900 dark:text-white">{title}</h2>
      <div className="space-y-3">
        <div className="h-4 w-2/3 animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
        <div className="h-4 w-full animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
      </div>
    </div>
  );
}
