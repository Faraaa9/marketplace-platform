/**
 * One-time webhook registration for the Telegram bot.
 *
 * Registers the deployed `/api/telegram/webhook` endpoint with Telegram and
 * binds the shared `secret_token`, which Telegram then echoes back in the
 * `x-telegram-bot-api-secret-token` header on every update.
 *
 * Usage:
 *   pnpm telegram:set-webhook                 # uses NEXTAUTH_URL as the base
 *   pnpm telegram:set-webhook https://x.lt    # explicit base URL override
 *
 * Requires TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET in the environment.
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env.local") });
config({ path: resolve(__dirname, "../.env") });

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const baseUrl = (process.argv[2] ?? process.env.NEXTAUTH_URL)?.trim().replace(/\/+$/, "");

  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  if (!secret) throw new Error("TELEGRAM_WEBHOOK_SECRET is not set");
  if (!baseUrl) {
    throw new Error("No base URL — pass one as an argument or set NEXTAUTH_URL");
  }

  const webhookUrl = `${baseUrl}/api/telegram/webhook`;
  console.log(`Registering Telegram webhook: ${webhookUrl}`);

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ["message", "callback_query"],
    }),
  });

  const payload = await res.json();
  console.log("Telegram response:", JSON.stringify(payload, null, 2));

  if (!res.ok || !payload.ok) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
