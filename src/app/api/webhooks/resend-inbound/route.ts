import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { routeInboundEmail, type InboundEmailInput } from "@/lib/inbound-router";

export const dynamic = "force-dynamic";

/** Resend signs webhooks via Svix — pull the three signature headers it sends. */
function svixHeaders(headers: Headers): { id: string; timestamp: string; signature: string } {
  return {
    id: headers.get("svix-id") ?? headers.get("webhook-id") ?? "",
    timestamp: headers.get("svix-timestamp") ?? headers.get("webhook-timestamp") ?? "",
    signature: headers.get("svix-signature") ?? headers.get("webhook-signature") ?? "",
  };
}

/**
 * Resend inbound-email webhook.
 *
 * Resend POSTs an `email.received` event here when mail arrives at the
 * configured inbound domain. The event carries only metadata, so the full
 * body is fetched via the Received Emails API before routing.
 *
 * Setup (Resend dashboard): Webhooks → Add Webhook → this URL, event
 * `email.received`. Put the signing secret in RESEND_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET?.trim();

  if (!webhookSecret || !apiKey) {
    console.error(
      "[inbound] RESEND_WEBHOOK_SECRET or RESEND_API_KEY not set — cannot process webhook",
    );
    return NextResponse.json({ error: "Inbound email not configured" }, { status: 500 });
  }

  const payload = await req.text();
  const resend = new Resend(apiKey);

  // Verify the Svix signature — rejects any request not signed by Resend.
  let event;
  try {
    event = resend.webhooks.verify({
      payload,
      headers: svixHeaders(req.headers),
      webhookSecret,
    });
  } catch (error) {
    console.error("[inbound] webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Only inbound emails are actioned; acknowledge any other event type.
  if (event.type !== "email.received") {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  try {
    // The webhook payload has no body — fetch the full email.
    const full = await resend.emails.receiving.get(event.data.email_id);
    if (full.error || !full.data) {
      console.error("[inbound] receiving.get failed:", full.error);
      // 500 → Resend retries; routeInboundEmail is idempotent so retries are safe.
      return NextResponse.json({ error: "Could not fetch email" }, { status: 500 });
    }

    const detail = full.data;
    const input: InboundEmailInput = {
      resendEmailId: event.data.email_id,
      messageId: detail.message_id ?? null,
      from: detail.from,
      to: detail.to,
      subject: detail.subject ?? null,
      text: detail.text ?? null,
      html: detail.html ?? null,
      headers: detail.headers ?? null,
    };

    await routeInboundEmail(input);
  } catch (error) {
    console.error("[inbound] failed to process received email:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
