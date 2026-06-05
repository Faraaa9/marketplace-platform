import { prisma } from "@/lib/prisma";
import { normalizePhoneNumber } from "@/lib/phone";

// Telegram-verified accounts have no email, but User.email is NOT NULL + unique.
// We mint a deterministic placeholder on a subdomain we never send mail to, so
// the address is stable, collision-free, and safe to detect-and-skip before any
// Resend delivery. Callers should treat a placeholder as "no real email".
const TELEGRAM_EMAIL_DOMAIN = "telegram.paslaugurinka.lt";

function placeholderEmailForPhone(normalizedPhone: string): string {
  const digits = normalizedPhone.replace(/\D/g, "");
  return `tg-${digits}@${TELEGRAM_EMAIL_DOMAIN}`;
}

function placeholderEmailForTelegramId(telegramUserId: bigint): string {
  return `tgid-${telegramUserId.toString()}@${TELEGRAM_EMAIL_DOMAIN}`;
}

export function isPlaceholderTelegramEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase().endsWith(`@${TELEGRAM_EMAIL_DOMAIN}`);
}

/**
 * Resolve the User behind a Telegram-verified phone number. Telegram has already
 * confirmed ownership, so a freshly created account is marked phone-verified.
 *
 * This is the ONLY place the bot writes to the User table.
 *
 * @returns the user id and their real email, or `null` email when the account
 *   carries only a placeholder address (so callers don't attempt to mail it).
 */
export async function findOrCreateUserByPhone(
  phone: string,
  name?: string,
  preferredUserId?: string | null,
): Promise<{ userId: string; email: string | null }> {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    throw new Error("findOrCreateUserByPhone: invalid phone number");
  }

  const existing = await prisma.user.findFirst({
    where: { phone: normalized },
    select: { id: true, email: true },
  });
  if (existing) {
    return {
      userId: existing.id,
      email: isPlaceholderTelegramEmail(existing.email) ? null : existing.email,
    };
  }

  if (preferredUserId) {
    const updated = await prisma.user.update({
      where: { id: preferredUserId },
      data: {
        phone: normalized,
        phoneVerifiedAt: new Date(),
        name: name?.trim() || undefined,
      },
      select: { id: true, email: true },
    });
    return {
      userId: updated.id,
      email: isPlaceholderTelegramEmail(updated.email) ? null : updated.email,
    };
  }

  const created = await prisma.user.create({
    data: {
      email: placeholderEmailForPhone(normalized),
      name: name?.trim() || null,
      role: "CLIENT",
      phone: normalized,
      phoneVerifiedAt: new Date(),
    },
    select: { id: true },
  });

  return { userId: created.id, email: null };
}

export async function findOrCreateUserByTelegramId(
  telegramUserId: bigint,
  name?: string,
): Promise<{ userId: string }> {
  const existingSession = await prisma.telegramSession.findUnique({
    where: { telegramUserId },
    select: { userId: true },
  });
  if (existingSession?.userId) {
    return { userId: existingSession.userId };
  }

  const email = placeholderEmailForTelegramId(telegramUserId);
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: name?.trim() || null,
      role: "CLIENT",
    },
    update: {
      name: name?.trim() || undefined,
    },
    select: { id: true },
  });

  return { userId: user.id };
}
