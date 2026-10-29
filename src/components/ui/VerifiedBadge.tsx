import { BadgeCheck, Crown, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

export type VerifiedBadgeTier = "verified" | "young-talent" | "premium" | "goat";

interface VerifiedBadgeProps {
  tier: VerifiedBadgeTier;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Render with the label visible to the right of the icon (used in admin UI). */
  withLabel?: boolean;
  /** Position of the hover tooltip relative to the badge. Defaults to "top". */
  tooltipPlacement?: "top" | "bottom";
}

interface TierConfig {
  label: string;
  description: string;
  color: string;
  pillBg: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
}

const SIZE_PX: Record<NonNullable<VerifiedBadgeProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

/**
 * Stylised side-profile goat head. Custom SVG because lucide doesn't ship a
 * goat icon. Uses currentColor so it inherits the tier color like other icons.
 */
function GoatIcon({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number | string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {/* Head — rounded rectangle face */}
      <path d="M7.5 9c0-2.8 2-4.5 4.5-4.5S16.5 6.2 16.5 9v4.5c0 1.4-.9 2.6-2.2 2.95L13.5 18.5h-3l-.8-2.05C8.4 16.1 7.5 14.9 7.5 13.5V9z" />
      {/* Left horn curving back */}
      <path d="M9 4.5c-.5-1.5-2-2.3-3.2-1.7" />
      {/* Right horn curving back */}
      <path d="M15 4.5c.5-1.5 2-2.3 3.2-1.7" />
      {/* Eye */}
      <circle cx="10.5" cy="10" r="0.6" fill="currentColor" stroke="none" />
      {/* Beard tuft below chin */}
      <path d="M12 18.5v2.5" />
    </svg>
  );
}

const TIERS: Record<VerifiedBadgeTier, TierConfig> = {
  verified: {
    label: "Patvirtintas",
    description: "Patvirtintas el. paštas ir telefonas",
    color: "text-blue-500 dark:text-blue-400",
    pillBg: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
    Icon: BadgeCheck,
  },
  "young-talent": {
    label: "Jaunasis talentas",
    description: "Perspektyvus naujas meistras",
    color: "text-emerald-500 dark:text-emerald-400",
    pillBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    Icon: Sprout,
  },
  premium: {
    label: "Aukso meistras",
    description: "Ilgametis, patikimas meistras",
    color: "text-amber-500 dark:text-amber-400",
    pillBg: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    Icon: Crown,
  },
  goat: {
    label: "GOAT",
    description: "The goat",
    color: "text-violet-500 dark:text-violet-400",
    pillBg: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
    Icon: GoatIcon,
  },
};

export default function VerifiedBadge({
  tier,
  size = "md",
  className,
  withLabel = false,
  tooltipPlacement = "top",
}: VerifiedBadgeProps) {
  const config = TIERS[tier];
  const { Icon, label, description, color, pillBg } = config;

  // `peer` on the icon scopes the hover trigger to THIS badge's icon only.
  // We previously tried `.group` (any ancestor) — that fired tooltips when a
  // parent row was hovered. Named groups (`group/badge`) had the same risk
  // depending on Tailwind version. `peer` is a sibling selector that cannot
  // propagate to other badges, so each tooltip only reacts to its own icon.
  const tooltipClass = cn(
    "pointer-events-none invisible absolute left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-surface-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg ring-1 ring-black/5 transition-[opacity,visibility] duration-150 peer-hover:visible peer-hover:opacity-100 dark:bg-surface-100 dark:text-surface-900",
    tooltipPlacement === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
  );

  if (withLabel) {
    return (
      <span
        className={cn(
          "relative inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-micro font-medium",
          pillBg,
          className,
        )}
      >
        <span className="peer inline-flex items-center gap-1.5">
          <Icon className={cn(SIZE_PX[size], color, "shrink-0")} strokeWidth={2.4} />
          {label}
        </span>
        <span role="tooltip" className={tooltipClass}>
          {description}
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      aria-label={label}
    >
      <Icon className={cn("peer", SIZE_PX[size], color)} strokeWidth={2.4} />
      <span role="tooltip" className={tooltipClass}>
        {description}
      </span>
    </span>
  );
}
