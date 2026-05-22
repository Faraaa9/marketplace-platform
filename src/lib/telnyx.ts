const TELNYX_MESSAGES_URL = "https://api.telnyx.com/v2/messages";

interface SendTelnyxSmsInput {
  to: string;
  text: string;
}

interface TelnyxMessageResponse {
  data?: {
    id?: string;
  };
  errors?: unknown;
}

export function isTelnyxSmsConfigured(): boolean {
  return !!(process.env.TELNYX_API_KEY && process.env.TELNYX_FROM_NUMBER);
}

export async function sendTelnyxSms({ to, text }: SendTelnyxSmsInput) {
  const apiKey = process.env.TELNYX_API_KEY;
  const from = process.env.TELNYX_FROM_NUMBER;
  const messagingProfileId = process.env.TELNYX_MESSAGING_PROFILE_ID;

  if (!apiKey || !from) {
    return { success: false, error: "SMS_PROVIDER_NOT_CONFIGURED" as const };
  }

  const response = await fetch(TELNYX_MESSAGES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      text,
      ...(messagingProfileId ? { messaging_profile_id: messagingProfileId } : {}),
    }),
  });

  const payload = (await response.json().catch(() => null)) as TelnyxMessageResponse | null;
  if (!response.ok) {
    console.error("Telnyx SMS send failed", {
      status: response.status,
      errors: payload?.errors,
    });
    return { success: false, error: "SMS_PROVIDER_FAILED" as const };
  }

  return { success: true, messageId: payload?.data?.id };
}
