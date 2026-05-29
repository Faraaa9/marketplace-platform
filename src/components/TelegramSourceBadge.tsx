import { Send } from "lucide-react";

/** Small neutral pill marking a request that arrived via the Telegram bot. */
export default function TelegramSourceBadge() {
  return (
    <span
      title="Pateikta per Telegram"
      className="inline-flex items-center gap-1 rounded-full border border-surface-200 bg-surface-50 px-2 py-0.5 text-micro font-medium text-surface-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300"
    >
      <Send className="h-3 w-3 text-surface-400 dark:text-surface-500" />
      Telegram
    </span>
  );
}
