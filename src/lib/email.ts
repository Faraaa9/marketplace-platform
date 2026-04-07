// TODO: Configure RESEND_API_KEY in .env.local
const RESEND_API_KEY = process.env.RESEND_API_KEY;

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!RESEND_API_KEY) {
    console.warn("WARNING: RESEND_API_KEY not set — email will not be sent");
    console.log(`[Email Mock] To: ${to}, Subject: ${subject}`);
    return { success: true, mock: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "PaslaugųRinka <noreply@paslaugurinka.lt>",
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Email send failed:", error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error };
  }
}

export function requestConfirmationEmail(name: string, requestId: string) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/uzklausos/sekti/${requestId}`;
  return {
    subject: "Jūsų užklausa gauta — PaslaugųRinka",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Sveiki, ${name}!</h2>
        <p>Jūsų užklausa sėkmingai pateikta. Paslaugų tiekėjai netrukus peržiūrės ją ir atsiųs pasiūlymus.</p>
        <p><a href="${url}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Sekti užklausą</a></p>
        <p style="color: #6b7280; font-size: 14px;">Jūsų užklausos ID: ${requestId}</p>
      </div>
    `,
  };
}

export function newResponseEmail(clientName: string, requestTitle: string, requestId: string) {
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/uzklausos/sekti/${requestId}`;
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
  const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/tiekėjas/uzklausos`;
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
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/tiekėjas" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Eiti į valdymo panelę</a></p>
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
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/tiekėjas/planai" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Peržiūrėti planą</a></p>
      </div>
    `,
  };
}
