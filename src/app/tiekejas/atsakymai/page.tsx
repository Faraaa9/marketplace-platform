"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatRelativeDate } from "@/lib/utils";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  FileText,
  MapPin,
  Clock,
  Wallet,
  ChevronRight,
  CheckCircle2,
  MinusCircle,
  type LucideIcon,
} from "lucide-react";

type ResponseStatus = "laukia" | "priimti" | "nepasirinkti";

interface ResponseItem {
  responseId: string;
  requestId: string;
  title: string;
  categoryName: string | null;
  location: string;
  price: number | null;
  createdAt: string;
  status: ResponseStatus;
}

const STATUS_META: Record<
  ResponseStatus,
  { label: string; badge: string; icon: LucideIcon }
> = {
  laukia: {
    label: "Laukia atsakymo",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    icon: Clock,
  },
  priimti: {
    label: "Priimta",
    badge:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  nepasirinkti: {
    label: "Nepasirinkta",
    badge:
      "bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400",
    icon: MinusCircle,
  },
};

const TABS: { value: "" | ResponseStatus; label: string }[] = [
  { value: "", label: "Visi" },
  { value: "laukia", label: "Laukia" },
  { value: "priimti", label: "Priimti" },
  { value: "nepasirinkti", label: "Nepasirinkti" },
];

export default function ProviderResponsesPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ResponsesContent />
    </Suspense>
  );
}

function ResponsesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<ResponseItem[] | null>(null);

  const statusParam = searchParams.get("status") || "";
  const activeStatus: "" | ResponseStatus =
    statusParam === "laukia" ||
    statusParam === "priimti" ||
    statusParam === "nepasirinkti"
      ? statusParam
      : "";

  useEffect(() => {
    fetch("/api/tiekejas/atsakymai")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setItems(data.data.items);
        } else if (
          data.code === "EMAIL_NOT_VERIFIED" ||
          data.code === "ACCOUNT_NOT_ACTIVE" ||
          data.code === "NOT_PROVIDER"
        ) {
          router.push("/tiekejas");
        } else {
          setItems([]);
        }
      })
      .catch(() => setItems([]));
  }, [router]);

  const list = items ?? [];
  const counts: Record<"" | ResponseStatus, number> = {
    "": list.length,
    laukia: list.filter((i) => i.status === "laukia").length,
    priimti: list.filter((i) => i.status === "priimti").length,
    nepasirinkti: list.filter((i) => i.status === "nepasirinkti").length,
  };
  const filtered = activeStatus
    ? list.filter((i) => i.status === activeStatus)
    : list;

  function selectTab(value: string) {
    router.push(
      value ? `/tiekejas/atsakymai?status=${value}` : "/tiekejas/atsakymai",
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">
          Mano atsakymai
        </h1>
        <p className="mt-1 text-body text-surface-500 dark:text-surface-400">
          Užklausos, į kurias atsakėte, ir kiekvieno pasiūlymo būsena.
        </p>
      </div>

      {/* Status tabs */}
      <div className="mb-5 flex flex-wrap gap-1 rounded-xl bg-surface-100 p-1 dark:bg-surface-800">
        {TABS.map((tab) => {
          const isActive = activeStatus === tab.value;
          return (
            <button
              key={tab.value || "all"}
              onClick={() => selectTab(tab.value)}
              className={`rounded-lg px-3 py-1.5 text-body-sm font-medium transition-all ${
                isActive
                  ? "bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-white"
                  : "text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 tabular-nums text-surface-400">
                {counts[tab.value]}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {items === null ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <EmptyState
          title="Dar neatsakėte į jokią užklausą"
          body="Kai atsakysite į klientų užklausas, jos atsiras čia."
          showBrowse
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Šioje būsenoje atsakymų nėra"
          body="Pasirinkite kitą būseną viršuje."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const meta = STATUS_META[item.status];
            const StatusIcon = meta.icon;
            return (
              <Link
                key={item.responseId}
                href={`/tiekejas/uzklausos/${item.requestId}`}
                className="group block"
              >
                <article className="rounded-2xl border border-surface-200/60 bg-white p-5 transition-shadow hover:shadow-stripe dark:border-surface-700/50 dark:bg-surface-900">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {item.categoryName && (
                      <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-micro font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-400">
                        {item.categoryName}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-micro font-semibold ${meta.badge}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {meta.label}
                    </span>
                  </div>

                  <h2 className="text-body font-semibold text-surface-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
                    {item.title}
                  </h2>

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-surface-100 pt-3 dark:border-surface-800">
                    <div className="flex flex-wrap items-center gap-3 text-micro text-surface-400 dark:text-surface-500">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {item.location}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatRelativeDate(item.createdAt)}
                      </span>
                      {item.price != null && (
                        <span className="inline-flex items-center gap-1">
                          <Wallet className="h-3.5 w-3.5" />
                          {item.price} €
                        </span>
                      )}
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 text-micro font-medium text-brand-600 transition-all group-hover:gap-1.5 dark:text-brand-400">
                      Peržiūrėti
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  title,
  body,
  showBrowse = false,
}: {
  title: string;
  body: string;
  showBrowse?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-surface-300 bg-white p-10 text-center dark:border-surface-700 dark:bg-surface-900 sm:p-14">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-100 dark:bg-surface-800">
        <FileText className="h-6 w-6 text-surface-400" />
      </div>
      <h3 className="text-body font-semibold text-surface-900 dark:text-white">
        {title}
      </h3>
      <p className="mx-auto mt-1.5 max-w-sm text-body-sm text-surface-500 dark:text-surface-400">
        {body}
      </p>
      {showBrowse && (
        <Link
          href="/tiekejas/uzklausos"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-body-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Naršyti užklausas
        </Link>
      )}
    </div>
  );
}
