import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, MessageCircle, User, Eye, Database } from "lucide-react";
import Card, { CardTitle } from "@/components/ui/Card";
import { InboxUnreadBadge } from "./InboxUnreadBadge";

/**
 * Static navigation grid. Renders synchronously (link hrefs only); the only
 * dynamic element is the Messages unread badge, which streams in its own small
 * Suspense boundary so it never delays the nav.
 */
export function QuickLinksGrid({ userId }: { userId: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Link href="/tiekejas/uzklausos" className="group">
        <Card hover>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Užklausos</CardTitle>
              <p className="mt-1 text-body-sm text-surface-500">Naršyti ir atsakyti</p>
            </div>
            <ArrowRight className="h-4 w-4 text-surface-400 transition-transform group-hover:translate-x-1" />
          </div>
        </Card>
      </Link>

      <Link href="/tiekejas/zinutes" className="group">
        <Card hover>
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
        <Card hover>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Redaguoti profilį</CardTitle>
              <p className="mt-1 text-body-sm text-surface-500">Aprašymas ir nuotraukos</p>
            </div>
            <User className="h-4 w-4 text-surface-400 transition-transform group-hover:scale-110" />
          </div>
        </Card>
      </Link>

      <Link href={`/meistrai/${userId}`} className="group">
        <Card hover>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Viešas profilis</CardTitle>
              <p className="mt-1 text-body-sm text-surface-500">Kaip mato klientai</p>
            </div>
            <Eye className="h-4 w-4 text-surface-400 transition-transform group-hover:scale-110" />
          </div>
        </Card>
      </Link>

      <Link href="/tiekejas/katalogas" className="group">
        <Card hover>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Katalogo profiliai</CardTitle>
              <p className="mt-1 text-body-sm text-surface-500">Perimti profiliai</p>
            </div>
            <Database className="h-4 w-4 text-surface-400 transition-transform group-hover:scale-110" />
          </div>
        </Card>
      </Link>
    </div>
  );
}
