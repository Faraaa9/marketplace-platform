/**
 * Thin client over the Telegram Bot API. Transport only — no business logic.
 * https://core.telegram.org/bots/api
 */

const API_BASE = "https://api.telegram.org";

/** Thrown when the bot token is missing or the API rejects a call. */
export class TelegramApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramApiError";
  }
}

function botToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    throw new TelegramApiError("TELEGRAM_BOT_TOKEN is not set");
  }
  return token;
}

function apiUrl(method: string): string {
  return `${API_BASE}/bot${botToken()}/${method}`;
}

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

/** POST a JSON body to a Bot API method and unwrap the `result`. */
async function callMethod<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(apiUrl(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let payload: TelegramResponse<T>;
  try {
    payload = (await res.json()) as TelegramResponse<T>;
  } catch {
    throw new TelegramApiError(`${method} returned non-JSON response (HTTP ${res.status})`);
  }

  if (!res.ok || !payload.ok) {
    throw new TelegramApiError(
      `${method} failed (HTTP ${res.status}): ${payload.description ?? "unknown error"}`,
    );
  }
  return payload.result as T;
}

/** One inline-keyboard button: tapping it sends `callback_data` back as a callback query. */
export interface InlineButton {
  text: string;
  callback_data: string;
}

export interface SendMessageOptions {
  /** Rows of inline buttons rendered under the message. */
  inlineKeyboard?: InlineButton[][];
  /**
   * Show a one-time reply keyboard with a single "share contact" button.
   * The button label is provided here; tapping it returns a TgContact.
   */
  requestContact?: { buttonText: string };
  /** Parse mode for the message text (e.g. "HTML", "MarkdownV2"). */
  parseMode?: "HTML" | "MarkdownV2";
}

export async function sendMessage(
  chatId: number,
  text: string,
  opts: SendMessageOptions = {},
): Promise<void> {
  const body: Record<string, unknown> = { chat_id: chatId, text };

  if (opts.parseMode) {
    body.parse_mode = opts.parseMode;
  }

  if (opts.inlineKeyboard) {
    body.reply_markup = { inline_keyboard: opts.inlineKeyboard };
  } else if (opts.requestContact) {
    body.reply_markup = {
      keyboard: [[{ text: opts.requestContact.buttonText, request_contact: true }]],
      one_time_keyboard: true,
      resize_keyboard: true,
    };
  }

  await callMethod("sendMessage", body);
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text?: string,
): Promise<void> {
  const body: Record<string, unknown> = { callback_query_id: callbackQueryId };
  if (text) body.text = text;
  await callMethod("answerCallbackQuery", body);
}

interface TgFile {
  file_id: string;
  file_path?: string;
}

/** Resolve a file_id to a fully-qualified download URL via getFile. */
export async function getFileLink(fileId: string): Promise<string> {
  const file = await callMethod<TgFile>("getFile", { file_id: fileId });
  if (!file.file_path) {
    throw new TelegramApiError(`getFile returned no file_path for ${fileId}`);
  }
  return `${API_BASE}/file/bot${botToken()}/${file.file_path}`;
}

/** Download a file (e.g. a voice note) into a Buffer for transcription. */
export async function downloadFile(fileId: string): Promise<Buffer> {
  const link = await getFileLink(fileId);
  const res = await fetch(link);
  if (!res.ok) {
    throw new TelegramApiError(`Failed to download file ${fileId} (HTTP ${res.status})`);
  }
  return Buffer.from(await res.arrayBuffer());
}
