import type { ReactNode } from "react";
import {
  BadgeCheck,
  Clock,
  Euro,
  Package,
  Search,
  ShieldCheck,
  Star,
  Zap,
} from "lucide-react";

export function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${
            star <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-surface-200 dark:text-surface-700"
          }`}
        />
      ))}
    </div>
  );
}

export function TrustStat({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-50 p-3.5 dark:bg-surface-800/50">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-surface-900">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-body font-bold text-surface-900 dark:text-white leading-tight">{value}</p>
        <p className="text-micro text-surface-500 dark:text-surface-400">{label}</p>
      </div>
    </div>
  );
}

export function QuickFact({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface-100 px-3 py-1.5 text-body-sm text-surface-700 dark:bg-surface-800 dark:text-surface-300">
      {icon}
      {children}
    </span>
  );
}

export function MetaPill({
  icon,
  children,
  tone = "neutral",
}: {
  icon: ReactNode;
  children: ReactNode;
  tone?: "neutral" | "success";
}) {
  const toneClasses =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
      : "bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-300";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-body-sm ${toneClasses}`}
    >
      {icon}
      {children}
    </span>
  );
}

export function ProfileSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 sm:p-8 dark:bg-surface-900/50">
      <h2 className="mb-4 flex items-center gap-2 text-heading-3 font-semibold text-surface-900 dark:text-white">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

export function SectionSkeleton({ title }: { title: string }) {
  return (
    <div className="rounded-3xl bg-white p-6 sm:p-8 dark:bg-surface-900/50">
      <h2 className="mb-4 text-heading-3 font-semibold text-surface-900 dark:text-white">{title}</h2>
      <div className="space-y-3">
        <div className="h-4 w-2/3 animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
        <div className="h-4 w-full animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
      </div>
    </div>
  );
}

export function PricingBlock({
  priceFrom,
  availableForUrgent,
}: {
  priceFrom: number | null;
  availableForUrgent: boolean;
}) {
  const base = priceFrom && priceFrom > 0 ? priceFrom : 30;

  const tiers = [
    {
      title: "Diagnostika",
      description: "Apžiūra vietoje, problemos identifikavimas ir rekomendacijos",
      price: `Nuo ${base} €`,
      icon: <Search className="h-5 w-5 text-blue-500" />,
    },
    {
      title: "Skubus remontas",
      description: "Greitas atvykimas ir neatidėliotini darbai tą pačią dieną",
      price: availableForUrgent ? `Nuo ${Math.round(base * 2.5)} €` : "Derinama",
      icon: <Zap className="h-5 w-5 text-amber-500" />,
      highlight: availableForUrgent,
    },
    {
      title: "Pilnas paketas",
      description: "Kompleksiniai darbai su medžiagomis, garantija ir ataskaita",
      price: `Nuo ${Math.round(base * 5)} €`,
      icon: <Package className="h-5 w-5 text-emerald-500" />,
    },
  ];

  return (
    <div className="rounded-3xl bg-white p-6 sm:p-8 dark:bg-surface-900/50">
      <h2 className="mb-6 flex items-center gap-2 text-heading-3 font-semibold text-surface-900 dark:text-white">
        <Euro className="h-4 w-4 text-surface-400" />
        Kainoraštis
      </h2>
      <div className="grid gap-5 sm:grid-cols-3">
        {tiers.map((tier) => (
          <div
            key={tier.title}
            className={`relative rounded-2xl p-5 transition-shadow duration-200 hover:shadow-card ${
              tier.highlight
                ? "bg-amber-50/80 dark:bg-amber-500/5 ring-1 ring-amber-200/60 dark:ring-amber-800/30 shadow-md"
                : "bg-surface-50 dark:bg-surface-800/50 shadow-sm"
            }`}
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white dark:bg-surface-900 shadow-sm">
              {tier.icon}
            </div>
            <h3 className="text-body font-bold text-surface-900 dark:text-white">
              {tier.title}
            </h3>
            <p className="mt-1.5 text-micro text-surface-500 dark:text-surface-400 leading-relaxed">
              {tier.description}
            </p>
            <p className="mt-4 text-body font-bold text-surface-900 dark:text-white">
              {tier.price}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-micro text-surface-400 dark:text-surface-500">
        Orientacinės kainos. Tiksli kaina priklauso nuo darbų apimties.
      </p>
    </div>
  );
}

export function TrustSignals({
  experienceYears,
  offersInvoices,
  availableForUrgent,
  avgResponseTimeHours,
}: {
  experienceYears: number | null;
  offersInvoices: boolean;
  availableForUrgent: boolean;
  avgResponseTimeHours: number | null;
}) {
  const signals: Array<{ icon: ReactNode; label: string; sublabel: string }> = [];

  if (experienceYears && experienceYears >= 2) {
    signals.push({
      icon: <ShieldCheck className="h-5 w-5 text-emerald-500" />,
      label: `Garantija ${Math.min(experienceYears, 5)} ${experienceYears >= 5 ? "metų" : "metai"}`,
      sublabel: "Ilgametė patirtis — kokybė garantuota",
    });
  } else {
    signals.push({
      icon: <ShieldCheck className="h-5 w-5 text-emerald-500" />,
      label: "Darbų garantija",
      sublabel: "Kokybė ir atsakingumas",
    });
  }

  if (availableForUrgent && avgResponseTimeHours !== null && avgResponseTimeHours <= 24) {
    signals.push({
      icon: <Clock className="h-5 w-5 text-blue-500" />,
      label: avgResponseTimeHours < 2 ? "Atvykimas per 1 val." : `Atsako per ${avgResponseTimeHours} val.`,
      sublabel: "Greitas reagavimas ir skubūs darbai",
    });
  } else {
    signals.push({
      icon: <Clock className="h-5 w-5 text-blue-500" />,
      label: "Greitas atsakymas",
      sublabel: "Operatyvus bendravimas su klientais",
    });
  }

  if (offersInvoices) {
    signals.push({
      icon: <BadgeCheck className="h-5 w-5 text-violet-500" />,
      label: "Sąskaitos faktūros",
      sublabel: "Oficialūs dokumentai kiekvienam užsakymui",
    });
  } else {
    signals.push({
      icon: <BadgeCheck className="h-5 w-5 text-violet-500" />,
      label: "Patikrintas profilis",
      sublabel: "El. paštas patvirtintas platformoje",
    });
  }

  return (
    <div className="rounded-3xl bg-gradient-to-br from-emerald-50/80 via-white to-blue-50/60 p-6 ring-1 ring-emerald-100/60 dark:from-emerald-950/30 dark:via-surface-900/50 dark:to-blue-950/20 dark:ring-emerald-900/30">
      <h3 className="text-body font-bold text-surface-900 dark:text-white mb-5">
        Kodėl verta pasirinkti
      </h3>
      <div className="space-y-4">
        {signals.map((signal) => (
          <div key={signal.label} className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-surface-800">
              {signal.icon}
            </div>
            <div className="min-w-0">
              <p className="text-body-sm font-semibold text-surface-900 dark:text-white leading-tight">
                {signal.label}
              </p>
              <p className="text-micro text-surface-500 dark:text-surface-400">
                {signal.sublabel}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
