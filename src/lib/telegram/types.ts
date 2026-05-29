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

/** One rendition of a photo. Telegram sends an array sorted small→large. */
export interface TgPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TgMessage {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  text?: string;
  caption?: string;
  voice?: TgVoice;
  contact?: TgContact;
  photo?: TgPhotoSize[];
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
