import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { sanitizeHtml } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

// Public contact form destination — the platform owner's real inbox.
// Reuses INBOUND_FORWARD_TO (same env that the inbound-router uses to forward
// admin-bound mail). Sending here directly avoids a Resend Inbound round-trip,
// which is unreliable when the To: address shares a domain with our outbound
// sender (Resend can short-circuit "send-to-own-inbound" loops and silently
// drop the message).

const contactSchema = z.object({
  name: z.string().trim().max(120).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Neteisingas el. pašto formatas")
    .max(160)
    .optional()
    .or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(10, "Žinutė per trumpa (mažiausiai 10 simbolių)")
    .max(4000, "Žinutė per ilga (daugiausiai 4000 simbolių)"),
  // Honeypot — schema accepts anything (bounded), the runtime check below
  // silently drops filled values so bots don't learn the trap.
  website: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Neteisinga užklausa" },
        { status: 400 },
      );
    }

    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            parsed.error.issues[0]?.message || "Patikrinkite užpildytus laukus",
        },
        { status: 400 },
      );
    }

    const { name, email, message, website } = parsed.data;

    // Honeypot tripped — pretend success so bots don't probe for the trap.
    if (website && website.length > 0) {
      return NextResponse.json({ success: true });
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;
    const sessionEmail = session?.user?.email ?? null;
    const sessionName = session?.user?.name ?? null;

    const senderEmail = (sessionEmail || email || "").trim();
    const senderName = (sessionName || name || "").trim() || "Anonimas";

    if (!senderEmail) {
      return NextResponse.json(
        { success: false, error: "El. pašto adresas privalomas" },
        { status: 400 },
      );
    }

    // 5 sends/hour per user (logged in) or per IP (guest).
    const ip = getClientIp(req);
    const rlKey = userId ? `contact:u:${userId}` : `contact:ip:${ip}`;
    const rl = await rateLimitAsync(rlKey, {
      maxRequests: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.success) {
      return NextResponse.json(
        { success: false, error: "Per daug žinučių. Pabandykite vėliau." },
        { status: 429 },
      );
    }

    const safeName = sanitizeHtml(senderName);
    const safeEmail = sanitizeHtml(senderEmail);
    const safeMessage = sanitizeHtml(message);
    const safeUserId = userId ? sanitizeHtml(userId) : null;

    const subject = `Kontaktų forma: ${senderName}`;
    const html = `
      <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 16px; color: #1f2937;">
        <h2 style="color: #6b3a1d; margin: 0 0 16px;">Nauja žinutė per kontaktų formą</h2>
        <table style="border-collapse: collapse; width: 100%; font-size: 14px;">
          <tr>
            <td style="padding: 6px 12px 6px 0; color: #6b7280; vertical-align: top;">Vardas</td>
            <td style="padding: 6px 0;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding: 6px 12px 6px 0; color: #6b7280; vertical-align: top;">El. paštas</td>
            <td style="padding: 6px 0;"><a href="mailto:${safeEmail}" style="color: #6b3a1d;">${safeEmail}</a></td>
          </tr>
          <tr>
            <td style="padding: 6px 12px 6px 0; color: #6b7280; vertical-align: top;">Vartotojas</td>
            <td style="padding: 6px 0;">${safeUserId ? `Prisijungęs (ID: ${safeUserId})` : "Svečias"}</td>
          </tr>
        </table>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;"/>
        <div style="white-space: pre-wrap; line-height: 1.5; font-size: 14px;">${safeMessage}</div>
      </div>
    `;

    const contactTo = process.env.INBOUND_FORWARD_TO?.trim();
    if (!contactTo) {
      console.error("Contact form: INBOUND_FORWARD_TO not configured");
      return NextResponse.json(
        { success: false, error: "Forma šiuo metu nepasiekiama. Pabandykite vėliau." },
        { status: 503 },
      );
    }

    const result = await sendEmail({
      to: contactTo,
      subject,
      html,
      replyTo: senderEmail,
    });

    if (!result.success) {
      console.error("Contact form: nepavyko išsiųsti žinutės", result.error);
      return NextResponse.json(
        {
          success: false,
          error: "Nepavyko išsiųsti žinutės. Pabandykite vėliau.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      { success: false, error: "Įvyko klaida" },
      { status: 500 },
    );
  }
}
