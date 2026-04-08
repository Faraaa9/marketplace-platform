"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import type { ReactNode } from "react";

type ProviderCtaLinkProps = {
  className: string;
  children: ReactNode;
  providerLabel?: ReactNode;
};

export default function ProviderCtaLink({
  className,
  children,
  providerLabel,
}: ProviderCtaLinkProps) {
  const { data: session } = useSession();
  const isProvider = session?.user?.role === "PROVIDER";

  if (isProvider) {
    return (
      <Link href="/tiekejas" className={className}>
        {providerLabel || children}
      </Link>
    );
  }

  // Both logged-in non-providers and anonymous users go to /tiekejams
  // where they can either register or use the "become provider" flow
  return (
    <Link href={session ? "/tapti-tiekeju" : "/registruotis"} className={className}>
      {children}
    </Link>
  );
}
