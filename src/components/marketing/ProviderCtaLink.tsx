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
  const role = session?.user?.role;
  const isProvider = role === "PROVIDER";
  const isAdmin = role === "ADMIN";

  if (isAdmin) {
    return (
      <Link href="/admin" className={className}>
        Admin panelė
      </Link>
    );
  }

  if (isProvider) {
    return (
      <Link href="/tiekejas" className={className}>
        {providerLabel || children}
      </Link>
    );
  }

  // Logged-in non-providers go to /tapti-tiekeju. Anonymous users go to
  // /registruotis?intent=provider so that after email verification we can
  // route them straight to /tapti-tiekeju instead of the default home.
  return (
    <Link
      href={session ? "/tapti-tiekeju" : "/registruotis?intent=provider"}
      className={className}
    >
      {children}
    </Link>
  );
}
