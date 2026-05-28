"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AccountValueBox from "./components/AccountValueBox";
import { BookmarkReminder } from "./components/TrackingHelpers";

interface ViewerBannerProps {
  /** Owner of the request, if any. Null for an unclaimed (guest) request. */
  clientId: string | null;
  trackingToken: string;
}

/**
 * Session-dependent UI for the public tracker: the claim CTA (logged-in,
 * unclaimed request), the "create account" box (guest), or the bookmark
 * reminder. Lives outside the data Suspense boundaries so the server sections
 * stream independently of the client-only session read.
 *
 * Renders nothing until the session resolves, so a logged-in owner never sees
 * the "create account" CTA flash before NextAuth hydrates.
 */
export default function ViewerBanner({ clientId, trackingToken }: ViewerBannerProps) {
  const { status } = useSession();
  const router = useRouter();

  if (status === "loading") return null;

  return (
    <>
      <AccountValueBox
        clientId={clientId}
        trackingToken={trackingToken}
        onClaimed={() => router.refresh()}
      />
      <BookmarkReminder />
    </>
  );
}
