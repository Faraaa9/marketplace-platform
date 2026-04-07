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

  return (
    <Link href={isProvider ? "/tiekejas" : "/registruotis"} className={className}>
      {isProvider ? providerLabel || children : children}
    </Link>
  );
}
