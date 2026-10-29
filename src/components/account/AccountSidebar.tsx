"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ClipboardList, Coins, FileText, Home, MessageCircle, Plus, Search, User, type LucideIcon } from "lucide-react";
import { cn, ltCount } from "@/lib/utils";
import { useMounted } from "@/lib/use-mounted";

export type AccountKind = "customer" | "provider";

interface CustomerSummary {
  attention: number;
  active: number;
  unreadMessages: number;
}

interface ProviderSummary {
  credits: number;
  newLeads: number;
  unreadMessages: number;
  completeness: number;
  offers: number;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Extra path prefixes that also light this item up. */
  alsoMatches?: string[];
  exact?: boolean;
  badge?: number;
  hint?: string;
}

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return [item.href, ...(item.alsoMatches ?? [])].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const REFRESH_EVENT = "account-summary:refresh";

/** Ask the sidebar to refetch its counts (after an unlock, an offer, a pick). */
export function refreshAccountSummary() {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

function useSummary<T>(url: string | null, pathname: string) {
  const [data, setData] = useState<T | null>(null);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    const bump = () => setNonce((n) => n + 1);
    window.addEventListener(REFRESH_EVENT, bump);
    return () => window.removeEventListener(REFRESH_EVENT, bump);
  }, []);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    fetch(url, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.success) setData(d.data as T);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // Refetch on navigation so counts drop once a thread or offer was opened.
  }, [url, pathname, nonce]);
  return data;
}

/**
 * Left menu of the customer and provider account areas. On phones the menu
 * itself is the global MobileBottomNav, so only a slim strip with the main
 * action (new request / credit balance) and the account switch shows here.
 */
export default function AccountSidebar({ kind }: { kind: AccountKind }) {
  const pathname = usePathname() ?? "/";
  const { data: session, status } = useSession();
  const mounted = useMounted();
  const authed = mounted && status === "authenticated";
  const isProvider = session?.user?.role === "PROVIDER";
  const customer = useSummary<CustomerSummary>(authed && kind === "customer" ? "/api/paskyra/suvestine" : null, pathname);
  const provider = useSummary<ProviderSummary>(authed && kind === "provider" ? "/api/tiekejas/suvestine" : null, pathname);

  // Guests on a tracking link see the request page without account chrome.
  if (!authed) return null;

  const items: NavItem[] =
    kind === "customer"
      ? [
          { href: "/paskyra", label: "Pradžia", icon: Home, exact: true, badge: customer?.attention },
          {
            href: "/paskyra/uzklausos",
            label: "Mano užklausos",
            icon: ClipboardList,
            alsoMatches: ["/uzklausos/sekti"],
            hint: customer ? String(customer.active) : undefined,
          },
          { href: "/paskyra/zinutes", label: "Žinutės", icon: MessageCircle, badge: customer?.unreadMessages },
          { href: "/paskyra/profilis", label: "Mano duomenys", icon: User },
        ]
      : [
          { href: "/tiekejas", label: "Šiandien", icon: Home, exact: true },
          {
            href: "/tiekejas/uzklausos",
            label: "Naujos užklausos",
            icon: Search,
            alsoMatches: ["/tiekejas/uzklausa"],
            badge: provider?.newLeads,
          },
          {
            href: "/tiekejas/pasiulymai",
            label: "Mano pasiūlymai",
            icon: FileText,
            hint: provider ? String(provider.offers) : undefined,
          },
          { href: "/tiekejas/zinutes", label: "Žinutės", icon: MessageCircle, badge: provider?.unreadMessages },
          {
            href: "/tiekejas/profilis",
            label: "Mano profilis",
            icon: User,
            hint: provider ? `${provider.completeness}%` : undefined,
          },
          { href: "/tiekejas/planai", label: "Kreditai ir sąskaitos", icon: Coins },
        ];

  const switchLink =
    kind === "customer"
      ? isProvider
        ? { href: "/tiekejas", title: "Esate meistras?", sub: "Perjungti į meistro paskyrą →" }
        : null
      : { href: "/paskyra", title: "Užsakyti paslaugą patiems?", sub: "Perjungti į kliento paskyrą →" };

  return (
    <>
      <aside
        aria-label={kind === "customer" ? "Paskyros meniu" : "Meistro meniu"}
        className="sticky top-[72px] hidden h-[calc(100dvh-72px)] w-[232px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-surface-100 bg-white/60 px-3.5 py-5 dark:border-surface-800 dark:bg-surface-900/60 md:flex"
      >
        {kind === "customer" ? (
          <Link
            href="/uzklausos/nauja"
            className="mb-3.5 inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-brand-600 font-semibold text-white transition-colors hover:bg-brand-700"
          >
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            Nauja užklausa
          </Link>
        ) : (
          <>
            <p className="px-2 pb-2 text-micro font-normal text-surface-500">Meistro paskyra</p>
            <Link
              href="/tiekejas/planai"
              className="mb-3 flex items-center justify-between rounded-[10px] border border-surface-100 bg-white px-3 py-2.5 transition-colors hover:border-surface-300 dark:border-surface-800 dark:bg-surface-900"
            >
              <span>
                <span className="block text-micro font-normal text-surface-500">Kreditai</span>
                <strong className="text-[20px] leading-tight text-surface-900 dark:text-white">
                  {provider?.credits ?? "–"}
                </strong>
              </span>
              <span className="text-caption font-semibold text-brand-700 dark:text-brand-400">Papildyti →</span>
            </Link>
          </>
        )}

        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[42px] items-center gap-2.5 rounded-lg px-2.5 text-body-sm transition-colors",
                active
                  ? "bg-brand-50 font-semibold text-surface-900 dark:bg-brand-500/10 dark:text-white"
                  : "text-surface-700 hover:bg-surface-50 dark:text-surface-300 dark:hover:bg-surface-800",
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
              <span className="min-w-0 truncate">{item.label}</span>
              {item.badge ? (
                <span className="ml-auto rounded-full bg-brand-600 px-1.5 text-micro font-semibold text-white">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : item.hint ? (
                <span className="ml-auto whitespace-nowrap text-micro font-normal text-surface-500">{item.hint}</span>
              ) : null}
            </Link>
          );
        })}

        {switchLink && (
          <div className="mt-auto border-t border-surface-100 pt-3.5 dark:border-surface-800">
            <Link
              href={switchLink.href}
              className="block rounded-[10px] border border-surface-100 bg-white p-3 text-body-sm transition-colors hover:border-surface-300 dark:border-surface-800 dark:bg-surface-900"
            >
              <strong className="text-surface-900 dark:text-white">{switchLink.title}</strong>
              <small className="mt-0.5 block text-caption font-normal text-surface-500">{switchLink.sub}</small>
            </Link>
          </div>
        )}
      </aside>

      <div className="flex items-center gap-2 border-b border-surface-100 px-4 py-2.5 dark:border-surface-800 md:hidden">
        {kind === "customer" ? (
          <Link
            href="/uzklausos/nauja"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 text-body-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" /> Nauja užklausa
          </Link>
        ) : (
          <Link
            href="/tiekejas/planai"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-surface-200 bg-white px-3 text-body-sm dark:border-surface-700 dark:bg-surface-900"
          >
            <Coins className="h-4 w-4 text-brand-600" />
            <strong>{provider ? ltCount(provider.credits, ["kreditas", "kreditai", "kreditų"]) : "Kreditai"}</strong>
          </Link>
        )}
        {switchLink && (
          <Link
            href={switchLink.href}
            className="ml-auto inline-flex min-h-11 items-center text-caption font-semibold text-brand-700 dark:text-brand-400"
          >
            {kind === "customer" ? "Meistro paskyra →" : "Kliento paskyra →"}
          </Link>
        )}
      </div>
    </>
  );
}
