import fs from "fs";
import path from "path";
import { getEmailDeliverySettings } from "@/lib/platform-settings";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
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

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<SendEmailResult> {
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
  if (process.env.NODE_ENV === "production" && emailFrom.includes("resend.dev")) {
    console.warn(
      "[email] EMAIL_FROM not set — using the Resend test domain, which only " +
        "delivers to the Resend account owner. Set EMAIL_FROM to an address on " +
        "a verified domain.",
    );
  }
  const emailReplyTo = process.env.EMAIL_REPLY_TO?.trim() || readEnvFileValue("EMAIL_REPLY_TO")?.trim();

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
        ...(emailReplyTo ? { reply_to: emailReplyTo } : {}),
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
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/uzklausos/sekti/${trackingToken}`;
  return {
    subject: "Jūsų užklausa gauta — PaslaugųRinka",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Sveiki, ${name}!</h2>
        <p>Jūsų užklausa sėkmingai pateikta. Paslaugų tiekėjai netrukus peržiūrės ją ir atsiųs pasiūlymus.</p>
        <p><a href="${url}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Sekti užklausą</a></p>
        <p style="color: #6b7280; font-size: 14px;">Išsaugokite šią nuorodą — ji leidžia sekti jūsų užklausos būseną.</p>
      </div>
    `,
  };
}

export function requestVerificationEmail(name: string, verificationToken: string, trackingToken: string) {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/requests/verify?token=${verificationToken}`;
  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/uzklausos/sekti/${trackingToken}`;
  return {
    subject: "Patvirtinkite užklausą — PaslaugųRinka",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Sveiki, ${name}!</h2>
        <p>Dar liko vienas žingsnis: patvirtinkite savo el. pašto adresą, kad aktyvuotume jūsų užklausą ir perduotume ją paslaugų tiekėjams.</p>
        <p><a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Patvirtinti užklausą</a></p>
        <p style="color: #6b7280; font-size: 14px;">Nuoroda galioja 24 valandas.</p>
        <p style="color: #6b7280; font-size: 14px;">Jei norite tik peržiūrėti užklausą, naudokite šią nuorodą: <a href="${trackingUrl}">sekti užklausą</a>.</p>
      </div>
    `,
  };
}

export function newResponseEmail(clientName: string, requestTitle: string, trackingToken: string) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/uzklausos/sekti/${trackingToken}`;
  return {
    subject: `Naujas pasiūlymas: ${requestTitle} — PaslaugųRinka`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Sveiki, ${clientName}!</h2>
        <p>Gavote naują pasiūlymą dėl jūsų užklausos „${requestTitle}".</p>
        <p><a href="${url}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Peržiūrėti pasiūlymą</a></p>
      </div>
    `,
  };
}

export function newRequestAlertEmail(providerName: string, requestTitle: string, category: string) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/tiekejas/uzklausos`;
  return {
    subject: `Nauja užklausa: ${requestTitle} — PaslaugųRinka`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Sveiki, ${providerName}!</h2>
        <p>Atsirado nauja užklausa kategorijoje „${category}": <strong>${requestTitle}</strong></p>
        <p><a href="${url}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Peržiūrėti užklausas</a></p>
      </div>
    `,
  };
}

export function providerActivatedEmail(name: string) {
  return {
    subject: "Jūsų paskyra aktyvuota — PaslaugųRinka",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Sveiki, ${name}!</h2>
        <p>Jūsų tiekėjo paskyra buvo aktyvuota. Dabar galite peržiūrėti ir atsakyti į klientų užklausas.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/tiekejas" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Eiti į valdymo panelę</a></p>
      </div>
    `,
  };
}

export function passwordResetEmail(name: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/slaptazodis/reset?token=${token}`;
  return {
    subject: "Slaptažodžio atstatymas — PaslaugųRinka",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Sveiki, ${name}!</h2>
        <p>Gavome jūsų prašymą atstatyti slaptažodį. Spauskite žemiau esantį mygtuką:</p>
        <p><a href="${url}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 12px;">Atstatyti slaptažodį</a></p>
        <p style="color: #6b7280; font-size: 14px;">Ši nuoroda galioja 1 valandą. Jei neprašėte atstatyti slaptažodžio, ignoruokite šį laišką.</p>
      </div>
    `,
  };
}

export function emailVerificationEmail(name: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/verify-email?token=${token}`;
  return {
    subject: "Patvirtinkite el. paštą — PaslaugųRinka",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4f46e5;">Sveiki, ${name}!</h2>
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

// ── Claim emails (Lithuanian) ────────────────────────────────────────

export function claimVerificationEmail(supplierName: string, verifyUrl: string) {
  return {
    subject: `Patvirtinkite savo prašymą perimti „${supplierName}" — PaslaugųRinka`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Tiekėjo perėmimo užklausa</h2>
        <p>Gavome jūsų prašymą perimti tiekėjo <strong>„${supplierName}"</strong> paskyrą.</p>
        <p>Patvirtinkite savo el. pašto adresą spausdami žemiau esantį mygtuką:</p>
        <p><a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Patvirtinti el. paštą</a></p>
        <p style="color: #6b7280; font-size: 14px;">Nuoroda galioja 7 dienas. Po paspaudimo galėsite susikurti prisijungimą su slaptažodžiu. Administratorius atskirai peržiūrės patį profilio perėmimą.</p>
        <p style="color: #6b7280; font-size: 14px;">Jei šio prašymo nepateikėte, ignoruokite šį laišką.</p>
      </div>
    `,
  };
}

export function claimApprovedEmail(supplierName: string, dashboardUrl: string, registerUrl?: string) {
  const accountHelp = registerUrl
    ? `<p style="color: #6b7280; font-size: 14px;">Jei dar neturite paskyros, susikurkite ją tuo pačiu el. paštu: <a href="${registerUrl}">sukurti paskyrą</a>.</p>`
    : "";

  return {
    subject: `Jūsų prašymas patvirtintas — „${supplierName}" — PaslaugųRinka`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Prašymas patvirtintas!</h2>
        <p>Jūsų prašymas perimti tiekėjo <strong>„${supplierName}"</strong> paskyrą buvo patvirtintas.</p>
        <p>Prisijunkite tuo pačiu el. paštu ir galėsite valdyti savo tiekėjo profilį:</p>
        <p><a href="${dashboardUrl}" style="display: inline-block; padding: 12px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 8px;">Eiti į valdymo panelę</a></p>
        ${accountHelp}
      </div>
    `,
  };
}

export function claimRejectedEmail(supplierName: string, reason?: string) {
  const reasonBlock = reason
    ? `<p><strong>Priežastis:</strong> ${reason}</p>`
    : `<p>Jei turite klausimų, susisiekite su mumis.</p>`;
  return {
    subject: `Jūsų prašymas atmestas — „${supplierName}" — PaslaugųRinka`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Prašymas atmestas</h2>
        <p>Deja, jūsų prašymas perimti tiekėjo <strong>„${supplierName}"</strong> paskyrą buvo atmestas.</p>
        ${reasonBlock}
        <p style="color: #6b7280; font-size: 14px;">Jei manote, kad tai klaida, galite pateikti naują prašymą arba susisiekti su mumis el. paštu.</p>
      </div>
    `,
  };
}

export function subscriptionConfirmationEmail(name: string, plan: string) {
  return {
    subject: `${plan} planas aktyvuotas — PaslaugųRinka`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Sveiki, ${name}!</h2>
        <p>Jūsų <strong>${plan}</strong> planas sėkmingai aktyvuotas. Dabar galite naudotis visomis plano galimybėmis.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/tiekejas/planai" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Peržiūrėti planą</a></p>
      </div>
    `,
  };
}
