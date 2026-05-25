// Presence helpers driven by User.lastSeenAt, which is refreshed by the
// NextAuth jwt callback (throttled to once per minute).

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
const RECENT_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export type PresenceLevel = "online" | "recent" | null;

function toTimestamp(value: Date | string | null | undefined): number | null {
  if (!value) return null;
  const t = typeof value === "string" ? new Date(value).getTime() : value.getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * 3-tier presence used by listing cards:
 *   - 'online' → green dot, active in last 5 min
 *   - 'recent' → neutral gray dot, active in last 24h
 *   - null     → no dot
 */
export function getPresenceLevel(
  lastSeenAt: Date | string | null | undefined,
  now: number = Date.now(),
): PresenceLevel {
  const last = toTimestamp(lastSeenAt);
  if (last === null) return null;
  const diff = now - last;
  if (diff < ONLINE_THRESHOLD_MS) return "online";
  if (diff < RECENT_THRESHOLD_MS) return "recent";
  return null;
}

export function isOnline(lastSeenAt: Date | string | null | undefined, now: number = Date.now()): boolean {
  return getPresenceLevel(lastSeenAt, now) === "online";
}

/**
 * Lithuanian relative last-seen label. Returns null when we have no signal
 * (so the caller can hide the pill entirely).
 */
export function formatLastSeen(
  lastSeenAt: Date | string | null | undefined,
  now: number = Date.now(),
): string | null {
  const last = toTimestamp(lastSeenAt);
  if (last === null) return null;

  const diffMs = Math.max(0, now - last);
  if (diffMs < ONLINE_THRESHOLD_MS) return "Prisijungęs dabar";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `Prisijungęs prieš ${minutes} min.`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Prisijungęs prieš ${hours} ${hourWord(hours)}`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `Prisijungęs prieš ${days} ${dayWord(days)}`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `Prisijungęs prieš ${weeks} ${weekWord(weeks)}`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `Prisijungęs prieš ${months} ${monthWord(months)}`;
  }
  return "Prisijungęs seniai";
}

// Lithuanian noun forms for 1 / 2-9 / 10+ (and 11-19 follow the 10+ rule).
function ltForm(n: number, one: string, few: string, many: string): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 9) return few;
  return many;
}

const hourWord = (n: number) => ltForm(n, "valandą", "valandas", "valandų");
const dayWord = (n: number) => ltForm(n, "dieną", "dienas", "dienų");
const weekWord = (n: number) => ltForm(n, "savaitę", "savaites", "savaičių");
const monthWord = (n: number) => ltForm(n, "mėnesį", "mėnesius", "mėnesių");
