import { ShieldCheck, CheckCircle2, Mail, Building2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isStoryEnabled } from "@/lib/platform-settings";
import AccountStoryAvatar from "../AccountStoryAvatar";
import ResendVerificationBanner from "../ResendVerificationBanner";

/**
 * Identity + account status for the provider dashboard: the avatar/name/email
 * row, verification + suspension badges, and the conditional alerts
 * (email-verification, pending profile claim, suspension) — all driven by a
 * single user + profile read.
 */
export async function AccountCard({ userId }: { userId: string }) {
  const [user, profile, storyEnabled, pendingClaim] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, emailVerified: true },
    }),
    prisma.providerProfile.findUnique({
      where: { userId },
      select: { isActive: true, images: true },
    }),
    isStoryEnabled(),
    prisma.claimRequest.findFirst({
      where: {
        requestedByUserId: userId,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        status: true,
        supplier: { select: { displayName: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const emailVerified = !!user?.emailVerified;
  const isActive = profile?.isActive ?? false;
  const profileImageUrl = profile?.images?.[0] ?? null;
  const activeStoryCount = storyEnabled
    ? await prisma.providerStory.count({
        where: { providerId: userId, expiresAt: { gt: new Date() } },
      })
    : 0;

  return (
    <>
      {/* Account info */}
      <div className="mb-4 rounded-xl border border-surface-200/60 bg-white px-4 py-3.5 dark:border-surface-700/50 dark:bg-surface-900/50">
        <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
          <AccountStoryAvatar
            profileImageUrl={profileImageUrl}
            storyEnabled={storyEnabled}
            isActive={isActive}
            emailVerified={emailVerified}
            activeStoryCount={activeStoryCount}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm font-medium text-surface-900 dark:text-white">
              {user?.name || "Tiekėjas"}
            </p>
            <p className="truncate text-micro text-surface-400">{user?.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!isActive && emailVerified && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-micro font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400">
                <ShieldCheck className="h-3 w-3" />
                Sustabdyta
              </span>
            )}
            {emailVerified ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-micro font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                Patvirtintas
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-micro font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                <Mail className="h-3 w-3" />
                Nepatvirtintas
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Compact alerts — email, activation */}
      {!emailVerified && <ResendVerificationBanner />}

      {emailVerified && !isActive && pendingClaim && (
        <div className="mb-4 rounded-2xl border border-amber-200/60 bg-amber-50 p-5 dark:border-amber-800/40 dark:bg-amber-500/10">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/20">
              <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-body font-semibold text-amber-900 dark:text-amber-200">
                Laukiama profilio perėmimo patvirtinimo
              </h2>
              <p className="mt-1 text-body-sm leading-relaxed text-amber-800/80 dark:text-amber-300/80">
                Patvirtinote el. paštą ir paskyra jau paruošta.
                {pendingClaim.supplier?.displayName
                  ? ` Administratorius peržiūrės „${pendingClaim.supplier.displayName}" perėmimo prašymą.`
                  : " Administratorius peržiūrės jūsų prašymą."}
                {" "}Po patvirtinimo galėsite redaguoti perimtą profilį ir gauti užklausas.
              </p>
            </div>
          </div>
        </div>
      )}

      {emailVerified && !isActive && !pendingClaim && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200/60 bg-red-50 px-4 py-3 dark:border-red-800/40 dark:bg-red-500/10">
          <ShieldCheck className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-body-sm text-red-800 dark:text-red-300">
            Jūsų paskyra sustabdyta administratoriaus. Susisiekite su mumis, jei manote, kad tai klaida.
          </p>
        </div>
      )}
    </>
  );
}
