import Link from "next/link";
import { FileText } from "lucide-react";
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
    // Closed requests sink to the bottom; everything else floats by activity.
    .sort(
      (a, b) =>
        Number(a.status === "CLOSED") - Number(b.status === "CLOSED") ||
        b.lastActivityAt.getTime() - a.lastActivityAt.getTime(),
    );

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
        <div className="overflow-hidden rounded-2xl border border-surface-200/60 bg-white shadow-card dark:border-surface-700/50 dark:bg-surface-900">
          {filtered.map((req) => {
            const status = STATUS_MAP[req.status] || STATUS_MAP.OPEN;
            const isClosed = req.status === "CLOSED";

            return (
              <Link
                key={req.id}
                href={`/uzklausos/sekti/${req.trackingToken}`}
                className="relative block border-b border-surface-200/60 px-5 py-4 transition-colors last:border-b-0 hover:bg-surface-50 dark:border-surface-700/50 dark:hover:bg-surface-800/50"
              >
                {req.unreadCount > 0 && (
                  <span className="absolute right-5 top-4 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
                    {req.unreadCount}
                  </span>
                )}
                <h3
                  className={`pr-8 text-body-sm font-semibold leading-snug ${
                    isClosed
                      ? "text-surface-400 dark:text-surface-500"
                      : "text-surface-900 dark:text-white"
                  }`}
                >
                  {req.title}
                </h3>
                <div
                  className={`mt-1.5 flex flex-wrap items-center gap-2.5 text-[13px] ${
                    isClosed
                      ? "text-surface-400 dark:text-surface-500"
                      : "text-surface-500 dark:text-surface-400"
                  }`}
                >
                  {req.status === "OPEN" ? (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse"
                      />
                      Gyvai
                    </span>
                  ) : (
                    <Badge variant={status.variant}>{status.label}</Badge>
                  )}
                  <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-surface-300 dark:bg-surface-600" />
                  <span>{pasiulymaiLabel(req._count.responses)}</span>
                  <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-surface-300 dark:bg-surface-600" />
                  <span>{formatRelativeDate(req.lastActivityAt)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
