import { NextResponse } from "next/server";
import { getDevEmailLog } from "@/lib/email";

/**
 * GET /api/dev/emails
 * Dev-only endpoint: returns the in-memory email log for testing.
 * Only available when RESEND_API_KEY is NOT set (mock mode).
 *
 * Query params:
 *   ?preview=0  — returns HTML of that email index for browser rendering
 */
export async function GET(req: Request) {
  if (process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "This endpoint is only available in dev mode (no RESEND_API_KEY)" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const previewIndex = searchParams.get("preview");

  const log = getDevEmailLog();

  // Return raw HTML for browser preview
  if (previewIndex !== null) {
    const idx = parseInt(previewIndex);
    const email = log[idx];
    if (!email) {
      return new Response("<h1>Email not found</h1>", {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
    const wrapper = `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"><title>${email.subject}</title>
      <style>body{margin:0;padding:20px;background:#f5f5f5;font-family:sans-serif}
      .meta{background:#1e293b;color:#e2e8f0;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:13px}
      .meta b{color:#60a5fa}.email-body{background:white;padding:20px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,0.1)}</style>
      </head><body>
      <div class="meta"><b>To:</b> ${email.to} &nbsp; <b>Subject:</b> ${email.subject} &nbsp; <b>Sent:</b> ${email.sentAt}</div>
      <div class="email-body">${email.html}</div>
      </body></html>
    `;
    return new Response(wrapper, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // Return JSON list with preview links
  const emails = log.map((e, i) => ({
    to: e.to,
    subject: e.subject,
    sentAt: e.sentAt,
    previewUrl: `/api/dev/emails?preview=${i}`,
  }));

  return NextResponse.json({ count: emails.length, emails });
}
