import { NextRequest, NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createServerTimer } from "@/lib/server-timing";

type NotificationPayload = {
  data: {
    id: string;
    title: string;
    body: string;
    isRead: boolean;
    link: string | null;
    createdAt: Date;
  }[];
  unreadCount: number;
  expiresAt: number;
};

const NOTIFICATION_SERVER_CACHE_TTL_MS = 15_000;
const notificationCache = new Map<string, NotificationPayload>();

export async function GET() {
  await connection();
  const timer = createServerTimer("notifications-get");
  try {
    const session = await getServerSession(authOptions);
    timer.mark("session");
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const cached = notificationCache.get(session.user.id);
    if (cached && cached.expiresAt > Date.now()) {
      timer.end({ mode: "cache", notifications: cached.data.length, unreadCount: cached.unreadCount });
      return NextResponse.json({
        success: true,
        data: cached.data,
        unreadCount: cached.unreadCount,
      });
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.user.id },
        select: {
          id: true,
          title: true,
          body: true,
          isRead: true,
          link: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.notification.count({
        where: { userId: session.user.id, isRead: false },
      }),
    ]);
    timer.mark("queries");
    timer.end({ notifications: notifications.length, unreadCount });
    notificationCache.set(session.user.id, {
      data: notifications,
      unreadCount,
      expiresAt: Date.now() + NOTIFICATION_SERVER_CACHE_TTL_MS,
    });

    return NextResponse.json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    console.error("Get notifications error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  await connection();
  const timer = createServerTimer("notifications-patch");
  try {
    const session = await getServerSession(authOptions);
    timer.mark("session");
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await req.json();
    timer.mark("parseBody");

    if (id) {
      await prisma.notification.update({
        where: { id, userId: session.user.id },
        data: { isRead: true },
      });
    } else {
      // Mark all as read
      await prisma.notification.updateMany({
        where: { userId: session.user.id, isRead: false },
        data: { isRead: true },
      });
    }
    notificationCache.delete(session.user.id);
    timer.mark("update");
    timer.end({ mode: id ? "one" : "all" });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update notification error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
