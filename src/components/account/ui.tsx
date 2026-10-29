// Shared building blocks for the customer (/paskyra) and provider (/tiekejas)
// account areas. Server-safe (no hooks) so pages stay Server Components; the
// visual language follows the approved account prototype: cream ground, white
// cards, clay accent from the --brand-* variables, Lora headings.
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn, initialsOf } from "@/lib/utils";

export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-serif text-[26px] font-semibold leading-tight text-surface-900 dark:text-white sm:text-[28px]">
          {title}
        </h1>
        {sub && <p className="mt-1.5 text-body-sm text-surface-500 dark:text-surface-400">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ className, children, id }: { className?: string; children: ReactNode; id?: string }) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-xl border border-surface-100 bg-white p-4 dark:border-surface-800 dark:bg-surface-900 sm:p-[18px]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[15px] font-semibold text-surface-900 dark:text-white">{children}</h2>
      {aside}
    </div>
  );
}

export type ChipTone = "open" | "progress" | "wait" | "closed" | "warn";

const CHIP_TONES: Record<ChipTone, string> = {
  open: "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300",
  progress: "bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-300",
  wait: "bg-brand-50 text-brand-800 dark:bg-brand-500/10 dark:text-brand-300",
  closed: "bg-surface-50 text-surface-600 dark:bg-surface-800 dark:text-surface-300",
  warn: "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
};

export function Chip({ tone, children, className }: { tone: ChipTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-micro font-semibold",
        CHIP_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const REQUEST_STEP_LABELS = ["Pateikta", "Pasiūlymai", "Meistras pasirinktas", "Atlikta", "Įvertinta"] as const;

/** 5-step progress bar. `current` is the index of the step in progress;
 *  everything before it is done. current = 5 means all done. */
export function StepBar({ current, className }: { current: number; className?: string }) {
  return (
    <ol className={cn("flex w-full gap-1.5", className)} aria-label="Užklausos eiga">
      {REQUEST_STEP_LABELS.map((label, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li
            key={label}
            aria-current={now ? "step" : undefined}
            className={cn(
              "flex min-w-0 flex-1 flex-col gap-1.5 text-[11px] leading-tight sm:text-[11.5px]",
              now ? "font-semibold text-surface-900 dark:text-white" : "text-surface-500 dark:text-surface-400",
            )}
          >
            <i
              className={cn(
                "block h-1 rounded-full",
                done ? "bg-emerald-600" : now ? "bg-brand-600" : "bg-surface-100 dark:bg-surface-700",
              )}
            />
            <span className="hidden hyphens-auto break-words min-[420px]:block" lang="lt">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

const BUTTON_BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 text-body-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 sm:min-h-9";
export const BUTTON_PRIMARY = cn(BUTTON_BASE, "bg-brand-600 font-semibold text-white hover:bg-brand-700 disabled:opacity-60");
export const BUTTON_GHOST = cn(
  BUTTON_BASE,
  "border border-surface-200 bg-white font-medium text-surface-900 hover:border-brand-600 hover:text-brand-700 disabled:opacity-60 dark:border-surface-700 dark:bg-surface-900 dark:text-white",
);

export function ButtonLink({
  href,
  children,
  variant = "ghost",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
}) {
  return (
    <Link href={href} className={cn(variant === "primary" ? BUTTON_PRIMARY : BUTTON_GHOST, className)}>
      {children}
    </Link>
  );
}

export type AttentionTone = "new" | "msg" | "rate" | "won" | "profile";

const DOT_TONES: Record<AttentionTone, string> = {
  new: "bg-brand-600",
  msg: "bg-sky-700",
  rate: "bg-amber-600",
  won: "bg-emerald-600",
  profile: "bg-amber-600",
};

export interface AttentionItem {
  key: string;
  tone: AttentionTone;
  title: string;
  detail?: string;
  href: string;
  action: string;
  primary?: boolean;
}

export function AttentionList({ items, empty }: { items: AttentionItem[]; empty: string }) {
  if (items.length === 0) {
    return <p className="py-2 text-body-sm text-surface-500 dark:text-surface-400">{empty}</p>;
  }
  return (
    <ul className="divide-y divide-surface-50 dark:divide-surface-800">
      {items.map((item) => (
        <li key={item.key} className="flex flex-wrap items-center gap-x-3.5 gap-y-2 py-3.5 sm:flex-nowrap">
          <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", DOT_TONES[item.tone])} aria-hidden />
          <div className="min-w-0 flex-1 basis-[calc(100%-2rem)] sm:basis-auto">
            <p className="font-semibold text-surface-900 dark:text-white">{item.title}</p>
            {item.detail && (
              <p className="mt-0.5 line-clamp-2 text-caption font-normal text-surface-500 dark:text-surface-400">
                {item.detail}
              </p>
            )}
          </div>
          <ButtonLink href={item.href} variant={item.primary ? "primary" : "ghost"} className="ml-6 sm:ml-0">
            {item.action}
          </ButtonLink>
        </li>
      ))}
    </ul>
  );
}

export function KpiTile({ value, label, href }: { value: ReactNode; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-1.5 rounded-xl border border-surface-100 bg-white p-4 transition-colors hover:border-surface-300 dark:border-surface-800 dark:bg-surface-900"
    >
      <span className="text-[28px] font-bold leading-none text-surface-900 dark:text-white">{value}</span>
      <span className="text-caption font-normal text-surface-500 dark:text-surface-400">{label}</span>
    </Link>
  );
}

export function Tabs({ items }: { items: { href: string; label: string; active: boolean }[] }) {
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-surface-100 px-1 dark:border-surface-800" role="tablist">
      {items.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          role="tab"
          aria-selected={tab.active}
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center border-b-2 px-3.5 text-body-sm",
            tab.active
              ? "border-brand-600 font-semibold text-surface-900 dark:text-white"
              : "border-transparent font-medium text-surface-500 hover:text-surface-900 dark:text-surface-400",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

// The one avatar circle for the whole site (founder-approved mockup,
// 2026-10-29): a thin even ring only when it sits on a photo, and the presence
// dot centred exactly on the circumference at 45°, so its cut-out never bulges
// into the circle.
export function Avatar({
  name,
  image,
  size = 40,
  presence,
  ring = false,
}: {
  name: string;
  image?: string | null;
  size?: number;
  presence?: "online" | "recent" | null;
  ring?: boolean;
}) {
  const circle = cn(
    "block shrink-0 rounded-full",
    ring && "shadow-[0_0_0_2px_#fff] dark:shadow-[0_0_0_2px_#25221e]",
  );
  const dot = Math.max(5, Math.round(size * 0.12));
  const dotBox = dot + 4;
  const dotOffset = Math.round(size * 0.8536 - dotBox / 2);
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      {image ? (
        <Image
          src={image}
          alt=""
          width={size}
          height={size}
          className={cn(circle, "object-cover")}
          style={{ width: size, height: size }}
        />
      ) : (
        <span
          className={cn(circle, "grid place-items-center bg-brand-100 font-semibold text-brand-900 dark:bg-brand-900/50 dark:text-brand-100")}
          style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
          aria-hidden
        >
          {initialsOf(name)}
        </span>
      )}
      {presence && (
        <span
          className={cn(
            "pointer-events-none absolute rounded-full border-2 border-white dark:border-[#25221e]",
            presence === "online" ? "bg-emerald-600" : "bg-surface-400",
          )}
          style={{ width: dotBox, height: dotBox, left: dotOffset, top: dotOffset }}
          role="img"
          aria-label={presence === "online" ? "Prisijungęs dabar" : "Aktyvus neseniai"}
          title={presence === "online" ? "Prisijungęs dabar" : "Aktyvus neseniai"}
        />
      )}
    </span>
  );
}

export function EmptyPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-surface-200 bg-white/60 px-4 py-8 text-center text-body-sm text-surface-500 dark:border-surface-700 dark:bg-surface-900/50">
      {children}
    </div>
  );
}

export function Notice({ tone, title, children }: { tone: "ok" | "warn" | "error" | "info"; title?: ReactNode; children?: ReactNode }) {
  const tones = {
    ok: "bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200",
    warn: "bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200",
    error: "bg-red-50 text-red-900 dark:bg-red-500/10 dark:text-red-200",
    info: "bg-brand-50 text-brand-900 dark:bg-brand-500/10 dark:text-brand-200",
  } as const;
  return (
    <div className={cn("rounded-xl px-4 py-3.5 text-body-sm", tones[tone])}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn(title && "mt-0.5 opacity-90")}>{children}</div>}
    </div>
  );
}
