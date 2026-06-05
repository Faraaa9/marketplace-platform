import { NextRequest, NextResponse } from "next/server";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildTelegramLoginDeepLink,
  buildTelegramLoginQrDataUrl,
  buildTelegramLoginQrLink,
  createTelegramLoginToken,
  getTelegramBotUsername,
  isSafeCallbackPath,
  telegramLoginExpiresAt,
} from "@/lib/telegram-login";

const TOKEN_TAKE = 64;

export async function POST(req: NextRequest) {
  await connection();

  let callbackUrl: string | null = null;
  try {
    const body = (await req.json().catch(() => null)) as { callbackUrl?: string } | null;
    callbackUrl = isSafeCallbackPath(body?.callbackUrl);
  } catch {
    callbackUrl = null;
  }

  const username = await getTelegramBotUsername();
  if (!username) {
    return NextResponse.json(
      { success: false, error: "Telegram bot'as dar nesukonfigūruotas" },
      { status: 503 },
    );
  }

  const token = createTelegramLoginToken();
  const deepLink = buildTelegramLoginDeepLink(username, token);
  const qrLink = buildTelegramLoginQrLink(username, token);
  const qrDataUrl = await buildTelegramLoginQrDataUrl(qrLink);

  await prisma.telegramLoginToken.create({
    data: {
      token,
      callbackUrl,
      expiresAt: telegramLoginExpiresAt(),
    },
    select: { id: true },
  });

  return NextResponse.json({
    success: true,
    data: {
      token,
      deepLink,
      qrDataUrl,
      qrLink,
      expiresInSeconds: 5 * 60,
    },
  });
}

export async function GET(req: NextRequest) {
  await connection();

  const token = req.nextUrl.searchParams.get("token")?.slice(0, TOKEN_TAKE) ?? "";
  if (!token) {
    return NextResponse.json({ success: false, error: "Trūksta tokeno" }, { status: 400 });
  }

  const row = await prisma.telegramLoginToken.findUnique({
    where: { token },
    select: {
      status: true,
      expiresAt: true,
      confirmedAt: true,
      consumedAt: true,
      callbackUrl: true,
      userId: true,
    },
  });

  if (!row) {
    return NextResponse.json({ success: false, error: "Prisijungimas nerastas" }, { status: 404 });
  }

  const expired = row.expiresAt < new Date();
  if (expired && row.status === "PENDING") {
    await prisma.telegramLoginToken.update({
      where: { token },
      data: { status: "EXPIRED" },
      select: { id: true },
    });
  }

  const status = expired ? "EXPIRED" : row.consumedAt ? "CONSUMED" : row.status;

  return NextResponse.json({
    success: true,
    data: {
      status,
      confirmed: status === "CONFIRMED" && !!row.userId,
      telegramLoginToken: status === "CONFIRMED" && row.userId ? token : null,
      callbackUrl: row.callbackUrl,
      confirmedAt: row.confirmedAt?.toISOString() ?? null,
    },
  });
}
