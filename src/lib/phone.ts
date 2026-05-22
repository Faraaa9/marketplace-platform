const E164_RE = /^\+[1-9]\d{7,14}$/;

export function normalizePhoneNumber(value: string): string | null {
  const compact = value.trim().replace(/[\s().-]/g, "");
  if (!compact) return null;

  let phone = compact;
  if (phone.startsWith("00")) phone = `+${phone.slice(2)}`;
  if (/^8\d{8}$/.test(phone)) phone = `+370${phone.slice(1)}`;
  if (/^6\d{7}$/.test(phone)) phone = `+370${phone}`;
  if (/^370\d{8}$/.test(phone)) phone = `+${phone}`;

  return E164_RE.test(phone) ? phone : null;
}

export function maskPhoneNumber(phone: string): string {
  const normalized = normalizePhoneNumber(phone) ?? phone.trim();
  if (normalized.length <= 7) return normalized;
  return `${normalized.slice(0, 4)}***${normalized.slice(-3)}`;
}
