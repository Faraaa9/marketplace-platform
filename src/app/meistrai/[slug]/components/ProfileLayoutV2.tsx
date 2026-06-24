import { Suspense } from "react";
import { Euro } from "lucide-react";
import ProfileTabs, { type TabPanel } from "./ProfileTabs";
import ProfileHeroCard from "./ProfileHeroCard";
import ProfileSidebar from "./ProfileSidebar";
import ReviewsSection from "./ReviewsSection";
import WorkProjects from "./WorkProjects";
import SimilarProvidersSection from "./SimilarProvidersSection";
import SectionErrorBoundary from "./SectionErrorBoundary";
import { SectionSkeleton } from "./ProfileUiHelpers";
import type { StoryData } from "./types";
import type { ProviderProfileWithCategories } from "./profileTypes";

interface ProfileLayoutV2Props {
  provider: ProviderProfileWithCategories;
  stories: StoryData[];
  isSelf: boolean;
  profileUrl: string;
  resolvedSlug: string;
  providerIsOnline: boolean;
  acceptanceRate: number | null;
  profileDescription: string | null;
}

const CARD =
  "profile-card bg-white p-6 sm:p-8 dark:bg-surface-900/50";
const SEC_TITLE =
  "mb-4 flex items-center gap-2 text-micro font-bold uppercase tracking-[0.04em] text-surface-400";

export default function ProfileLayoutV2({
  provider,
  stories,
  isSelf,
  profileUrl,
  resolvedSlug,
  providerIsOnline,
  acceptanceRate,
  profileDescription,
}: ProfileLayoutV2Props) {
  const serviceChips = (provider.services ?? "")
    .split(/[\n,•·]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12);

  const panels: TabPanel[] = [
    {
      id: "darbai",
      label: "Atlikti darbai",
      content: <WorkProjects gallery={provider.gallery} providerName={provider.name} />,
    },
    {
      id: "atsiliepimai",
      label: "Atsiliepimai",
      content: (
        <div id="atsiliepimai" className="scroll-mt-24">
          <SectionErrorBoundary title="Atsiliepimai">
            <Suspense fallback={<SectionSkeleton title="Atsiliepimai" />}>
              <ReviewsSection
                providerId={provider.id}
                avgRating={provider.avgRating}
                totalReviews={provider.totalReviews}
              />
            </Suspense>
          </SectionErrorBoundary>
        </div>
      ),
    },
    {
      id: "apie",
      label: "Apie ir kainos",
      content: (
        <>
          {(profileDescription || serviceChips.length > 0) && (
            <div className={CARD}>
              <p className={SEC_TITLE}>Apie tiekėją</p>
              {profileDescription && (
                <p className="whitespace-pre-wrap text-body leading-relaxed text-surface-600 dark:text-surface-400">
                  {profileDescription}
                </p>
              )}
              {serviceChips.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {serviceChips.map((chip, i) => (
                    <span
                      key={`${chip}-${i}`}
                      className="rounded-[10px] border border-surface-100 bg-surface-50 px-3 py-1.5 text-body-sm text-surface-700 dark:border-surface-800 dark:bg-surface-800/50 dark:text-surface-300"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className={CARD}>
            <p className={SEC_TITLE}>
              <Euro className="h-4 w-4 text-surface-400" />
              Kainos
            </p>
            {provider.priceFrom !== null && provider.priceFrom > 0 && (
              <div className="flex items-baseline justify-between gap-4 border-b border-surface-100 py-3 text-body dark:border-surface-800">
                <span className="text-surface-700 dark:text-surface-300">Iškvietimas</span>
                <span className="whitespace-nowrap font-bold text-surface-900 dark:text-white">
                  nuo {provider.priceFrom} €
                </span>
              </div>
            )}
            <p className="mt-3 text-micro text-surface-400">
              Kaina derinama pagal darbų apimtį. Tiksli sąmata — nemokama.
            </p>
          </div>
        </>
      ),
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] md:items-start">
      <div className="min-w-0">
        <ProfileTabs
          defaultTab="darbai"
          hero={
            <ProfileHeroCard
              provider={provider}
              stories={stories}
              isSelf={isSelf}
              profileUrl={profileUrl}
              providerIsOnline={providerIsOnline}
            />
          }
          panels={panels}
        />
      </div>

      <ProfileSidebar
        provider={provider}
        isSelf={isSelf}
        resolvedSlug={resolvedSlug}
        acceptanceRate={acceptanceRate}
      />

      <div className="min-w-0 md:col-span-2">
        <SectionErrorBoundary title="Panašūs tiekėjai">
          <Suspense fallback={<SectionSkeleton title="Panašūs tiekėjai" />}>
            <SimilarProvidersSection
              providerId={provider.id}
              categoryIds={provider.categories.map((c) => c.id)}
              location={provider.location}
            />
          </Suspense>
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
