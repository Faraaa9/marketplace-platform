import type { ReactNode } from "react";
import { Award, Calendar, CheckCircle, FileCheck, MapPin, MessageSquare, Zap } from "lucide-react";
import DirectInquiryWidget from "./DirectInquiryWidget";
import MessengerCTA from "./MessengerCTA";
import ContactButton from "./ContactButton";
import CallButton from "./CallButton";
import TrackedWebsiteLink from "./TrackedWebsiteLink";
import { responseTimeLabel } from "./profileFormat";
import type { ProviderProfileWithCategories } from "./profileTypes";

interface ProfileSidebarProps {
  provider: ProviderProfileWithCategories;
  isSelf: boolean;
  resolvedSlug: string;
  acceptanceRate: number | null;
}

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-t border-surface-100 py-2.5 text-body-sm text-surface-700 first:border-t-0 dark:border-surface-800 dark:text-surface-300">
      <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-surface-50 dark:bg-surface-800">
        {icon}
      </span>
      {children}
    </div>
  );
}

export default function ProfileSidebar({
  provider,
  isSelf,
  resolvedSlug,
  acceptanceRate,
}: ProfileSidebarProps) {
  const memberYear = new Date(provider.memberSince).getFullYear();
  const respLabel = responseTimeLabel(provider.avgResponseTimeHours);
  const firstName = provider.name.split(" ")[0];

  return (
    <div className="min-w-0 space-y-6 md:sticky md:top-24">
      {/* CTA card + inquiry form */}
      <div
        id="zinute"
        className="rounded-3xl border border-surface-100 bg-gradient-to-br from-brand-50/80 to-white p-6 dark:border-surface-800 dark:from-brand-950/50 dark:to-surface-900/50"
      >
        <DirectInquiryWidget
          providerId={provider.id}
          providerSlug={resolvedSlug}
          providerName={provider.name}
          isSelf={isSelf}
          variant="sidebar"
          sidebarCTA={
            <>
              <h3 className="mb-2 text-body font-bold text-surface-900 dark:text-white">
                Reikia paslaugų?
              </h3>
              <p className="mb-4 text-body-sm text-surface-500 dark:text-surface-400">
                Parašyk {firstName} — atsakymas nemokamas, jokių įsipareigojimų.
              </p>
              {!isSelf ? (
                <>
                  <ContactButton className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-body-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-brand-700 hover:shadow-md dark:bg-brand-500 dark:hover:bg-brand-600">
                    <MessageSquare className="h-4 w-4" />
                    Rašyti žinutę
                  </ContactButton>
                  <CallButton
                    phone={provider.phone}
                    className="mt-2.5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-surface-200 bg-white text-body-sm font-semibold text-surface-900 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:text-white dark:hover:bg-surface-800"
                  />
                  <div className="mt-3.5 flex flex-wrap gap-x-3 gap-y-1 text-micro text-surface-500">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      Nemokama
                    </span>
                    {respLabel && (
                      <span className="inline-flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5 text-blue-500" />
                        Atsako per {respLabel}
                      </span>
                    )}
                    {acceptanceRate !== null && acceptanceRate > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Award className="h-3.5 w-3.5 text-emerald-500" />
                        {acceptanceRate}% priima
                      </span>
                    )}
                  </div>
                  <MessengerCTA phone={provider.phone} providerName={provider.name} />
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

      {/* Greiti faktai */}
      <div className="rounded-3xl border border-surface-100 bg-white p-6 dark:border-surface-800 dark:bg-surface-900/50">
        <p className="mb-3 text-micro font-bold uppercase tracking-[0.04em] text-surface-400">
          Greiti faktai
        </p>
        {provider.location && (
          <Fact icon={<MapPin className="h-[15px] w-[15px] text-surface-500" />}>
            {provider.location}
          </Fact>
        )}
        <Fact icon={<Calendar className="h-[15px] w-[15px] text-surface-500" />}>
          Platformoje nuo {memberYear}
        </Fact>
        {provider.availableForUrgent && (
          <Fact icon={<Zap className="h-[15px] w-[15px] text-surface-500" />}>Skubūs darbai</Fact>
        )}
        {provider.offersInvoices && (
          <Fact icon={<FileCheck className="h-[15px] w-[15px] text-surface-500" />}>
            Išrašo sąskaitas faktūras
          </Fact>
        )}
        {provider.website && <TrackedWebsiteLink website={provider.website} />}
      </div>
    </div>
  );
}
