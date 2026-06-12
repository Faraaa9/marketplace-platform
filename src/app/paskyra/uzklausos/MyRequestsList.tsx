import Link from "next/link";
import {
  FileText,
  MapPin,
  Clock,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatRelativeDate } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";

function pasiulymaiLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} pasiūlymas`;
  if (mod10 >= 2 && mod10 <= 9 && (mod100 < 11 || mod100 > 19)) {
    return `${count} pasiūlymai`;
  }
  return `${count} pasiūlymų`;
}

function naujiLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} naujas`;
  return `${count} nauji`;
}

type StatusFilter =
  | "ALL"
  | "OPEN"
  | "PENDING_CONFIRMATION"
  | "IN_PROGRESS"
  | "CLOSED";

const STATUS_MAP: Record<
  string,
  { label: string; variant: "success" | "warning" | "default" }
> = {
  PENDING_CONFIRMATION: { label: "Laukia patvirtinimo", variant: "warning" },
  OPEN: { label: "Atidaryta", variant: "success" },
  IN_PROGRESS: { label: "Vykdoma", variant: "warning" },
  CLOSED: { label: "Uždaryta", variant: "default" },
};

const FILTER_TABS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Visos" },
  { value: "OPEN", label: "Aktyvios" },
  { value: "PENDING_CONFIRMATION", label: "Laukia" },
  { value: "IN_PROGRESS", label: "Vykdomos" },
  { value: "CLOSED", label: "Uždarytos" },
];

const VALID_STATUSES = new Set<string>(FILTER_TABS.map((t) => t.value));

// Default to "OPEN" (Aktyvios) with no query param — matches the prior client
// default so the landing tab does not change.
function resolveStatus(raw?: string): StatusFilter {
  return raw && VALID_STATUSES.has(raw) ? (raw as StatusFilter) : "OPEN";
}

interface MyRequestsListProps {
  userId: string;
  searchParams: Promise<{ status?: string }>;
}

export default async function MyRequestsList({
  userId,
  searchParams,
}: MyRequestsListProps) {
  const sp = await searchParams;
  const active = resolveStatus(sp.status);

  const requests = await prisma.serviceRequest.findMany({
    where: { clientId: userId },
    select: {
      id: true,
      trackingToken: true,
      title: true,
      categoryRef: { select: { name: true } },
      location: true,
      status: true,
      createdAt: true,
      _count: { select: { responses: true } },
      responses: {
        select: { lastMessageAt: true, clientLastReadAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Unread = a proposal thread moved since the client's last visit to the
  // request page (read receipts are stamped there). Rows sort by the latest
  // activity anywhere in the request, so "something new" floats to the top.
  const data = requests
    .map(({ responses, ...rest }) => {
      const unreadCount = responses.filter(
        (r) => !r.clientLastReadAt || r.lastMessageAt > r.clientLastReadAt,
      ).length;
      const lastActivityAt = responses.reduce(
        (max, r) => (r.lastMessageAt > max ? r.lastMessageAt : max),
        rest.createdAt,
      );
      return { ...rest, unreadCount, lastActivityAt };
    })
    .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());

  if (data.length === 0) {
    return (
      <EmptyState
        title="Neturite užklausų"
        description="Pateikite pirmą užklausą ir gaukite pasiūlymus iš paslaugų tiekėjų."
        icon={<FileText className="h-12 w-12" />}
        action={
          <Link href="/uzklausos/nauja">
            <Button>Pateikti užklausą</Button>
          </Link>
        }
      />
    );
  }

  const filtered =
    active === "ALL" ? data : data.filter((r) => r.status === active);

  return (
    <>
      {/* Filter tabs — URL-driven, so each is a server-navigable Link */}
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-surface-100 p-1 dark:bg-surface-800">
        {FILTER_TABS.map((tab) => {
          const count =
            tab.value === "ALL"
              ? data.length
              : data.filter((r) => r.status === tab.value).length;
          const isActive = active === tab.value;
          return (
            <Link
              key={tab.value}
              href={`?status=${tab.value}`}
              scroll={false}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-[44px] items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-body-sm font-medium transition-all ${
                isActive
                  ? "bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-white"
                  : "text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
              }`}
            >
              {tab.label}
              <span
                className={`text-micro ${
                  isActive
                    ? "text-brand-600 dark:text-brand-400"
                    : "text-surface-400"
                }`}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-300 bg-white p-10 text-center dark:border-surface-700 dark:bg-surface-900">
          <p className="text-body-sm text-surface-500">
            Šioje kategorijoje užklausų nėra
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const status = STATUS_MAP[req.status] || STATUS_MAP.OPEN;
            const categoryName = req.categoryRef?.name;
            const hasUnread = req.unreadCount > 0;

            return (
              <Link
                key={req.id}
                href={`/uzklausos/sekti/${req.trackingToken}`}
                className="group block"
              >
                <article
                  className={`relative rounded-2xl border bg-white p-5 transition-shadow duration-200 hover:shadow-card dark:bg-surface-900 ${
                    hasUnread
                      ? "border-brand-200 dark:border-brand-800/60"
                      : "border-surface-200/60 dark:border-surface-700/50"
                  }`}
                >
                  {/* Top: title + status */}
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <h3 className="text-body font-semibold leading-snug text-surface-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
                      {req.title}
                    </h3>
                    {req.status === "OPEN" ? (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-caption font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse"
                        />
                        Gyvai
                      </span>
                    ) : (
                      <Badge variant={status.variant}>{status.label}</Badge>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-3 text-micro text-surface-400 dark:text-surface-500">
                    {categoryName && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-0.5 font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-400">
                        {categoryName}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {req.location}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatRelativeDate(req.createdAt)}
                    </span>
                  </div>

                  {/* Footer: responses + next action */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1 text-micro font-medium ${
                          req._count.responses > 0
                            ? "text-surface-600 dark:text-surface-300"
                            : "text-surface-400"
                        }`}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        {pasiulymaiLabel(req._count.responses)}
                      </span>
                      {hasUnread && (
                        <span className="inline-flex items-center rounded-full bg-brand-600 px-2 py-0.5 text-micro font-bold text-white">
                          {naujiLabel(req.unreadCount)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <NextActionHint
                        status={req.status}
                        responseCount={req._count.responses}
                      />
                      <ChevronRight className="h-4 w-4 text-surface-300 transition-colors group-hover:text-brand-500 dark:text-surface-600" />
                    </div>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

function NextActionHint({
  status,
  responseCount,
}: {
  status: string;
  responseCount: number;
}) {
  if (status === "PENDING_CONFIRMATION") {
    return (
      <span className="text-micro font-medium text-amber-600 dark:text-amber-400">
        Patvirtinkite el. paštą
      </span>
    );
  }
  if (status === "OPEN" && responseCount === 0) {
    return <span className="text-micro text-surface-400">Laukiama pasiūlymų...</span>;
  }
  if (status === "OPEN" && responseCount > 0) {
    return (
      <span className="text-micro font-medium text-brand-600 dark:text-brand-400">
        Peržiūrėkite pasiūlymus
      </span>
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <span className="text-micro font-medium text-brand-600 dark:text-brand-400">
        Susisiekite su tiekėju
      </span>
    );
  }
  return null;
}
