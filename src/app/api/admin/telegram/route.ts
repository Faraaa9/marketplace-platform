import { NextResponse, connection } from "next/server";
import { getServerSession } from "next-auth";
import { isDynamicServerError } from "next/dist/client/components/hooks-server-context";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBotInfo, getWebhookInfo, type BotInfo, type WebhookInfo } from "@/lib/telegram/api";

interface ConfigInfo {
  botTokenSet: boolean;
  webhookSecretSet: boolean;
  expectedWebhookUrl: string;
  bot: BotInfo | null;
  webhook: WebhookInfo | null;
  telegramError: string | null;
}

function expectedWebhookUrl(): string {
  const base = (process.env.NEXTAUTH_URL || "https://www.paslaugurinka.lt").replace(/\/$/, "");
  return `${base}/api/telegram/webhook`;
}

export async function GET() {
  await connection();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

  const botTokenSet = Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
  const webhookSecretSet = Boolean(process.env.TELEGRAM_WEBHOOK_SECRET?.trim());

  // Live Telegram calls — never let them fail the whole page.
  let bot: BotInfo | null = null;
  let webhook: WebhookInfo | null = null;
  let telegramError: string | null = null;
  if (botTokenSet) {
    try {
      [bot, webhook] = await Promise.all([getBotInfo(), getWebhookInfo()]);
    } catch (error) {
      telegramError = error instanceof Error ? error.message : "Telegram API klaida";
    }
  } else {
    telegramError = "TELEGRAM_BOT_TOKEN nenustatytas";
  }

  const config: ConfigInfo = {
    botTokenSet,
    webhookSecretSet,
    expectedWebhookUrl: expectedWebhookUrl(),
    bot,
    webhook,
    telegramError,
  };

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalSessions,
    linkedSessions,
    byStateRaw,
    recentSessions,
    totalRequests,
    requests30d,
    recentRequests,
  ] = await Promise.all([
    prisma.telegramSession.count(),
    prisma.telegramSession.count({ where: { userId: { not: null } } }),
    prisma.telegramSession.groupBy({ by: ["state"], _count: { _all: true } }),
    prisma.telegramSession.findMany({
      orderBy: { updatedAt: "desc" },
      take: 25,
    }),
    prisma.serviceRequest.count({ where: { source: "telegram" } }),
    prisma.serviceRequest.count({ where: { source: "telegram", createdAt: { gte: since30d } } }),
    prisma.serviceRequest.findMany({
      where: { source: "telegram" },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        title: true,
        status: true,
        moderationStatus: true,
        clientName: true,
        trackingToken: true,
        createdAt: true,
      },
    }),
  ]);

  // Resolve linked user names/emails for the recent session list in one query.
  const userIds = recentSessions.map((s) => s.userId).filter((id): id is string => Boolean(id));
  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  const byState: Record<string, number> = {};
  for (const row of byStateRaw) {
    byState[row.state] = row._count._all;
  }

  const sessions = recentSessions.map((s) => {
    const draft = (s.draft as { title?: string } | null) ?? null;
    const user = s.userId ? userById.get(s.userId) : null;
    return {
      telegramUserId: s.telegramUserId.toString(),
      state: s.state,
      linked: Boolean(s.userId),
      userName: user?.name ?? null,
      userEmail: user?.email ?? null,
      phone: s.phone,
      hasDraft: s.draft != null,
      draftTitle: draft?.title ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      config,
      sessions: {
        total: totalSessions,
        linked: linkedSessions,
        withDraft: (byState.draft_ready ?? 0) + (byState.awaiting_contact ?? 0),
        byState,
        recent: sessions,
      },
      requests: {
        total: totalRequests,
        last30d: requests30d,
        recent: recentRequests.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        })),
      },
    },
  });
  } catch (error) {
    if (isDynamicServerError(error)) {
      throw error;
    }
    console.error("Admin telegram overview error:", error);
    return NextResponse.json({ success: false, error: "Klaida" }, { status: 500 });
  }
}
