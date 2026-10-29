/**
 * Production wiring for the Telegram bot. Binds the real transport, AI,
 * persistence and publishing dependencies to the conversation state machine
 * and exposes the single entry point the webhook route calls.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rateLimitAsync, RATE_LIMITS } from "@/lib/rate-limit";
import { getConfiguredCloudinary } from "@/lib/cloudinary";
import { transcribeAudio } from "@/lib/ai-transcribe";
import { improveDescription } from "@/lib/ai-improve";
import { suggestCategories } from "@/lib/category-suggestions";
import { getFlatServiceCategories } from "@/lib/service-categories";
import {
  findOrCreateUserByPhone,
  findOrCreateUserByTelegramId,
} from "@/lib/service-requests/link-user";
import { createServiceRequest } from "@/lib/service-requests/create";
import { answerCallbackQuery, downloadFile, sendMessage } from "./api";
import type { TgUpdate } from "./types";
import type { DraftData } from "./format";
import {
  handleUpdate as runConversation,
  type BotDeps,
  type BotState,
  type SessionRow,
} from "./conversation";

function baseUrl(): string {
  return (
    process.env.TELEGRAM_LOGIN_RETURN_URL ||
    process.env.NEXTAUTH_URL ||
    "https://paslaugurinka.lt"
  ).replace(/\/$/, "");
}

// Telegram user IDs exempt from the posting rate limits (AI-improve + photo).
// Set via TELEGRAM_UNRESTRICTED_USER_IDS — a comma-separated list of numeric
// Telegram user ids — so the team's own posting/test account isn't throttled
// during QA. Empty in normal operation.
const UNRESTRICTED_TELEGRAM_USER_IDS = new Set(
  (process.env.TELEGRAM_UNRESTRICTED_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
);

// Rate-limit keys are `telegram:<id>` / `telegram-photo:<id>`; the id is the
// trailing segment.
function isUnrestrictedKey(key: string): boolean {
  if (UNRESTRICTED_TELEGRAM_USER_IDS.size === 0) return false;
  return UNRESTRICTED_TELEGRAM_USER_IDS.has(key.slice(key.lastIndexOf(":") + 1));
}

async function resolveCategories(
  slugs: string[],
  fallbackText?: string,
): Promise<Array<{ id: string; name: string }>> {
  const flat = await getFlatServiceCategories();
  const bySlug = new Map(flat.map((c) => [c.slug, c]));
  const resolved: Array<{ id: string; name: string }> = [];
  for (const slug of slugs) {
    const match = bySlug.get(slug);
    if (match) resolved.push({ id: match.id, name: match.name });
    if (resolved.length === 3) break;
  }
  if (resolved.length > 0 || !fallbackText?.trim()) return resolved;

  const fallback = await suggestCategories({
    mode: "request",
    text: fallbackText,
    limit: 3,
  });
  for (const suggestion of fallback.suggestions) {
    if (!resolved.some((category) => category.id === suggestion.id)) {
      resolved.push({ id: suggestion.id, name: suggestion.name });
    }
    if (resolved.length === 3) break;
  }
  return resolved;
}

async function getSession(telegramUserId: bigint, chatId: number): Promise<SessionRow> {
  const row = await prisma.telegramSession.findUnique({ where: { telegramUserId } });
  if (!row) {
    return { telegramUserId, chatId, userId: null, state: "idle", draft: null, phone: null };
  }
  return {
    telegramUserId: row.telegramUserId,
    chatId: Number(row.chatId),
    userId: row.userId,
    state: (row.state as BotState) || "idle",
    draft: (row.draft as DraftData | null) ?? null,
    phone: row.phone,
  };
}

async function saveSession(session: SessionRow): Promise<void> {
  const draft =
    session.draft === null
      ? Prisma.DbNull
      : (session.draft as unknown as Prisma.InputJsonValue);
  await prisma.telegramSession.upsert({
    where: { telegramUserId: session.telegramUserId },
    create: {
      telegramUserId: session.telegramUserId,
      chatId: BigInt(session.chatId),
      userId: session.userId,
      state: session.state,
      draft,
      phone: session.phone,
    },
    update: {
      chatId: BigInt(session.chatId),
      userId: session.userId,
      state: session.state,
      draft,
      phone: session.phone,
    },
  });
}

const deps: BotDeps = {
  sendMessage,
  answerCallbackQuery,
  downloadFile,
  uploadPhoto: async (buffer) => {
    const cld = getConfiguredCloudinary();
    const dataUri = `data:image/jpeg;base64,${buffer.toString("base64")}`;
    const result = await cld.uploader.upload(dataUri, { folder: "requests/telegram" });
    return result.secure_url;
  },
  transcribe: (audioBase64, format) => transcribeAudio(audioBase64, format, { source: "telegram" }),
  improve: (description) => improveDescription({ description }),
  resolveCategories,
  findOrCreateUserByPhone: async (phone, name, preferredUserId) => {
    const { userId } = await findOrCreateUserByPhone(phone, name, preferredUserId);
    return { userId };
  },
  getStoredEmail: async (userId) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email ?? null;
  },
  confirmTelegramLogin: async (token, from, chatId) => {
    const now = new Date();
    const row = await prisma.telegramLoginToken.findUnique({
      where: { token },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        consumedAt: true,
        callbackUrl: true,
      },
    });
    if (!row || row.status !== "PENDING" || row.consumedAt || row.expiresAt < now) {
      if (row?.status === "PENDING" && row.expiresAt < now) {
        await prisma.telegramLoginToken.update({
          where: { token },
          data: { status: "EXPIRED" },
          select: { id: true },
        });
      }
      return { status: "expired" };
    }

    const name = [from.first_name, from.last_name].filter(Boolean).join(" ").trim();
    const telegramUserId = BigInt(from.id);
    const { userId } = await findOrCreateUserByTelegramId(
      telegramUserId,
      name || from.username || undefined,
    );

    const [, confirmed] = await prisma.$transaction([
      prisma.telegramSession.upsert({
        where: { telegramUserId },
        create: {
          telegramUserId,
          chatId: BigInt(chatId),
          userId,
          state: "idle",
        },
        update: {
          chatId: BigInt(chatId),
          userId,
        },
      }),
      // Conditional so a token confirmed twice (double tap, two Telegram
      // accounts racing) binds only the first confirmer.
      prisma.telegramLoginToken.updateMany({
        where: { token, status: "PENDING", consumedAt: null, expiresAt: { gt: now } },
        data: {
          status: "CONFIRMED",
          telegramUserId,
          userId,
          confirmedAt: now,
        },
      }),
    ]);
    if (confirmed.count !== 1) return { status: "expired" };

    const callbackPath = row.callbackUrl?.startsWith("/") ? row.callbackUrl : "/";
    return { status: "ok", returnUrl: `${baseUrl()}${callbackPath}` };
  },
  createServiceRequest,
  getSession,
  saveSession,
  rateLimit: async (key) => {
    if (isUnrestrictedKey(key)) return true;
    const result = await rateLimitAsync(key, RATE_LIMITS.aiImprove);
    return result.success;
  },
  rateLimitPhoto: async (key) => {
    if (isUnrestrictedKey(key)) return true;
    const result = await rateLimitAsync(key, { maxRequests: 20, windowMs: 60 * 60 * 1000 });
    return result.success;
  },
  baseUrl: baseUrl(),
};

/** Webhook entry point: process a single Telegram update. */
export async function handleUpdate(update: TgUpdate): Promise<void> {
  await runConversation(update, deps);
}
