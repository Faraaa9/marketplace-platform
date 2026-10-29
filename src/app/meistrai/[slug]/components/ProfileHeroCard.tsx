import type { ReactNode } from "react";
import Image from "next/image";
import { Check, Wrench } from "lucide-react";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import StoryAvatarButton from "./StoryAvatarButton";
import ProfileShareButton from "./ProfileShareButton";
import ContactButton from "./ContactButton";
import CallButton from "./CallButton";
import { RatingStars } from "./ProfileUiHelpers";
import { responseTimeLabel, reviewsLabel } from "./profileFormat";
import type { StoryData } from "./types";
import type { ProviderProfileWithCategories } from "./profileTypes";

interface ProfileHeroCardProps {
  provider: ProviderProfileWithCategories;
  stories: StoryData[];
  isSelf: boolean;
  profileUrl: string;
  providerIsOnline: boolean;
}

interface TrustCell {
  value: ReactNode;
  label: string;
}

export default function ProfileHeroCard({
  provider,
  stories,
  isSelf,
  profileUrl,
  providerIsOnline,
}: ProfileHeroCardProps) {
  const city = provider.primaryCity ?? provider.location;
  const profession = provider.primaryService ?? provider.categories[0]?.name ?? null;
  const headlineParts = [city, profession].filter(Boolean) as string[];
  const headline = headlineParts.length > 0 ? headlineParts.join(" · ") : provider.headline;

  const cells: TrustCell[] = [];
  if (provider.experienceYears) {
    cells.push({ value: `${provider.experienceYears} m.`, label: "patirtis" });
  }
  const respLabel = responseTimeLabel(provider.avgResponseTimeHours);
  if (respLabel) cells.push({ value: respLabel, label: "atsako per" });
  if (provider.offersInvoices) {
    cells.push({
      value: <Check className="mx-auto h-5 w-5 text-emerald-600" strokeWidth={2.5} />,
      label: "sąskaitos faktūros",
    });
  }
  if (provider.priceFrom !== null && provider.priceFrom > 0) {
    cells.push({ value: `nuo ${provider.priceFrom} €`, label: "iškvietimas" });
  }

  return (
    <>
      {/* Cover with avatar pinned bottom-left at equal inset */}
      <div className="relative h-[300px] w-full overflow-hidden bg-gradient-to-br from-brand-100 via-brand-50 to-surface-100 dark:from-brand-950 dark:via-surface-900 dark:to-surface-800">
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
            <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/10" />
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

        <div className="absolute bottom-[26px] left-[26px] z-10">
          <StoryAvatarButton
            stories={stories}
            providerName={provider.name}
            providerImage={provider.avatarImage}
            isOnline={providerIsOnline}
          />
        </div>
      </div>

      {/* Identity */}
      <div className="px-6 pb-5 pt-4 sm:px-8">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 text-2xl font-bold leading-tight tracking-[-0.03em] text-surface-900 sm:text-[30px] dark:text-white">
                {provider.name}
              </h1>
              {provider.isVerified && <VerifiedBadge tier="verified" size="md" />}
              {provider.isYoungTalent && <VerifiedBadge tier="young-talent" size="md" />}
              {provider.isPremium && <VerifiedBadge tier="premium" size="md" />}
              {provider.isGoat && <VerifiedBadge tier="goat" size="md" />}
            </div>
            {headline && (
              <p className="mt-1.5 text-[15px] leading-snug text-surface-500 dark:text-surface-400">
                {headline}
              </p>
            )}
          </div>
          <ProfileShareButton providerName={provider.name} profileUrl={profileUrl} />
        </div>

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

        {/* Mobile-only CTAs (desktop keeps them in the sidebar) */}
        {!isSelf && (
          <div className="mt-4 flex gap-2.5 md:hidden">
            <ContactButton className="flex h-12 flex-[1.5] items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-body-sm font-semibold text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600" />
            <CallButton
              phone={provider.phone}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-surface-200 bg-white px-4 text-body-sm font-semibold text-surface-900 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:text-white dark:hover:bg-surface-800"
            />
          </div>
        )}
      </div>

      {/* Trust strip */}
      {cells.length > 0 && (
        <div
          className="grid border-t border-surface-100 dark:border-surface-800"
          style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
        >
          {cells.map((cell, i) => (
            <div
              key={cell.label}
              className={`px-3 py-4 text-center ${i > 0 ? "border-l border-surface-100 dark:border-surface-800" : ""}`}
            >
              <div className="text-body font-bold leading-tight text-surface-900 dark:text-white">
                {cell.value}
              </div>
              <div className="mt-1 text-micro text-surface-400">{cell.label}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
