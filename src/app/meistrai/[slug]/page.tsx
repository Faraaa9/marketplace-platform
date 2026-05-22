import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getSafeProviderImageUrl } from "@/lib/cloudinary-image";
import { isStoryEnabled } from "@/lib/platform-settings";
import { isCuid } from "@/lib/slug";
import EmptyState from "@/components/ui/EmptyState";
import { JsonLd } from "@/components/seo/JsonLd";
import DirectInquiryWidget from "./components/DirectInquiryWidget";
import MessengerCTA from "./components/MessengerCTA";
import ReviewsSection from "./components/ReviewsSection";
import SimilarProvidersSection from "./components/SimilarProvidersSection";
import StoryAvatarButton from "./components/StoryAvatarButton";
import WorkHighlightsStrip from "./components/WorkHighlightsStrip";
import StickyBottomBar from "./components/StickyBottomBar";
import ContactButton from "./components/ContactButton";
import HeroInfoCard from "./components/HeroInfoCard";
import HeroDescriptionPreview from "./components/HeroDescriptionPreview";
import type { ProviderProfileData, StoryData } from "./components/types";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  Calendar,
  CheckCircle,
  Clock,
  Euro,
  FileCheck,
  Globe,
  MapPin,
  MessageSquare,
  Package,
  Search,
  Shield,
  ShieldCheck,
  Star,
  Tag,
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
  params: Promise<{ slug: string }>;
}

interface ProviderCategory {
  id: string;
  name: string;
  slug: string;
}

/** ProviderProfileData plus the provider's curated categories. */
type ProviderProfileWithCategories = ProviderProfileData & {
  categories: ProviderCategory[];
};

export default async function PublicProviderProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const lookup = await resolveProvider(slug);

  // Legacy /meistrai/[cuid] → redirect to slug version (preserves SEO juice).
  if (lookup && "__redirectTo" in lookup) {
    redirect(`/meistrai/${lookup.__redirectTo}`);
  }

  if (!lookup) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState
          title="Tiekėjas nerastas"
          description="Šis profilis neegzistuoja arba yra neaktyvus."
        />
      </div>
    );
  }

  const { userId: providerUserId, slug: resolvedSlug } = lookup;

  const [provider, stories, session, topReviews] = await Promise.all([
    getProviderProfile(providerUserId),
    getActiveStories(providerUserId),
    getServerSession(authOptions),
    getTopReviewsForSeo(providerUserId),
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://paslaugurinka.lt";
  const profileUrl = `${baseUrl}/meistrai/${resolvedSlug}`;
  const localBusinessSchema = buildLocalBusinessSchema(provider, profileUrl);
  const breadcrumbSchema = buildBreadcrumbSchema(provider.name, profileUrl, baseUrl);
  const reviewSchemas = buildReviewSchemas(provider.name, topReviews);

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
  const isDemo = provider.name.includes("(DEMO)") || provider.name.includes("(TEST)");
  const profileDescription =
    provider.description ||
    (isDemo
      ? `${provider.name.replace(/ \((DEMO|TEST)\)/, "")} – patikimas paslaugų tiekėjas su ilgamete patirtimi. Specializuojasi kokybišku darbų atlikimu ir individualiu požiūriu į kiekvieną klientą. Susisiekite ir gaukite nemokamą konsultaciją.`
      : null);

  return (
    <div className="min-h-screen">
      <JsonLd schema={localBusinessSchema} />
      <JsonLd schema={breadcrumbSchema} />
      {reviewSchemas.length > 0 && <JsonLd schema={reviewSchemas} />}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/meistrai"
          className="mb-8 inline-flex items-center gap-1.5 text-body-sm text-surface-500 transition-colors hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Visi meistrai
        </Link>

        {/* ── Profile Layout ── */}
        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] md:items-start">
          <div className="min-w-0 space-y-6">

          {/* ── Hero: Cover + Avatar + Name + Meta ── */}
          <div className="overflow-hidden rounded-t-[28px] rounded-b-3xl bg-white dark:bg-surface-900/50">
            {/* Cover photo with gradient overlay */}
            <div className="relative h-52 w-full overflow-hidden rounded-[28px_28px_18px_18px] bg-gradient-to-br from-brand-100 via-brand-50 to-surface-100 sm:h-72 dark:from-brand-950 dark:via-surface-900 dark:to-surface-800">
              {provider.images.length > 0 ? (
                <>
                  <Image
                    src={provider.images[0]}
                    alt={`${provider.name} — darbai`}
                    fill
                    sizes="(max-width: 768px) 100vw, 66vw"
                    quality={90}
                    priority
                    className="object-cover"
                  />
                  {/* Subtle top vignette for contrast */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-transparent" />
                  {/* Soft bottom shade — lets the floating card merge into the photo */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.12) 100%)",
                    }}
                  />
                </>
              ) : (
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute -left-16 top-8 h-44 w-44 rounded-full bg-brand-200/50 blur-3xl dark:bg-brand-800/30" />
                  <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-amber-100/70 blur-3xl dark:bg-amber-900/20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Wrench className="h-16 w-16 text-brand-200/70 dark:text-brand-800/50" />
                  </div>
                </div>
              )}
            </div>

            {/* Profile info overlapping cover */}
            <div className="px-6 sm:px-8 pb-6 sm:pb-8">
              <div className="relative z-10 -mt-14 flex items-start gap-4 sm:gap-5">
                <div className="shrink-0 rounded-full bg-white p-1 shadow-[0_4px_16px_rgba(0,0,0,0.1)] ring-1 ring-surface-200/70 dark:bg-surface-900 dark:ring-surface-700/70">
                  <StoryAvatarButton
                    stories={stories}
                    providerName={provider.name}
                    providerImage={provider.image}
                  />
                </div>

                <HeroInfoCard>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="min-w-0 text-2xl font-bold leading-tight tracking-[-0.03em] text-surface-900 sm:text-[34px] dark:text-white">
                      {provider.name}
                    </h1>
                    {provider.badge && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-micro font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                        <Shield className="h-3 w-3" />
                        {provider.badge}
                      </span>
                    )}
                  </div>

                  {provider.headline && (
                    <p className="mt-2 truncate text-[15px] leading-snug text-surface-500 dark:text-surface-400">
                      {provider.headline}
                    </p>
                  )}

                  {provider.avgRating !== null && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <RatingStars rating={provider.avgRating} />
                      <span className="text-body-sm font-medium text-surface-700 dark:text-surface-300">
                        {provider.avgRating}
                      </span>
                      <span className="whitespace-nowrap text-body-sm text-surface-400">
                        ({provider.totalReviews} {reviewsLabel(provider.totalReviews)})
                      </span>
                    </div>
                  )}
                </HeroInfoCard>
              </div>

              {/* Meta info below the avatar row */}
              <div className="mt-4 space-y-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {provider.location && (
                    <MetaPill icon={<MapPin className="h-3.5 w-3.5" />}>
                      {provider.location}
                    </MetaPill>
                  )}
                  <MetaPill icon={<Calendar className="h-3.5 w-3.5" />}>
                    Narys nuo{" "}
                    {new Date(provider.memberSince).toLocaleDateString("lt-LT", {
                      year: "numeric",
                      month: "long",
                    })}
                  </MetaPill>
                  {isRecentlyActive && (
                    <MetaPill icon={<Clock className="h-3.5 w-3.5" />} tone="success">
                      Aktyvus šią savaitę
                    </MetaPill>
                  )}
                  {provider.website && (
                    <a
                      href={provider.website.startsWith("http") ? provider.website : `https://${provider.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-body-sm text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-950/60 dark:text-brand-300 dark:hover:bg-brand-950"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Svetainė
                    </a>
                  )}
                </div>

                {/* Curated categories as subtle badges */}
                {provider.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {provider.categories.map((category) => (
                      <Link
                        key={category.id}
                        href={`/meistrai?category=${category.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-surface-100 px-2.5 py-1 text-micro font-medium text-surface-700 transition-colors hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
                      >
                        <Tag className="h-3 w-3" />
                        {category.name}
                      </Link>
                    ))}
                  </div>
                )}

                {!isSelf && (
                  <div className="pt-1">
                    <ContactButton className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-body-sm font-medium text-white transition-all duration-150 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600" />
                  </div>
                )}
              </div>

              {/* Quick facts inline */}
              {(provider.experienceYears ||
                provider.priceFrom ||
                provider.offersInvoices ||
                provider.availableForUrgent) && (
                <div className="mt-5 flex flex-wrap gap-2">
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
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-body-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                      <Zap className="h-3.5 w-3.5" />
                      Skubūs darbai
                    </span>
                  )}
                </div>
              )}

              {profileDescription && (
                <HeroDescriptionPreview description={profileDescription} />
              )}
            </div>
          </div>

          {/* ── Work Highlights + Masonry Gallery ── */}
          {provider.images.length > 1 && (
            <div className="rounded-3xl bg-white p-6 sm:p-8 dark:bg-surface-900/50">
              {/* Instagram-style story circles */}
              <WorkHighlightsStrip images={provider.images} providerName={provider.name} />

              <h2 className="mt-6 mb-4 text-heading-3 font-semibold text-surface-900 dark:text-white">
                Darbų pavyzdžiai
              </h2>
              <div className="columns-2 sm:columns-3 gap-3 space-y-3">
                {provider.images.slice(1).map((img, i) => (
                  <div
                    key={`${img}-${i}`}
                    className="break-inside-avoid overflow-hidden rounded-2xl bg-surface-100 dark:bg-surface-800"
                  >
                    <Image
                      src={img}
                      alt={`${provider.name} darbas ${i + 2}`}
                      width={400}
                      height={i % 3 === 0 ? 500 : i % 3 === 1 ? 300 : 400}
                      quality={90}
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 220px"
                      className="w-full h-auto object-cover transition-transform duration-300 hover:scale-105"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Main content column ── */}
          <div className="space-y-8">

            {/* Kainoraštis — pricing tiers */}
            <PricingBlock priceFrom={provider.priceFrom} availableForUrgent={provider.availableForUrgent} />

            {(provider.services || isDemo) && (
              <ProfileSection
                title="Teikiamos paslaugos"
                icon={<Wrench className="h-4 w-4 text-surface-400" />}
              >
                <p className="whitespace-pre-wrap text-body leading-relaxed text-surface-600 dark:text-surface-400">
                  {provider.services || "Šis tiekėjas dar nepateikė paslaugų aprašymo. Susisiekite tiesiogiai, kad sužinotumėte daugiau apie teikiamas paslaugas ir kainas."}
                </p>
              </ProfileSection>
            )}

            <div id="atsiliepimai" className="scroll-mt-24">
              <Suspense fallback={<SectionSkeleton title="Atsiliepimai" />}>
                <ReviewsSection
                  providerId={provider.id}
                  avgRating={provider.avgRating}
                  totalReviews={provider.totalReviews}
                />
              </Suspense>
            </div>
          </div>
          </div>

          {/* ── Sticky Sidebar: Stats ── */}
          <div className="min-w-0 space-y-6 md:sticky md:top-24">
            <div className="rounded-3xl bg-white p-6 dark:bg-surface-900/50">
              <h3 className="text-body-sm font-semibold text-surface-900 dark:text-white mb-4">
                Statistika
              </h3>
              <div className="space-y-4">
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
            </div>

            {/* Sidebar CTA / Inquiry form */}
            <div id="zinute" className="rounded-3xl bg-gradient-to-br from-brand-50/80 to-white p-6 dark:from-brand-950/50 dark:to-surface-900/50">
              <DirectInquiryWidget
                providerId={provider.id}
                providerName={provider.name}
                isSelf={isSelf}
                variant="sidebar"
                sidebarCTA={
                  <>
                    <h3 className="text-body font-bold text-surface-900 dark:text-white mb-2">
                      Reikia paslaugų?
                    </h3>
                    <p className="text-body-sm text-surface-500 dark:text-surface-400 mb-4">
                      Pateikite nemokamą užklausą — tiekėjai patys pateiks pasiūlymus.
                    </p>
                    <div className="flex flex-wrap gap-2 text-micro text-surface-500 mb-4">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                        Nemokama
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
                          {acceptanceRate}%
                        </span>
                      )}
                    </div>
                    {!isSelf ? (
                      <>
                        <ContactButton className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-body-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-brand-700 hover:shadow-md dark:bg-brand-500 dark:hover:bg-brand-600">
                          <MessageSquare className="h-4 w-4" />
                          Rašyti tiekėjui
                        </ContactButton>
                        <MessengerCTA
                          phone={provider.phone}
                          providerName={provider.name}
                        />
                      </>
                    ) : (
                      <div className="flex h-11 w-full items-center justify-center rounded-xl bg-surface-100 text-body-sm font-medium text-surface-500 dark:bg-surface-800 dark:text-surface-400">
                        Tai jūsų profilis
                      </div>
                    )}
                  </>
                }
              />
            </div>

            {/* Pasitikėjimo blokas */}
            <TrustSignals
              experienceYears={provider.experienceYears}
              offersInvoices={provider.offersInvoices}
              availableForUrgent={provider.availableForUrgent}
              avgResponseTimeHours={provider.avgResponseTimeHours}
            />
          </div>

          {/* ── Full-width: Similar providers ── */}
          <div className="min-w-0 md:col-span-2">
            <Suspense fallback={<SectionSkeleton title="Panašūs tiekėjai" />}>
              <SimilarProvidersSection
                providerId={provider.id}
                categoryIds={provider.categories.map((c) => c.id)}
                location={provider.location}
              />
            </Suspense>
          </div>
        </div>
      </div>

      <StickyBottomBar
        priceFrom={provider.priceFrom}
        providerName={provider.name}
        isSelf={isSelf}
      />
    </div>
  );
}

/**
 * Resolves a path segment (slug or legacy cuid) to a provider's userId + slug.
 * Returns `{ __redirectTo: slug }` when the input was a cuid that maps to an
 * active provider — caller should `redirect()` to the canonical slug URL.
 */
async function resolveProvider(
  slugOrId: string,
): Promise<{ userId: string; slug: string } | { __redirectTo: string } | null> {
  // Try slug lookup first (the hot path).
  const bySlug = await prisma.providerProfile.findUnique({
    where: { slug: slugOrId },
    select: { userId: true, slug: true },
  });
  // Imported (unclaimed) providers have no userId — this page resolves by
  // userId, so they are not surfaced here until Phase 2.3 rewires it.
  if (bySlug?.slug && bySlug.userId) {
    return { userId: bySlug.userId, slug: bySlug.slug };
  }

  // Legacy URL: the segment looks like a cuid → user.id.
  if (isCuid(slugOrId)) {
    const byUserId = await prisma.providerProfile.findUnique({
      where: { userId: slugOrId },
      select: { slug: true },
    });
    if (byUserId?.slug) {
      return { __redirectTo: byUserId.slug };
    }
  }

  return null;
}

async function getProviderProfile(
  id: string,
): Promise<ProviderProfileWithCategories | null> {
  const [provider, reviewSummary, recentResponses, acceptedRows] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id,
        role: "PROVIDER",
        emailVerified: { not: null },
        providerProfile: { isActive: true, moderationStatus: "APPROVED" },
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
            categories: {
              select: { category: { select: { id: true, name: true, slug: true } } },
              orderBy: { sortOrder: "asc" },
            },
            location: true,
            phone: true,
            website: true,
            images: true,
            isVerified: true,
            createdAt: true,
          },
        },
        _count: { select: { responses: true } },
      },
    }),
    prisma.review.aggregate({
      where: { providerId: id, moderationStatus: "APPROVED" },
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
  const badge = profile.isVerified ? "Patikimas" : null;
  const images = sanitizeImageUrls(profile.images);
  const categories: ProviderCategory[] = (profile.categories ?? []).map((link) => ({
    id: link.category.id,
    name: link.category.name,
    slug: link.category.slug,
  }));
  const profileCompleteness = calculateProfileCompleteness(profile, images, categories);
  const avgResponseTimeHours = calculateAvgResponseTimeHours(recentResponses);
  const avgRating =
    reviewSummary._avg.rating !== null
      ? Math.round(reviewSummary._avg.rating * 10) / 10
      : null;
  const acceptedCount = Number(acceptedRows[0]?.count ?? 0);

  return {
    id: provider.id,
    name: provider.name || "Tiekėjas",
    image: getSafeProviderImageUrl(images[0] || provider.image),
    images,
    description: profile.description,
    headline: profile.headline,
    services: profile.services,
    priceFrom: profile.priceFrom,
    experienceYears: profile.experienceYears,
    offersInvoices: profile.offersInvoices,
    availableForUrgent: profile.availableForUrgent,
    categories,
    location: profile.location,
    website: profile.website,
    phone: profile.phone,
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
      moderationStatus: "APPROVED",
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

interface SeoReview {
  rating: number;
  comment: string;
  createdAt: string;
  authorName: string;
}

async function getTopReviewsForSeo(providerId: string): Promise<SeoReview[]> {
  const reviews = await prisma.review.findMany({
    where: {
      providerId,
      moderationStatus: "APPROVED",
      comment: { not: null },
    },
    select: {
      rating: true,
      comment: true,
      createdAt: true,
      client: { select: { name: true } },
    },
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
    take: 3,
  });

  return reviews
    .filter((review): review is typeof review & { comment: string } => Boolean(review.comment))
    .map((review) => ({
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
      authorName: review.client?.name?.trim() || "Klientas",
    }));
}

function buildLocalBusinessSchema(
  provider: ProviderProfileWithCategories,
  profileUrl: string
): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: provider.name,
    url: profileUrl,
  };

  if (provider.image) {
    schema.image = provider.image;
  }

  const description = provider.description
    ? provider.description.length > 500
      ? `${provider.description.slice(0, 497)}...`
      : provider.description
    : null;
  if (description) {
    schema.description = description;
  }

  schema.address = {
    "@type": "PostalAddress",
    addressLocality: provider.location || "Lietuva",
    addressCountry: "LT",
  };

  schema.areaServed =
    !provider.location || provider.location.toLowerCase().includes("visa lietuva")
      ? "Lithuania"
      : provider.location;

  if (provider.totalReviews > 0 && provider.avgRating !== null) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: provider.avgRating,
      reviewCount: provider.totalReviews,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (provider.priceFrom !== null && provider.priceFrom > 0) {
    if (provider.priceFrom < 25) {
      schema.priceRange = "€";
    } else if (provider.priceFrom < 75) {
      schema.priceRange = "€€";
    } else if (provider.priceFrom < 200) {
      schema.priceRange = "€€€";
    } else {
      schema.priceRange = "€€€€";
    }
  }

  if (provider.website) {
    const websiteUrl = provider.website.startsWith("http")
      ? provider.website
      : `https://${provider.website}`;
    schema.sameAs = [websiteUrl];
  }

  if (provider.categories.length > 0) {
    schema.knowsAbout = provider.categories.map((category) => category.name);
  }

  return schema;
}

function buildBreadcrumbSchema(
  providerName: string,
  profileUrl: string,
  baseUrl: string
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Pagrindinis",
        item: `${baseUrl}/`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Meistrai",
        item: `${baseUrl}/meistrai`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: providerName,
        item: profileUrl,
      },
    ],
  };
}

function buildReviewSchemas(
  providerName: string,
  reviews: SeoReview[]
): Array<Record<string, unknown>> {
  return reviews.map((review) => ({
    "@context": "https://schema.org",
    "@type": "Review",
    itemReviewed: {
      "@type": "LocalBusiness",
      name: providerName,
    },
    author: {
      "@type": "Person",
      name: review.authorName,
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
    reviewBody: review.comment,
    datePublished: review.createdAt,
  }));
}

function sanitizeImageUrls(raw: string[] | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .map((url) => getSafeProviderImageUrl(url))
    .filter((url): url is string => Boolean(url));
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
  categories: ProviderCategory[]
) {
  let completenessPoints = 0;
  const maxPoints = 7;
  if (profile.description && profile.description.length >= 20) completenessPoints++;
  if (profile.headline) completenessPoints++;
  if (categories.length > 0) completenessPoints++;
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
          className={`h-3.5 w-3.5 ${
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
    <div className="flex items-center gap-3 rounded-2xl bg-surface-50 p-3.5 dark:bg-surface-800/50">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-surface-900">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-body font-bold text-surface-900 dark:text-white leading-tight">{value}</p>
        <p className="text-micro text-surface-500 dark:text-surface-400">{label}</p>
      </div>
    </div>
  );
}

function QuickFact({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-100 px-3 py-1.5 text-body-sm text-surface-700 dark:bg-surface-800 dark:text-surface-300">
      {icon}
      {children}
    </span>
  );
}

function MetaPill({
  icon,
  children,
  tone = "neutral",
}: {
  icon: ReactNode;
  children: ReactNode;
  tone?: "neutral" | "success";
}) {
  const toneClasses =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
      : "bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-body-sm ${toneClasses}`}
    >
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
    <div className="rounded-3xl bg-white p-6 sm:p-8 dark:bg-surface-900/50">
      <h2 className="mb-4 flex items-center gap-2 text-heading-3 font-semibold text-surface-900 dark:text-white">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <div className="rounded-3xl bg-white p-6 sm:p-8 dark:bg-surface-900/50">
      <h2 className="mb-4 text-heading-3 font-semibold text-surface-900 dark:text-white">{title}</h2>
      <div className="space-y-3">
        <div className="h-4 w-2/3 animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
        <div className="h-4 w-full animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
      </div>
    </div>
  );
}

function PricingBlock({
  priceFrom,
  availableForUrgent,
}: {
  priceFrom: number | null;
  availableForUrgent: boolean;
}) {
  const base = priceFrom && priceFrom > 0 ? priceFrom : 30;

  const tiers = [
    {
      title: "Diagnostika",
      description: "Apžiūra vietoje, problemos identifikavimas ir rekomendacijos",
      price: `Nuo ${base} €`,
      icon: <Search className="h-5 w-5 text-blue-500" />,
    },
    {
      title: "Skubus remontas",
      description: "Greitas atvykimas ir neatidėliotini darbai tą pačią dieną",
      price: availableForUrgent ? `Nuo ${Math.round(base * 2.5)} €` : "Derinama",
      icon: <Zap className="h-5 w-5 text-amber-500" />,
      highlight: availableForUrgent,
    },
    {
      title: "Pilnas paketas",
      description: "Kompleksiniai darbai su medžiagomis, garantija ir ataskaita",
      price: `Nuo ${Math.round(base * 5)} €`,
      icon: <Package className="h-5 w-5 text-emerald-500" />,
    },
  ];

  return (
    <div className="rounded-3xl bg-white p-6 sm:p-8 dark:bg-surface-900/50">
      <h2 className="mb-6 flex items-center gap-2 text-heading-3 font-semibold text-surface-900 dark:text-white">
        <Euro className="h-4 w-4 text-surface-400" />
        Kainoraštis
      </h2>
      <div className="grid gap-5 sm:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.title}
            className={`relative rounded-2xl p-5 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 ${
              tier.highlight
                ? "bg-amber-50/80 dark:bg-amber-500/5 ring-1 ring-amber-200/60 dark:ring-amber-800/30 shadow-md"
                : "bg-surface-50 dark:bg-surface-800/50 shadow-sm"
            }`}
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-surface-900 shadow-sm">
              {tier.icon}
            </div>
            <h3 className="text-body font-bold text-surface-900 dark:text-white">
              {tier.title}
            </h3>
            <p className="mt-1.5 text-micro text-surface-500 dark:text-surface-400 leading-relaxed">
              {tier.description}
            </p>
            <p className="mt-4 text-body font-bold text-surface-900 dark:text-white">
              {tier.price}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-micro text-surface-400 dark:text-surface-500">
        Orientacinės kainos. Tiksli kaina priklauso nuo darbų apimties.
      </p>
    </div>
  );
}

function TrustSignals({
  experienceYears,
  offersInvoices,
  availableForUrgent,
  avgResponseTimeHours,
}: {
  experienceYears: number | null;
  offersInvoices: boolean;
  availableForUrgent: boolean;
  avgResponseTimeHours: number | null;
}) {
  const signals: Array<{ icon: ReactNode; label: string; sublabel: string }> = [];

  if (experienceYears && experienceYears >= 2) {
    signals.push({
      icon: <ShieldCheck className="h-5 w-5 text-emerald-500" />,
      label: `Garantija ${Math.min(experienceYears, 5)} ${experienceYears >= 5 ? "metų" : "metai"}`,
      sublabel: "Ilgametė patirtis — kokybė garantuota",
    });
  } else {
    signals.push({
      icon: <ShieldCheck className="h-5 w-5 text-emerald-500" />,
      label: "Darbų garantija",
      sublabel: "Kokybė ir atsakingumas",
    });
  }

  if (availableForUrgent && avgResponseTimeHours !== null && avgResponseTimeHours <= 24) {
    signals.push({
      icon: <Clock className="h-5 w-5 text-blue-500" />,
      label: avgResponseTimeHours < 2 ? "Atvykimas per 1 val." : `Atsako per ${avgResponseTimeHours} val.`,
      sublabel: "Greitas reagavimas ir skubūs darbai",
    });
  } else {
    signals.push({
      icon: <Clock className="h-5 w-5 text-blue-500" />,
      label: "Greitas atsakymas",
      sublabel: "Operatyvus bendravimas su klientais",
    });
  }

  if (offersInvoices) {
    signals.push({
      icon: <BadgeCheck className="h-5 w-5 text-violet-500" />,
      label: "Sąskaitos faktūros",
      sublabel: "Oficialūs dokumentai kiekvienam užsakymui",
    });
  } else {
    signals.push({
      icon: <BadgeCheck className="h-5 w-5 text-violet-500" />,
      label: "Patikrintas profilis",
      sublabel: "El. paštas patvirtintas platformoje",
    });
  }

  return (
    <div className="rounded-3xl bg-gradient-to-br from-emerald-50/80 via-white to-blue-50/60 p-6 ring-1 ring-emerald-100/60 dark:from-emerald-950/30 dark:via-surface-900/50 dark:to-blue-950/20 dark:ring-emerald-900/30">
      <h3 className="text-body font-bold text-surface-900 dark:text-white mb-5">
        Kodėl verta pasirinkti
      </h3>
      <div className="space-y-4">
        {signals.map((signal) => (
          <div key={signal.label} className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-surface-800">
              {signal.icon}
            </div>
            <div className="min-w-0">
              <p className="text-body-sm font-semibold text-surface-900 dark:text-white leading-tight">
                {signal.label}
              </p>
              <p className="text-micro text-surface-500 dark:text-surface-400">
                {signal.sublabel}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
