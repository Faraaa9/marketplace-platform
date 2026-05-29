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
import { getFlatServiceCategories } from "@/lib/service-categories";
import { findOrCreateUserByPhone } from "@/lib/service-requests/link-user";
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
  return (process.env.NEXTAUTH_URL || "https://paslaugurinka.lt").replace(/\/$/, "");
}

async function resolveCategories(
  slugs: string[],
): Promise<Array<{ id: string; name: string }>> {
  if (slugs.length === 0) return [];
  const flat = await getFlatServiceCategories();
  const bySlug = new Map(flat.map((c) => [c.slug, c]));
  const resolved: Array<{ id: string; name: string }> = [];
  for (const slug of slugs) {
    const match = bySlug.get(slug);
    if (match) resolved.push({ id: match.id, name: match.name });
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
  findOrCreateUserByPhone: async (phone, name) => {
    const { userId } = await findOrCreateUserByPhone(phone, name);
    return { userId };
  },
  getStoredEmail: async (userId) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email ?? null;
  },
  createServiceRequest,
  getSession,
  saveSession,
  rateLimit: async (key) => {
    const result = await rateLimitAsync(key, RATE_LIMITS.aiImprove);
    return result.success;
  },
  rateLimitPhoto: async (key) => {
    const result = await rateLimitAsync(key, { maxRequests: 20, windowMs: 60 * 60 * 1000 });
    return result.success;
  },
  baseUrl: baseUrl(),
};

/** Webhook entry point: process a single Telegram update. */
export async function handleUpdate(update: TgUpdate): Promise<void> {
  await runConversation(update, deps);
}
