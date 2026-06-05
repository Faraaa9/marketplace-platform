/**
 * Telegram bot conversation state machine. Pure control flow — every external
 * effect (messaging, AI, persistence, publishing) is injected via `BotDeps`,
 * so the whole flow is unit-testable with mocks. Real wiring lives in bot.ts.
 */
import type { SendMessageOptions } from "./api";
import type { TgCallbackQuery, TgContact, TgMessage, TgUpdate, TgUser } from "./types";
import {
  DraftData,
  MSG,
  draftButtons,
  formatDraft,
  loginConfirmButtons,
  loginReturnButtons,
} from "./format";
import type {
  CreateServiceRequestInput,
  CreateServiceRequestResult,
} from "@/lib/service-requests/create";
import type { ImproveDescriptionResult } from "@/lib/ai-improve";

export type BotState = "idle" | "awaiting_input" | "draft_ready" | "awaiting_contact";

export interface SessionRow {
  telegramUserId: bigint;
  chatId: number;
  userId: string | null;
  state: BotState;
  draft: DraftData | null;
  phone: string | null;
}

export interface BotDeps {
  sendMessage(chatId: number, text: string, opts?: SendMessageOptions): Promise<void>;
  answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void>;
  downloadFile(fileId: string): Promise<Buffer>;
  /** Upload an image buffer to Cloudinary, returning its res.cloudinary.com URL. */
  uploadPhoto(buffer: Buffer): Promise<string>;
  transcribe(audioBase64: string, format: "wav" | "ogg" | "mp3"): Promise<string>;
  improve(description: string): Promise<ImproveDescriptionResult>;
  /** Resolve AI category slugs to DB categories, preserving order, capped at 3. */
  resolveCategories(
    slugs: string[],
    fallbackText?: string,
  ): Promise<Array<{ id: string; name: string }>>;
  findOrCreateUserByPhone(
    phone: string,
    name?: string,
    preferredUserId?: string | null,
  ): Promise<{ userId: string }>;
  /** Raw stored email for a user (a Telegram placeholder is fine for the schema). */
  getStoredEmail(userId: string): Promise<string | null>;
  confirmTelegramLogin(
    token: string,
    from: TgUser,
    chatId: number,
  ): Promise<{ status: "ok"; returnUrl: string } | { status: "expired" }>;
  createServiceRequest(input: CreateServiceRequestInput): Promise<CreateServiceRequestResult>;
  getSession(telegramUserId: bigint, chatId: number): Promise<SessionRow>;
  saveSession(session: SessionRow): Promise<void>;
  /** Returns true if the action is allowed (under the AI rate limit). */
  rateLimit(key: string): Promise<boolean>;
  /** Separate, looser limit for photo uploads (protects Cloudinary usage). */
  rateLimitPhoto(key: string): Promise<boolean>;
  baseUrl: string;
}

const MIN_DESCRIPTION_LEN = 15;
const MAX_ATTACHMENTS = 5;

const EMPTY_DRAFT: DraftData = {
  title: "",
  description: "",
  categoryIds: [],
  categoryNames: [],
  location: "",
  budget: "",
  deadline: "",
  attachmentUrls: [],
};

export async function handleUpdate(update: TgUpdate, deps: BotDeps): Promise<void> {
  try {
    if (update.callback_query) {
      await handleCallback(update.callback_query, deps);
    } else if (update.message) {
      await handleMessage(update.message, deps);
    }
  } catch (error) {
    console.error("[telegram] handleUpdate error:", error);
    const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id;
    if (chatId != null) {
      await deps.sendMessage(chatId, MSG.genericError).catch(() => {});
    }
  }
}

async function handleMessage(msg: TgMessage, deps: BotDeps): Promise<void> {
  const from = msg.from;
  if (!from) return;
  const chatId = msg.chat.id;
  const telegramUserId = BigInt(from.id);
  const session = await deps.getSession(telegramUserId, chatId);

  if (msg.contact) {
    await handleContact(msg.contact, from, chatId, session, deps);
    return;
  }

  const text = msg.text?.trim();
  const loginToken = parseLoginStartToken(text);
  if (loginToken) {
    await deps.saveSession({ ...session, chatId });
    await deps.sendMessage(chatId, MSG.loginConfirm, {
      inlineKeyboard: loginConfirmButtons(loginToken),
    });
    return;
  }

  if (text === "/start") {
    await deps.saveSession({ ...session, chatId, state: "awaiting_input", draft: null });
    await deps.sendMessage(chatId, MSG.welcome);
    return;
  }

  // While waiting for the shared contact, a plain text message (e.g. the user
  // typing their number by hand) must NOT be treated as a new description, and
  // a typed number must never be trusted — only a Telegram-shared contact is
  // verified. Nudge them back to the button.
  if (session.state === "awaiting_contact") {
    await deps.sendMessage(chatId, MSG.useContactButton, {
      requestContact: { buttonText: MSG.shareContactBtn },
    });
    return;
  }

  if (msg.photo && msg.photo.length > 0) {
    await handlePhoto(msg, session, deps);
    return;
  }

  // A voice note or any free text is treated as a (re-)description. This also
  // serves the "edit" path: the user can simply send a new message.
  if (!msg.voice && !text) {
    await deps.sendMessage(chatId, MSG.prompt);
    return;
  }

  if (!(await deps.rateLimit(`telegram:${from.id}`))) {
    await deps.sendMessage(chatId, MSG.rateLimited);
    return;
  }

  let description: string;
  if (msg.voice) {
    await deps.sendMessage(chatId, MSG.listeningVoice);
    let transcript: string;
    try {
      const buffer = await deps.downloadFile(msg.voice.file_id);
      transcript = await deps.transcribe(buffer.toString("base64"), mimeToFormat(msg.voice.mime_type));
    } catch (error) {
      console.error("[telegram] transcription failed:", error);
      await deps.sendMessage(chatId, MSG.aiUnavailable);
      return;
    }
    if (!transcript.trim()) {
      await deps.sendMessage(chatId, MSG.voiceEmpty);
      return;
    }
    description = transcript.trim();
  } else {
    description = text as string;
  }

  if (description.length < MIN_DESCRIPTION_LEN) {
    await deps.sendMessage(chatId, MSG.tooShort);
    return;
  }

  await buildAndShowDraft(chatId, session, description, deps);
}

async function buildAndShowDraft(
  chatId: number,
  session: SessionRow,
  description: string,
  deps: BotDeps,
): Promise<void> {
  await deps.sendMessage(chatId, MSG.thinking);

  let result: ImproveDescriptionResult;
  try {
    result = await deps.improve(description);
  } catch (error) {
    console.error("[telegram] improve failed:", error);
    await deps.sendMessage(chatId, MSG.aiUnavailable);
    return;
  }

  const finalDescription = result.improvedDescription.trim() || description;
  if (finalDescription.length < 20) {
    await deps.saveSession({ ...session, chatId, state: "awaiting_input", draft: null });
    await deps.sendMessage(chatId, MSG.tooShort);
    return;
  }

  const categories = await deps.resolveCategories(result.categories, finalDescription);
  if (categories.length === 0) {
    await deps.saveSession({ ...session, chatId, state: "awaiting_input", draft: null });
    await deps.sendMessage(chatId, MSG.noCategory);
    return;
  }

  const draft: DraftData = {
    title: normalizeTitle(result.title, finalDescription),
    description: finalDescription,
    categoryIds: categories.map((c) => c.id),
    categoryNames: categories.map((c) => c.name),
    location: result.location,
    budget: result.budget,
    deadline: result.deadline,
    // Carry over any photos the user already sent before describing.
    attachmentUrls: (session.draft?.attachmentUrls ?? []).slice(0, MAX_ATTACHMENTS),
  };

  await deps.saveSession({ ...session, chatId, state: "draft_ready", draft });
  await deps.sendMessage(chatId, formatDraft(draft), {
    parseMode: "HTML",
    inlineKeyboard: draftButtons(),
  });
}

async function handlePhoto(msg: TgMessage, session: SessionRow, deps: BotDeps): Promise<void> {
  const chatId = msg.chat.id;
  const from = msg.from!;
  const existing = session.draft?.attachmentUrls ?? [];

  if (existing.length >= MAX_ATTACHMENTS) {
    await deps.sendMessage(chatId, MSG.tooManyPhotos(MAX_ATTACHMENTS));
    return;
  }

  if (!(await deps.rateLimitPhoto(`telegram-photo:${from.id}`))) {
    await deps.sendMessage(chatId, MSG.rateLimited);
    return;
  }

  // Telegram sends renditions small→large; the last is the highest resolution.
  const largest = msg.photo![msg.photo!.length - 1];
  let url: string;
  try {
    const buffer = await deps.downloadFile(largest.file_id);
    url = await deps.uploadPhoto(buffer);
  } catch (error) {
    console.error("[telegram] photo upload failed:", error);
    await deps.sendMessage(chatId, MSG.photoFailed);
    return;
  }

  const attachmentUrls = [...existing, url].slice(0, MAX_ATTACHMENTS);
  const withPhoto: SessionRow = {
    ...session,
    chatId,
    draft: { ...(session.draft ?? EMPTY_DRAFT), attachmentUrls },
  };

  // A caption rich enough to be a description doubles as the request text.
  const caption = msg.caption?.trim();
  if (caption && caption.length >= MIN_DESCRIPTION_LEN) {
    await deps.saveSession(withPhoto);
    await buildAndShowDraft(chatId, withPhoto, caption, deps);
    return;
  }

  await deps.saveSession(withPhoto);
  if (withPhoto.state === "draft_ready" && withPhoto.draft) {
    // Re-render the draft so the photo count is visible.
    await deps.sendMessage(chatId, formatDraft(withPhoto.draft), {
      parseMode: "HTML",
      inlineKeyboard: draftButtons(),
    });
  } else {
    await deps.sendMessage(chatId, MSG.photoAdded(attachmentUrls.length, MAX_ATTACHMENTS));
  }
}

async function handleCallback(cq: TgCallbackQuery, deps: BotDeps): Promise<void> {
  await deps.answerCallbackQuery(cq.id).catch(() => {});
  const chatId = cq.message?.chat.id;
  if (chatId == null) return;

  const telegramUserId = BigInt(cq.from.id);
  const session = await deps.getSession(telegramUserId, chatId);

  switch (cq.data) {
    case "confirm":
      await handleConfirm(chatId, cq.from, session, deps);
      return;
    case "edit":
      await deps.saveSession({ ...session, chatId, state: "awaiting_input" });
      await deps.sendMessage(chatId, MSG.editPrompt);
      return;
    case "cancel":
      await deps.saveSession({ ...session, chatId, state: "idle", draft: null });
      await deps.sendMessage(chatId, MSG.cancelled);
      return;
    default:
      if (cq.data?.startsWith("login:")) {
        const token = cq.data.slice("login:".length);
        const result = await deps.confirmTelegramLogin(token, cq.from, chatId);
        if (result.status === "ok") {
          await deps.sendMessage(chatId, MSG.loginConfirmed, {
            inlineKeyboard: loginReturnButtons(result.returnUrl),
          });
        } else {
          await deps.sendMessage(chatId, MSG.loginExpired);
        }
      }
      return;
  }
}

async function handleConfirm(
  chatId: number,
  from: TgUser,
  session: SessionRow,
  deps: BotDeps,
): Promise<void> {
  if (!session.draft) {
    await deps.sendMessage(chatId, MSG.nothingToPost);
    return;
  }

  // No verified contact yet → ask the user to share their Telegram phone.
  if (!session.userId || !session.phone) {
    await deps.saveSession({ ...session, chatId, state: "awaiting_contact" });
    await deps.sendMessage(chatId, MSG.askContact, {
      requestContact: { buttonText: MSG.shareContactBtn },
    });
    return;
  }

  await publish(chatId, from, session, deps);
}

async function handleContact(
  contact: TgContact,
  from: TgUser,
  chatId: number,
  session: SessionRow,
  deps: BotDeps,
): Promise<void> {
  // request_contact returns the sharer's own contact; reject a forwarded one.
  if (contact.user_id != null && contact.user_id !== from.id) {
    await deps.sendMessage(chatId, MSG.contactNotOwn);
    return;
  }

  if (session.state !== "awaiting_contact" || !session.draft) {
    await deps.sendMessage(chatId, MSG.prompt);
    return;
  }

  const name = from.first_name?.trim() || contact.first_name?.trim() || undefined;
  // Telegram sends shared-contact numbers as international digits without a
  // leading "+", which our E164 normalizer rejects. Contacts are always
  // international, so restore the "+".
  const phone = ensurePlusPrefix(contact.phone_number);
  const { userId } = await deps.findOrCreateUserByPhone(phone, name, session.userId);
  const linked: SessionRow = {
    ...session,
    chatId,
    userId,
    phone,
    state: "draft_ready",
  };
  await deps.saveSession(linked);
  await publish(chatId, from, linked, deps);
}

async function publish(
  chatId: number,
  from: TgUser,
  session: SessionRow,
  deps: BotDeps,
): Promise<void> {
  const draft = session.draft;
  if (!draft || !session.userId) {
    await deps.sendMessage(chatId, MSG.nothingToPost);
    return;
  }

  const email = await deps.getStoredEmail(session.userId);
  if (!email) {
    await deps.sendMessage(chatId, MSG.genericError);
    return;
  }

  const firstName = from.first_name?.trim() ?? "";
  const clientName = firstName.length >= 2 ? firstName : "Klientas";

  const result = await deps.createServiceRequest({
    title: draft.title,
    description: draft.description,
    categoryIds: draft.categoryIds,
    location: draft.location,
    budget: draft.budget,
    deadline: draft.deadline,
    attachmentUrls: draft.attachmentUrls,
    clientName,
    clientEmail: email,
    clientPhone: session.phone ?? undefined,
    clientId: session.userId,
    source: "telegram",
    contactPreVerified: true,
  });

  if (result.ok) {
    await deps.saveSession({ ...session, chatId, state: "idle", draft: null });
    const link = `${deps.baseUrl}/uzklausos/sekti/${result.trackingToken}`;
    await deps.sendMessage(
      chatId,
      result.moderationStatus === "PENDING" ? MSG.postedPending(link) : MSG.postedLive(link),
    );
    return;
  }

  // Keep the draft so the user can retry or edit after a failure.
  await deps.saveSession({ ...session, chatId, state: "draft_ready" });
  await deps.sendMessage(chatId, MSG.publishError(result.message));
}

function normalizeTitle(title: string, description: string): string {
  let value = (title ?? "").trim();
  if (value.length < 5) {
    value = description.split(/[.!?\n]/)[0]?.trim() ?? "";
  }
  if (value.length > 100) value = value.slice(0, 100).trim();
  if (value.length < 5) value = "Paslaugos užklausa";
  return value;
}

function ensurePlusPrefix(phone: string): string {
  const compact = phone.trim().replace(/[\s().-]/g, "");
  return compact.startsWith("+") ? compact : `+${compact}`;
}

function parseLoginStartToken(text: string | undefined): string | null {
  const match = text?.match(/^\/start\s+login_([A-Za-z0-9_-]{16,64})$/);
  return match?.[1] ?? null;
}

function mimeToFormat(mime?: string): "wav" | "ogg" | "mp3" {
  if (!mime) return "ogg";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  return "ogg"; // Telegram voice notes are audio/ogg (Opus)
}
