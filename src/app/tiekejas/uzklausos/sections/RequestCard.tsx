import Link from "next/link";
import {
  MapPin,
  Clock,
  Star,
  ChevronRight,
  Users,
  Zap,
  CheckCircle2,
  Wallet,
  Lock,
  LockOpen,
} from "lucide-react";
import { BUDGET_OPTIONS } from "@/lib/constants";
import { formatRelativeDate, truncate } from "@/lib/utils";

export interface ProviderLead {
  id: string;
  title: string;
  description: string;
  categoryRef: { id: string; name: string } | null;
  categoryNames: string[];
  location: string;
  budget: string | null;
  createdAt: Date;
  relevance: number;
  hasResponded: boolean;
  isUnlocked: boolean;
  _count: { responses: number };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function budgetLabel(value: string) {
  return BUDGET_OPTIONS.find((b) => b.value === value)?.label || value;
}

export function RequestCard({ req }: { req: ProviderLead }) {
  const isNewRequest = Date.now() - new Date(req.createdAt).getTime() < DAY_MS;
  const responses = req._count.responses;
  const categoryNames =
    req.categoryNames.length > 0
      ? req.categoryNames
      : req.categoryRef?.name
        ? [req.categoryRef.name]
        : [];

  return (
    <Link href={`/tiekejas/uzklausos/${req.id}`} className="group block">
      <article
        className={`relative rounded-2xl border bg-white p-5 transition-shadow duration-200 hover:shadow-card dark:bg-surface-900 ${
          req.hasResponded
            ? "border-surface-200/40 dark:border-surface-700/30"
            : isNewRequest
              ? "border-brand-200 dark:border-brand-800/60"
              : "border-surface-200/60 dark:border-surface-700/50"
        } ${req.hasResponded ? "opacity-75 hover:opacity-100" : ""}`}
      >
        {/* Top: category + status badges (left), budget (right) */}
        <div className="mb-2 flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {categoryNames.map((name) => (
              <span
                key={name}
                className="rounded-lg bg-brand-50 px-2.5 py-1 text-micro font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-400"
              >
                {name}
              </span>
            ))}
            {!req.isUnlocked ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2 py-1 text-micro font-semibold text-white dark:bg-brand-500">
                <Lock className="h-3 w-3" />
                Užrakinta
              </span>
            ) : !req.hasResponded ? (
              <span
                role="img"
                aria-label="Atrakinta"
                title="Atrakinta"
                className="inline-flex items-center"
              >
                <LockOpen className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              </span>
            ) : null}
            {isNewRequest && !req.hasResponded && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-micro font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                <Zap className="h-3 w-3" />
                Nauja
              </span>
            )}
            {req.relevance >= 2 && !req.hasResponded && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-micro font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                <Star className="h-3 w-3" />
                Jums tinka
              </span>
            )}
            {req.hasResponded && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-surface-100 px-2 py-1 text-micro font-medium text-surface-500 dark:bg-surface-800 dark:text-surface-400">
                <CheckCircle2 className="h-3 w-3" />
                Atsakyta
              </span>
            )}
          </div>
          {req.budget && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-surface-50 px-2 py-1 text-micro font-bold text-surface-700 ring-1 ring-inset ring-surface-200/80 dark:bg-surface-800 dark:text-surface-200 dark:ring-surface-700">
              <Wallet className="h-3 w-3 text-surface-400" />
              {budgetLabel(req.budget)}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-body font-semibold leading-snug text-surface-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
          {req.title}
        </h3>

        {/* Description */}
        <p className="mt-1 line-clamp-2 text-body-sm leading-relaxed text-surface-500 dark:text-surface-400">
          {truncate(req.description, 160)}
        </p>

        {/* Footer: meta left, CTA right */}
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-surface-100 pt-3 dark:border-surface-800">
          <div className="flex items-center gap-3 text-micro text-surface-400 dark:text-surface-500">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {req.location}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatRelativeDate(req.createdAt)}
            </span>
            <span
              className={`inline-flex items-center gap-1 font-medium ${
                responses === 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : responses <= 2
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-surface-400 dark:text-surface-500"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              {responses}
            </span>
          </div>

          <span className="inline-flex shrink-0 items-center gap-1 text-micro font-medium text-brand-600 transition-all group-hover:gap-1.5 dark:text-brand-400">
            {req.hasResponded ? (
              "Peržiūrėti"
            ) : req.isUnlocked ? (
              "Atsakyti"
            ) : (
              <>
                <Lock className="h-3 w-3" />
                Atrakinti
              </>
            )}
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </article>
    </Link>
  );
}
