import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import QRCode from "qrcode";
import { getBotInfo } from "@/lib/telegram/api";

const TOKEN_BYTES = 18;
const EXPIRES_MINUTES = 5;

export function createTelegramLoginToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export const TELEGRAM_LOGIN_BIND_COOKIE = "tg_login_bind";

// The binding cookie value is derived from the token with the server secret, so
// it needs no extra column and can't be computed by someone who only saw the QR.
export function telegramLoginBinding(token: string): string {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "")
    .update(`telegram-login:${token}`)
    .digest("base64url");
}

function readCookie(header: string | undefined, name: string): string | null {
  for (const part of header?.split(";") ?? []) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/** True when the request's cookie header carries the binding for `token`. */
export function telegramLoginBindingMatches(token: string, cookieHeader: string | undefined): boolean {
  const actual = readCookie(cookieHeader, TELEGRAM_LOGIN_BIND_COOKIE);
  if (!actual || !process.env.NEXTAUTH_SECRET) return false;
  const expected = Buffer.from(telegramLoginBinding(token));
  const given = Buffer.from(actual);
  return given.length === expected.length && timingSafeEqual(given, expected);
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
