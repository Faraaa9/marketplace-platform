import { sendEmail } from "@/lib/email";
import { rateLimitAsync } from "@/lib/rate-limit";

// Founder-facing failure alerts without a paid monitoring account: one email
// per distinct failure per window, plus a global cap so an outage that throws
// on every request can't flood the inbox or burn the Resend quota.
const PER_KEY = { maxRequests: 1, windowMs: 30 * 60 * 1000 };
const GLOBAL = { maxRequests: 20, windowMs: 60 * 60 * 1000 };

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function alertRecipient(): string | undefined {
  return (
    process.env.ALERT_EMAIL?.trim() ||
    process.env.INBOUND_FORWARD_TO?.trim() ||
    process.env.EMAIL_REPLY_TO?.trim() ||
    undefined
  );
}

/**
 * Never throws: alerting runs inside error paths and must not mask the
 * original failure.
 */
export async function sendAlert(key: string, title: string, details: Record<string, unknown>) {
  try {
    console.error(`[alert] ${title}`, details);
    const to = alertRecipient();
    if (!to) return;

    const perKey = await rateLimitAsync(`alert:${key}`, PER_KEY);
    if (!perKey.success) return;
    const global = await rateLimitAsync("alert:global", GLOBAL);
    if (!global.success) return;

    const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown";
    const rows = Object.entries(details)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(
        ([k, v]) =>
          `<tr><td style="padding:2px 8px 2px 0;vertical-align:top;"><strong>${escapeHtml(k)}</strong></td>` +
          `<td style="padding:2px 0;"><pre style="margin:0;white-space:pre-wrap;font-family:monospace;">${escapeHtml(String(v))}</pre></td></tr>`,
      )
      .join("");

    await sendEmail({
      to,
      subject: `[paslaugurinka ${env}] ${title}`.slice(0, 200),
      html:
        `<p>Svetainėje įvyko klaida. Kitas toks pat pranešimas ateis ne anksčiau kaip po 30 min.</p>` +
        `<table>${rows}</table>` +
        `<p style="color:#666;">Daugiau: Vercel → marketplace-platform → Logs.</p>`,
    });
  } catch (error) {
    console.error("[alert] Nepavyko išsiųsti pranešimo:", error);
  }
}
