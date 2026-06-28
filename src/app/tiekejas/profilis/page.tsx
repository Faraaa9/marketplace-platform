import { connection } from "next/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireActiveProvider } from "@/lib/provider-guard";
import { getServiceCategoryGroups } from "@/lib/service-categories";
import { isStoryEnabled } from "@/lib/platform-settings";
import { getProviderProfileEditData } from "@/lib/provider-profile-edit";
import ProfileEditorClient from "./ProfileEditorClient";

// Server-fetched: the editor's initial data ships in the HTML instead of the
// old four-call useEffect waterfall after hydration. `/tiekejas/*` auth/role is
// gated by proxy.ts; the guard here also yields the credit balance in one shot.
export default async function ProviderProfilePage() {
  await connection();
  const guard = await requireActiveProvider();
  if (!guard.authorized) redirect("/prisijungti?callbackUrl=/tiekejas/profilis");

  const [profile, storyEnabled, categoryGroups] = await Promise.all([
    getProviderProfileEditData(guard.userId),
    isStoryEnabled(),
    getServiceCategoryGroups(),
  ]);

  const stories = storyEnabled
    ? await prisma.providerStory.findMany({
        where: { providerId: guard.userId, expiresAt: { gt: new Date() } },
        select: { id: true },
      })
    : [];

  return (
    <ProfileEditorClient
      initialData={{
        profile,
        stories,
        storyEnabled,
        categoryGroups,
        creditBalance: guard.creditBalance,
      }}
    />
  );
}
