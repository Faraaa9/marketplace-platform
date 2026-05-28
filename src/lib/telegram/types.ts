/**
 * Minimal Telegram Bot API types — only the subset of update/message shapes
 * the paslaugurinka.lt bot actually reads. Not a full API binding.
 * Reference: https://core.telegram.org/bots/api#available-types
 */

export interface TgUser {
  id: number;
  first_name?: string;
  username?: string;
}

export interface TgChat {
  id: number;
}

export interface TgVoice {
  file_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

export interface TgContact {
  phone_number: string;
  user_id?: number;
  first_name?: string;
}

export interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  text?: string;
  voice?: TgVoice;
  contact?: TgContact;
}

export interface TgCallbackQuery {
  id: string;
  from: TgUser;
  data?: string;
  message?: TgMessage;
}

export interface TgUpdate {
  update_id: number;
  message?: TgMessage;
  callback_query?: TgCallbackQuery;
}
