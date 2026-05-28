import { NextRequest, NextResponse } from "next/server";
import { handleUpdate } from "@/lib/telegram/bot";
import type { TgUpdate } from "@/lib/telegram/types";

// Telegram delivers voice downloads and uses Buffer — needs the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Telegram webhook endpoint.
 *
 * Telegram POSTs every update here. Setup runs once via
 * `scripts/telegram-set-webhook.ts`, which registers this URL with a
 * `secret_token`; Telegram then echoes it in the
 * `x-telegram-bot-api-secret-token` header on every request.
 *
 * We verify that header, hand the update to the conversation logic, and
 * always return 200 fast so Telegram does not retry. Errors are logged
 * internally, never surfaced to Telegram.
 */
export async function POST(req: NextRequest) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!expectedSecret) {
    console.error("[telegram] TELEGRAM_WEBHOOK_SECRET not set — rejecting webhook");
    return NextResponse.json({ error: "Not configured" }, { status: 401 });
  }

  const providedSecret = req.headers.get("x-telegram-bot-api-secret-token");
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Invalid secret token" }, { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch (error) {
    console.error("[telegram] failed to parse update body:", error);
    // Acknowledge anyway — a malformed body won't succeed on retry.
    return NextResponse.json({ ok: true });
  }

  try {
    await handleUpdate(update);
  } catch (error) {
    console.error("[telegram] handleUpdate threw:", error);
  }

  return NextResponse.json({ ok: true });
}
