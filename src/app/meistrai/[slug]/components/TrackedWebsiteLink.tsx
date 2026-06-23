"use client";

import { Globe, ArrowUpRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics-events";

interface TrackedWebsiteLinkProps {
  website: string;
}

/**
 * Understated outbound link to the provider's own site, surfaced as the last
 * "Greiti faktai" row. Fires a `cta_click` analytics event so the team can see
 * how many visitors click through — deliberately low-key, not a loud CTA.
 */
export default function TrackedWebsiteLink({ website }: TrackedWebsiteLinkProps) {
  const href = website.startsWith("http") ? website : `https://${website}`;
  let domain = website;
  try {
    domain = new URL(href).hostname.replace(/^www\./, "");
  } catch {
    /* fall back to the raw string */
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="nofollow noopener"
      onClick={() => trackEvent("cta_click", { cta: "website" })}
      className="group flex items-center gap-3 border-t border-surface-100 py-2.5 text-body-sm text-surface-700 first:border-t-0 dark:border-surface-800 dark:text-surface-300"
    >
      <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-surface-50 dark:bg-surface-800">
        <Globe className="h-[15px] w-[15px] text-surface-500" />
      </span>
      <span className="text-surface-500 transition-colors group-hover:text-brand-700 group-hover:underline dark:text-surface-400 dark:group-hover:text-brand-300">
        {domain}
      </span>
      <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-surface-400" />
    </a>
  );
}
