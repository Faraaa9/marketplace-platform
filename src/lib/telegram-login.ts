import { randomBytes } from "crypto";
import QRCode from "qrcode";
import { getBotInfo } from "@/lib/telegram/api";

const TOKEN_BYTES = 18;
const EXPIRES_MINUTES = 5;

export function createTelegramLoginToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function telegramLoginExpiresAt(): Date {
  return new Date(Date.now() + EXPIRES_MINUTES * 60_000);
}

export function isSafeCallbackPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const parsed = new URL(value, "https://paslaugurinka.lt");
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (!path.startsWith("/")) return null;
    if (path.startsWith("//")) return null;
    if (path.startsWith("/admin")) return null;
    return path;
  } catch {
    return null;
  }
}

export async function getTelegramBotUsername(): Promise<string | null> {
  const configured =
    process.env.TELEGRAM_BOT_USERNAME?.trim() ||
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim();
  if (configured) return configured.replace(/^@/, "");

  try {
    const info = await getBotInfo();
    return info.username ?? null;
  } catch {
    return null;
  }
}

export function buildTelegramLoginDeepLink(username: string, token: string): string {
  return `https://t.me/${username.replace(/^@/, "")}?start=login_${token}`;
}

export function buildTelegramLoginQrLink(username: string, token: string): string {
  return buildTelegramLoginDeepLink(username, token);
}

export async function buildTelegramLoginQrDataUrl(qrLink: string): Promise<string> {
  return QRCode.toDataURL(qrLink, {
    errorCorrectionLevel: "M",
    margin: 2,
    scale: 8,
    color: {
      dark: "#020617",
      light: "#FFFFFF",
    },
  });
}
