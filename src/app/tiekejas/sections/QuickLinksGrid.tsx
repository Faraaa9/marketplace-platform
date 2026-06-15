import { Suspense } from "react";
import Link from "next/link";
import { Coins, Eye, MessageCircle, User } from "lucide-react";
import Card, { CardTitle } from "@/components/ui/Card";
import { InboxUnreadBadge } from "./InboxUnreadBadge";

/**
 * Static navigation grid. Renders synchronously (link hrefs only); the only
 * dynamic element is the Messages unread badge, which streams in its own small
 * Suspense boundary so it never delays the nav.
 */
export function QuickLinksGrid({ userId, slug }: { userId: string; slug?: string | null }) {
  return (
    <section className="mt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-body font-semibold text-surface-900 dark:text-white">
          Greiti veiksmai
        </h2>
        <p className="hidden text-micro text-surface-500 dark:text-surface-400 sm:block">
          Dažniausiai naudojamos tiekėjo zonos
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Link href="/tiekejas/zinutes" className="group">
        <Card hover className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Žinutės</CardTitle>
                <Suspense fallback={null}>
                  <InboxUnreadBadge userId={userId} />
                </Suspense>
              </div>
              <p className="mt-1 text-body-sm text-surface-500">Pokalbiai su klientais</p>
            </div>
            <MessageCircle className="h-4 w-4 text-surface-400 transition-transform group-hover:scale-110" />
          </div>
        </Card>
      </Link>

      <Link href="/tiekejas/profilis" className="group">
        <Card hover className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Redaguoti profilį</CardTitle>
              <p className="mt-1 text-body-sm text-surface-500">Aprašymas ir nuotraukos</p>
            </div>
            <User className="h-4 w-4 text-surface-400 transition-transform group-hover:scale-110" />
          </div>
        </Card>
      </Link>

      <Link href={`/meistrai/${slug ?? userId}`} className="group">
        <Card hover className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Viešas profilis</CardTitle>
              <p className="mt-1 text-body-sm text-surface-500">Kaip mato klientai</p>
            </div>
            <Eye className="h-4 w-4 text-surface-400 transition-transform group-hover:scale-110" />
          </div>
        </Card>
      </Link>

      <Link href="/tiekejas/planai" className="group">
        <Card hover className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Kreditai</CardTitle>
              <p className="mt-1 text-body-sm text-surface-500">Balansas ir pirkimai</p>
            </div>
            <Coins className="h-4 w-4 text-surface-400 transition-transform group-hover:scale-110" />
          </div>
        </Card>
      </Link>
      </div>
    </section>
  );
}
