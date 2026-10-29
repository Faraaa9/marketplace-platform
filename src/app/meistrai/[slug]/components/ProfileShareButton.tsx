"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

interface ProfileShareButtonProps {
  providerName: string;
  profileUrl: string;
}

export default function ProfileShareButton({
  providerName,
  profileUrl,
}: ProfileShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    // No `text`: some share targets (macOS "Copy", Messages) glue text onto the
    // url with no space, turning /meistrai/gerasoras into a 404ing
    // /meistrai/gerasorasSimonas.
    const shareData = {
      title: providerName,
      url: profileUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(profileUrl);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // User cancelled native share or clipboard is blocked. Keep the UI quiet.
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={copied ? "Nuoroda nukopijuota" : "Dalintis profiliu"}
      title={copied ? "Nukopijuota" : "Dalintis"}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-200 bg-white text-surface-500 shadow-sm transition-all hover:-translate-y-0.5 hover:border-surface-300 hover:text-surface-900 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-400 dark:hover:border-surface-600 dark:hover:text-white dark:focus-visible:ring-offset-surface-900"
    >
      {copied ? <Check className="h-4.5 w-4.5" /> : <Share2 className="h-4.5 w-4.5" />}
    </button>
  );
}
