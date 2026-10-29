import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getEmailDeliverySettings } from "@/lib/platform-settings";
import { creditsLabel, decodeHtmlEntities } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize";

/**
 * HTML-escape a value for an email template. Decodes first because request
 * titles are stored already escaped (sanitizeHtml at write time) — escaping
 * twice would show "&amp;amp;" to the reader.
 */
export function escapeEmailHtml(value: string): string {
  return sanitizeHtml(decodeHtmlEntities(value));
}
const esc = escapeEmailHtml;

// Vercel previews also run NODE_ENV=production but get no mail env vars; only
// the real production deployment must fail loudly.
const isProduction = () =>
  process.env.VERCEL_ENV ? process.env.VERCEL_ENV === "production" : process.env.NODE_ENV === "production";

/** Public site origin for links. A localhost link in a real customer's inbox is
 *  a silent failure, so production refuses to guess. */
export function appUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  if (isProduction()) throw new Error("NEXT_PUBLIC_APP_URL is not set — refusing to email localhost links");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

// ── Unsubscribe (non-essential mail only: new-lead alerts) ──────────────
// Stateless HMAC link so it works without logging in and needs no token table.
function unsubscribeSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (secret) return secret;
  // Previews share the production DB, so a guessable secret there would let
  // anyone forge opt-outs for real providers. Only a local run may fall back.
  if (isProduction() || process.env.VERCEL_ENV) throw new Error("NEXTAUTH_SECRET is not set");
  return "development-unsubscribe-secret";
}

export function unsubscribeToken(userId: string): string {
  return crypto.createHmac("sha256", unsubscribeSecret()).update(`unsubscribe:${userId}`).digest("hex").slice(0, 32);
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const expected = Buffer.from(unsubscribeToken(userId));
  const given = Buffer.from(token);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

export function unsubscribeUrl(userId: string): string {
  return `${appUrl()}/api/email/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  /** Per-call Reply-To override. Falls back to the EMAIL_REPLY_TO env when unset. */
  replyTo?: string;
  /** Set for non-essential mail: adds List-Unsubscribe + one-click headers. */
  unsubscribeUrl?: string;
}

export interface SendEmailResult {
  success: boolean;
  mock?: boolean;
  suppressed?: boolean;
  error?: unknown;
}

// In-memory store for dev email preview (only used when RESEND_API_KEY is not set)
const devEmailLog: Array<{ to: string; subject: string; html: string; sentAt: string }> = [];
const DEV_EMAIL_LOG_MAX = 20;

export function getDevEmailLog() {
  return devEmailLog;
}

function maskToken(token: string) {
  if (token.length <= 8) {
    return token;
  }

  return `${token.slice(0, 5)}...${token.slice(-4)}`;
}

function readEnvFileValue(name: string) {
  if (process.env.NODE_ENV === "production") {
    return undefined;
  }

  try {
    const envLocalPath = path.join(process.cwd(), ".env.local");
    const raw = fs.readFileSync(envLocalPath, "utf8");
    const line = raw
      .split(/\r?\n/)
      .find((entry) => entry.startsWith(`${name}=`));

    if (!line) {
      return undefined;
    }

    let value = line.slice(name.length + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    return value || undefined;
  } catch {
    return undefined;
  }
}

export async function sendEmail({ to, subject, html, replyTo, unsubscribeUrl: listUnsubscribe }: SendEmailParams): Promise<SendEmailResult> {
  // Email test mode: when enabled in admin settings, outbound mail reaches only
  // allowlisted addresses. Shields real clients from dev/test traffic.
  try {
    const { emailTestMode, emailAllowlist } = await getEmailDeliverySettings();
    if (emailTestMode) {
      const recipient = to.trim().toLowerCase();
      const allowed = emailAllowlist.some(
        (entry) => entry.trim().toLowerCase() === recipient,
      );
      if (!allowed) {
        console.log(
          `[Email] Testavimo režimas — laiškas praleistas (gavėjas ne sąraše): ${to} | ${subject}`,
        );
        devEmailLog.unshift({ to, subject, html, sentAt: new Date().toISOString() });
        if (devEmailLog.length > DEV_EMAIL_LOG_MAX) devEmailLog.length = DEV_EMAIL_LOG_MAX;
        return { success: true, suppressed: true };
      }
    }
  } catch (error) {
    // Fail open: a settings-read failure must not silently drop all email.
    console.error("[Email] Nepavyko patikrinti testavimo režimo:", error);
  }

  const runtimeResendApiKey = process.env.RESEND_API_KEY?.trim();
  const resendApiKey =
    !runtimeResendApiKey || runtimeResendApiKey.includes("placeholder")
      ? readEnvFileValue("RESEND_API_KEY")?.trim() || runtimeResendApiKey
      : runtimeResendApiKey;
  const runtimeEmailFrom = process.env.EMAIL_FROM?.trim();
  const emailFrom =
    runtimeEmailFrom || readEnvFileValue("EMAIL_FROM")?.trim() || "PaslaugųRinka <onboarding@resend.dev>";
  // The Resend test domain only delivers to the account owner, and a missing key
  // used to "succeed" as a mock — both silently drop real customers' mail.
  if (isProduction() && (!resendApiKey || emailFrom.includes("resend.dev"))) {
    console.error(
      `[email] NOT SENT to ${to}: ${!resendApiKey ? "RESEND_API_KEY" : "EMAIL_FROM (verified domain)"} is not configured`,
    );
    return { success: false, error: "Email is not configured" };
  }
  const emailReplyTo = process.env.EMAIL_REPLY_TO?.trim() || readEnvFileValue("EMAIL_REPLY_TO")?.trim();
  const effectiveReplyTo = replyTo?.trim() || emailReplyTo;

  if (!resendApiKey) {
    console.warn("WARNING: RESEND_API_KEY not set — email will not be sent");
    console.log(`[Email Mock] To: ${to}, Subject: ${subject}`);

    // Extract and log action URLs so developers can click them
    const urlMatches = html.match(/href="([^"]+)"/g);
    if (urlMatches) {
      const urls = urlMatches.map((m) => m.replace(/href="([^"]+)"/, "$1"));
      urls.forEach((url) => console.log(`[Email Mock] Action URL: ${url}`));
    }

    // Store in dev log for preview endpoint
    devEmailLog.unshift({ to, subject, html, sentAt: new Date().toISOString() });
    if (devEmailLog.length > DEV_EMAIL_LOG_MAX) devEmailLog.length = DEV_EMAIL_LOG_MAX;

    return { success: true, mock: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "MarketplacePlatform/1.0",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: emailFrom,
        to,
        subject,
        html,
        ...(effectiveReplyTo ? { reply_to: effectiveReplyTo } : {}),
        ...(listUnsubscribe
          ? {
              headers: {
                "List-Unsubscribe": `<${listUnsubscribe}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            }
          : {}),
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Email send failed:", error);
      if (process.env.NODE_ENV !== "production" && res.status === 401) {
        console.error("Resend auth debug:", {
          key: resendApiKey ? maskToken(resendApiKey) : null,
          keyLength: resendApiKey?.length ?? 0,
          from: emailFrom,
        });
      }
      let friendlyError: unknown = error;
      if (res.status === 403 && error.includes("resend.dev")) {
        friendlyError = "Resend test domenas gali siųsti tik į jūsų pačių el. paštą. Norint siųsti kitiems gavėjams, reikia patvirtinto domeno ir EMAIL_FROM adreso iš to domeno.";
      }
      return { success: false, error: friendlyError };
    }

    return { success: true };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

export function requestConfirmationEmail(name: string, trackingToken: string) {
  const url = `${appUrl()}/uzklausos/sekti/${trackingToken}`;
  return {
    subject: "Jūsų užklausa gauta — PaslaugųRinka",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Sveiki, ${esc(name)}!</h2>
        <p>Jūsų užklausa sėkmingai pateikta. Paslaugų tiekėjai netrukus peržiūrės ją ir atsiųs pasiūlymus.</p>
        <p><a href="${url}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Sekti užklausą</a></p>
        <p style="color: #6b7280; font-size: 14px;">Išsaugokite šią nuorodą — ji leidžia sekti jūsų užklausos būseną.</p>
      </div>
    `,
  };
}

export function requestVerificationEmail(name: string, verificationToken: string, trackingToken: string) {
  const verifyUrl = `${appUrl()}/api/requests/verify?token=${verificationToken}`;
  const trackingUrl = `${appUrl()}/uzklausos/sekti/${trackingToken}`;
  return {
    subject: "Patvirtinkite užklausą — PaslaugųRinka",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Sveiki, ${esc(name)}!</h2>
        <p>Dar liko vienas žingsnis: patvirtinkite savo el. pašto adresą, kad aktyvuotume jūsų užklausą ir perduotume ją paslaugų tiekėjams.</p>
        <p><a href="${esc(verifyUrl)}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Patvirtinti užklausą</a></p>
        <p style="color: #6b7280; font-size: 14px;">Nuoroda galioja 24 valandas.</p>
        <p style="color: #6b7280; font-size: 14px;">Jei norite tik peržiūrėti užklausą, naudokite šią nuorodą: <a href="${trackingUrl}">sekti užklausą</a>.</p>
      </div>
    `,
  };
}

export function newResponseEmail(clientName: string, requestTitle: string, trackingToken: string) {
  const url = `${appUrl()}/uzklausos/sekti/${trackingToken}`;
  return {
    subject: `Naujas pasiūlymas: ${decodeHtmlEntities(requestTitle)} — PaslaugųRinka`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Sveiki, ${esc(clientName)}!</h2>
        <p>Gavote naują pasiūlymą dėl jūsų užklausos „${esc(requestTitle)}".</p>
        <p><a href="${url}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Peržiūrėti pasiūlymą</a></p>
      </div>
    `,
  };
}

export function newRequestAlertEmail(
  providerName: string,
  requestTitle: string,
  category: string,
  unsubscribeLink: string,
) {
  const url = `${appUrl()}/uzklausos`;
  return {
    subject: `Nauja užklausa: ${decodeHtmlEntities(requestTitle)} — PaslaugųRinka`,
    unsubscribeUrl: unsubscribeLink,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Sveiki, ${esc(providerName)}!</h2>
        <p>Atsirado nauja užklausa kategorijoje „${esc(category)}": <strong>${esc(requestTitle)}</strong></p>
        <p><a href="${url}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Peržiūrėti užklausas</a></p>
        <p style="color: #6b7280; font-size: 12px;">Nebenorite gauti laiškų apie naujas užklausas? <a href="${esc(unsubscribeLink)}">Atsisakyti</a></p>
      </div>
    `,
  };
}

/** Sent once per customer per expiry run, listing every request of theirs that
 *  expired (some customers have a dozen). A service notice about their own
 *  requests, so no unsubscribe link. */
export function requestExpiredEmail(
  clientName: string,
  requests: { title: string; trackingToken: string }[],
  days: number,
) {
  const newUrl = `${appUrl()}/uzklausos/nauja`;
  const button = (token: string, label: string) =>
    `<a href="${appUrl()}/uzklausos/sekti/${token}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">${label}</a>`;
  const single = requests.length === 1;
  const subject = single
    ? `Jūsų užklausa „${decodeHtmlEntities(requests[0].title)}" nebegalioja — PaslaugųRinka`
    : `Jūsų ${requests.length} užklausos nebegalioja — PaslaugųRinka`;
  const body = single
    ? `<p>Jūsų užklausa „${esc(requests[0].title)}" per ${days} dienų nesulaukė naujų pasiūlymų, todėl ją uždarėme — meistrai nebegali siųsti naujų pasiūlymų.</p>
        <p>Jei paslaugos vis dar reikia, užklausą galite atnaujinti — meistrai vėl galės siųsti pasiūlymus.</p>
        <p>${button(requests[0].trackingToken, "Atnaujinti užklausą")}</p>`
    : `<p>Šios jūsų užklausos per ${days} dienų nesulaukė naujų pasiūlymų, todėl jas uždarėme — meistrai nebegali siųsti naujų pasiūlymų:</p>
        <ul>${requests
          .map((r) => `<li style="margin-bottom: 8px;">${esc(r.title)} — <a href="${appUrl()}/uzklausos/sekti/${r.trackingToken}">atnaujinti</a></li>`)
          .join("")}</ul>
        <p>Jei kurios nors paslaugos vis dar reikia, atidarykite ją ir paspauskite „Atnaujinti užklausą“.</p>`;
  return {
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Sveiki, ${esc(clientName)}!</h2>
        ${body}
        <p style="color: #6b7280; font-size: 14px;">Arba <a href="${newUrl}">pateikite naują užklausą</a> — kartais padeda tikslesnis aprašymas ar kita kategorija. Jei paslaugos nebereikia, nieko daryti nereikia.</p>
      </div>
    `,
  };
}

export function providerActivatedEmail(name: string) {
  return {
    subject: "Jūsų paskyra aktyvuota — PaslaugųRinka",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Sveiki, ${esc(name)}!</h2>
        <p>Jūsų tiekėjo paskyra buvo aktyvuota. Dabar galite peržiūrėti ir atsakyti į klientų užklausas.</p>
        <p><a href="${appUrl()}/tiekejas" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Eiti į valdymo panelę</a></p>
      </div>
    `,
  };
}

export function passwordResetEmail(name: string, token: string) {
  const url = `${appUrl()}/slaptazodis/reset?token=${token}`;
  return {
    subject: "Slaptažodžio atstatymas — PaslaugųRinka",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Sveiki, ${esc(name)}!</h2>
        <p>Gavome jūsų prašymą atstatyti slaptažodį. Spauskite žemiau esantį mygtuką:</p>
        <p><a href="${url}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 12px;">Atstatyti slaptažodį</a></p>
        <p style="color: #6b7280; font-size: 14px;">Ši nuoroda galioja 1 valandą. Jei neprašėte atstatyti slaptažodžio, ignoruokite šį laišką.</p>
      </div>
    `,
  };
}

export function emailVerificationEmail(name: string, token: string) {
  const url = `${appUrl()}/api/auth/verify-email?token=${token}`;
  return {
    subject: "Patvirtinkite el. paštą — PaslaugųRinka",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Sveiki, ${esc(name)}!</h2>
        <p>Dėkojame už registraciją. Patvirtinkite savo el. pašto adresą spausdami žemiau:</p>
        <p><a href="${url}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 12px;">Patvirtinti el. paštą</a></p>
        <p style="color: #6b7280; font-size: 14px;">Ši nuoroda galioja 24 valandas.</p>
      </div>
    `,
  };
}

export function directInquiryVerificationEmail(code: string) {
  return {
    subject: `${code} — jūsų patvirtinimo kodas — PaslaugųRinka`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Jūsų patvirtinimo kodas</h2>
        <p>Naudokite šį kodą, kad patvirtintumėte savo žinutę tiekėjui:</p>
        <div style="margin: 24px 0; text-align: center;">
          <span style="display: inline-block; padding: 16px 32px; background: #f3f4f6; border-radius: 12px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111827;">${code}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Kodas galioja 10 minučių. Jei neprašėte šio kodo, ignoruokite šį laišką.</p>
      </div>
    `,
  };
}

export function requestCodeVerificationEmail(code: string) {
  return {
    subject: `${code} — patvirtinimo kodas užklausai — PaslaugųRinka`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Jūsų patvirtinimo kodas</h2>
        <p>Įveskite šį kodą peržiūros lange, kad patvirtintumėte el. paštą ir paskelbtumėte savo užklausą:</p>
        <div style="margin: 24px 0; text-align: center;">
          <span style="display: inline-block; padding: 16px 32px; background: #f3f4f6; border-radius: 12px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111827;">${code}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Kodas galioja 10 minučių. Jei neprašėte šio kodo, ignoruokite šį laišką.</p>
      </div>
    `,
  };
}

export function changeEmailVerificationEmail(code: string) {
  return {
    subject: `${code} — patvirtinkite naują el. paštą — PaslaugųRinka`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Patvirtinkite naują el. paštą</h2>
        <p>Gavome prašymą pakeisti jūsų paskyros el. paštą į šį adresą. Įveskite šį kodą profilio lange, kad pakeitimą užbaigtumėte:</p>
        <div style="margin: 24px 0; text-align: center;">
          <span style="display: inline-block; padding: 16px 32px; background: #f3f4f6; border-radius: 12px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111827;">${code}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Kodas galioja 10 minučių. Jei neprašėte el. pašto pakeitimo, ignoruokite šį laišką — jūsų paskyra liks nepakeista.</p>
      </div>
    `,
  };
}

// ── Claim emails (Lithuanian) ────────────────────────────────────────

export function claimVerificationEmail(supplierName: string, verifyUrl: string) {
  return {
    subject: `Patvirtinkite savo prašymą perimti „${supplierName}" — PaslaugųRinka`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Tiekėjo perėmimo užklausa</h2>
        <p>Gavome jūsų prašymą perimti tiekėjo <strong>„${esc(supplierName)}"</strong> paskyrą.</p>
        <p>Patvirtinkite savo el. pašto adresą spausdami žemiau esantį mygtuką:</p>
        <p><a href="${esc(verifyUrl)}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Patvirtinti el. paštą</a></p>
        <p style="color: #6b7280; font-size: 14px;">Nuoroda galioja 7 dienas. Po paspaudimo galėsite susikurti prisijungimą su slaptažodžiu. Administratorius atskirai peržiūrės patį profilio perėmimą.</p>
        <p style="color: #6b7280; font-size: 14px;">Jei šio prašymo nepateikėte, ignoruokite šį laišką.</p>
      </div>
    `,
  };
}

export function claimApprovedEmail(supplierName: string, dashboardUrl: string, registerUrl?: string) {
  const accountHelp = registerUrl
    ? `<p style="color: #6b7280; font-size: 14px;">Jei dar neturite paskyros, susikurkite ją tuo pačiu el. paštu: <a href="${esc(registerUrl)}">sukurti paskyrą</a>.</p>`
    : "";

  return {
    subject: `Jūsų prašymas patvirtintas — „${supplierName}" — PaslaugųRinka`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Prašymas patvirtintas!</h2>
        <p>Jūsų prašymas perimti tiekėjo <strong>„${esc(supplierName)}"</strong> paskyrą buvo patvirtintas.</p>
        <p>Prisijunkite tuo pačiu el. paštu ir galėsite valdyti savo tiekėjo profilį:</p>
        <p><a href="${esc(dashboardUrl)}" style="display: inline-block; padding: 12px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 8px;">Eiti į valdymo panelę</a></p>
        ${accountHelp}
      </div>
    `,
  };
}

export function claimRejectedEmail(supplierName: string, reason?: string) {
  const reasonBlock = reason
    ? `<p><strong>Priežastis:</strong> ${esc(reason)}</p>`
    : `<p>Jei turite klausimų, susisiekite su mumis.</p>`;
  return {
    subject: `Jūsų prašymas atmestas — „${supplierName}" — PaslaugųRinka`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Prašymas atmestas</h2>
        <p>Deja, jūsų prašymas perimti tiekėjo <strong>„${esc(supplierName)}"</strong> paskyrą buvo atmestas.</p>
        ${reasonBlock}
        <p style="color: #6b7280; font-size: 14px;">Jei manote, kad tai klaida, galite pateikti naują prašymą arba susisiekti su mumis el. paštu.</p>
      </div>
    `,
  };
}

export function creditPurchaseEmail(name: string, credits: number, balance: number) {
  return {
    subject: "Kreditai pridėti — PaslaugųRinka",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Sveiki, ${esc(name)}!</h2>
        <p>Jūsų paskyrą papildėme <strong>${credits} ${creditsLabel(credits)}</strong>.</p>
        <p>Dabartinis balansas: <strong>${balance} ${creditsLabel(balance)}</strong>.</p>
        <p>Kreditus naudokite klientų užklausoms atrakinti — vienas kreditas atrakina vieną užklausą.</p>
        <p><a href="${appUrl()}/uzklausos" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Peržiūrėti užklausas</a></p>
      </div>
    `,
  };
}
