import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MessageCircle, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatLastSeen, getPresenceLevel } from "@/lib/presence";
import { getProviderAvatarImage } from "@/lib/provider-image";
import { decodeHtmlEntities, formatRelativeDate } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";

type Filter = "all" | "unread";

interface SentInquiriesViewProps {
  userId: string;
  searchParams: Promise<{ tab?: string }>;
}

/**
 * User's sent direct-inquiry threads. Server component: fetches inline so the
 * gate streams real content under one Suspense boundary instead of bouncing
 * through a client `fetch`. Unread state is derived from matching unread
 * NEW_MESSAGE notifications, since the sender side carries no own lastReadAt.
 */
export default async function SentInquiriesView({
  userId,
  searchParams,
}: SentInquiriesViewProps) {
  const sp = await searchParams;
  const filter: Filter = sp.tab === "unread" ? "unread" : "all";

  const [inquiries, unreadNotifications] = await Promise.all([
    prisma.directInquiry.findMany({
      where: { senderUserId: userId, moderationStatus: "APPROVED" },
      select: {
        id: true,
        trackingToken: true,
        description: true,
        lastMessageAt: true,
        provider: {
          select: {
            name: true,
            image: true,
            lastSeenAt: true,
            providerProfile: { select: { images: true, heroImageUrl: true } },
          },
        },
        messages: {
          select: { content: true, senderId: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: "desc" },
    }),
    prisma.notification.findMany({
      where: {
        userId,
        type: "NEW_MESSAGE",
        isRead: false,
        OR: [
          { link: { startsWith: "/zinutes/" } },
          { link: { startsWith: "/paskyra/zinutes" } },
        ],
      },
      select: { link: true },
    }),
  ]);

  const unreadTokens = new Set(
    unreadNotifications
      .map((n) => {
        const link = n.link ?? "";
        if (link.startsWith("/zinutes/")) return link.replace(/^\/zinutes\//, "").split("?")[0];
        return new URLSearchParams(link.split("?")[1] ?? "").get("thread") ?? "";
      })
      .filter(Boolean)
  );

  const conversations = inquiries.map((q) => {
    const last = q.messages[0] ?? null;
    return {
      id: q.id,
      trackingToken: q.trackingToken,
      href: `/paskyra/zinutes?thread=${q.trackingToken}`,
      providerName: q.provider.name || "Tiekėjas",
      providerImage: getProviderAvatarImage(q.provider),
      presenceLevel: getPresenceLevel(q.provider.lastSeenAt),
      presenceLabel: formatLastSeen(q.provider.lastSeenAt),
      // First send has no chat messages yet → preview the opening inquiry.
      preview: last ? last.content : q.description,
      lastMessageAt: q.lastMessageAt,
      unread: unreadTokens.has(q.trackingToken),
      fromMe: last ? last.senderId === userId : true,
    };
  });

  const unreadCount = conversations.filter((c) => c.unread).length;
  const filtered =
    filter === "unread" ? conversations.filter((c) => c.unread) : conversations;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/paskyra/profilis"
        className="mb-6 inline-flex items-center gap-1.5 text-body-sm text-surface-500 hover:text-surface-700 transition-colors dark:text-surface-400 dark:hover:text-surface-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Paskyra
      </Link>

      <div className="mb-6">
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">
          Žinutės
        </h1>
        <p className="text-body-sm text-surface-500 dark:text-surface-400 mt-0.5">
          {unreadCount > 0
            ? `${unreadCount} neperskaityti atsakymai`
            : "Pokalbiai, kuriuos pradėjote rašydami tiekėjams"}
        </p>
      </div>

      {/* Filter tabs — URL-driven so the server can re-render the filtered list */}
      {conversations.length > 0 && (
        <div className="flex gap-1 mb-6 rounded-xl bg-surface-100 p-1 dark:bg-surface-800">
          {([
            { value: "all" as Filter, label: "Visi", href: "?tab=all" },
            { value: "unread" as Filter, label: "Neperskaityti", href: "?tab=unread" },
          ]).map((tab) => {
            const active = filter === tab.value;
            return (
              <Link
                key={tab.value}
                href={tab.href}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[44px] flex-1 items-center justify-center rounded-lg px-3 py-2 text-body-sm font-medium transition-colors ${
                  active
                    ? "bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-white"
                    : "text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
                }`}
              >
                {tab.label}
                {tab.value === "unread" && unreadCount > 0 && (
                  <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-micro font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title={
            filter === "unread"
              ? "Neperskaitytų atsakymų nėra"
              : "Dar nesate išsiuntę žinučių"
          }
          description={
            filter === "unread"
              ? "Visi gauti atsakymai perskaityti."
              : 'Apsilankykite tiekėjo profilyje ir spauskite „Rašyti žinutę", kad pradėtumėte pokalbį.'
          }
          icon={<MessageCircle className="h-12 w-12" />}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const highlight = c.unread;
            return (
              <Link key={c.id} href={c.href} className="group block">
                <article
                  className={`rounded-2xl border bg-white p-4 sm:p-5 transition-shadow hover:shadow-md dark:bg-surface-900/50 ${
                    highlight
                      ? "border-brand-200/60 dark:border-brand-800/40"
                      : "border-surface-200/60 dark:border-surface-700/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0 [--presence-cutout-bg:#fff] dark:[--presence-cutout-bg:#25221e]">
                      <div className="relative h-11 w-11 overflow-hidden rounded-full bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-950 dark:to-surface-800">
                        {c.providerImage ? (
                          <Image
                            src={c.providerImage}
                            alt={c.providerName}
                            width={44}
                            height={44}
                            sizes="44px"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-body-sm font-semibold text-brand-700 dark:text-brand-300">
                            {c.providerName[0]?.toUpperCase() ?? "T"}
                          </span>
                        )}
                      </div>
                      {c.presenceLevel && (
                        <span
                          className="pointer-events-none absolute bottom-[1px] right-[1px] flex h-[12px] w-[12px] items-center justify-center rounded-full bg-[var(--presence-cutout-bg)]"
                          aria-label={c.presenceLabel ?? "Aktyvus neseniai"}
                          title={c.presenceLabel ?? "Aktyvus neseniai"}
                        >
                          <span
                            className={`h-[7px] w-[7px] rounded-full ${
                              c.presenceLevel === "online" ? "bg-emerald-500" : "bg-surface-400"
                            }`}
                            aria-hidden
                          />
                        </span>
                      )}
                    </div>
                    {highlight && (
                      <span className="mt-1.5 block h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Neperskaityta" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`flex-1 min-w-0 truncate text-body-sm ${
                            highlight
                              ? "font-semibold text-surface-900 dark:text-white"
                              : "font-medium text-surface-700 dark:text-surface-300"
                          }`}
                        >
                          {decodeHtmlEntities(c.providerName)}
                        </h3>
                        <Badge variant="brand">Tiekėjas</Badge>
                      </div>
                      <p
                        className={`mt-1 line-clamp-1 text-body-sm ${
                          highlight
                            ? "text-surface-600 dark:text-surface-300"
                            : "text-surface-500 dark:text-surface-400"
                        }`}
                      >
                        {c.fromMe && <span className="text-surface-400">Jūs: </span>}
                        {decodeHtmlEntities(c.preview)}
                      </p>
                      <p className="mt-1 text-micro text-surface-400">
                        {c.presenceLabel ? `${c.presenceLabel} · ` : ""}
                        {formatRelativeDate(c.lastMessageAt)}
                      </p>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-surface-300 transition-colors group-hover:text-surface-400 dark:text-surface-600" />
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
