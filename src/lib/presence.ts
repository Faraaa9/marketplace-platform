// Presence helpers driven by User.lastSeenAt, which is refreshed by the
// NextAuth jwt callback (throttled to once per minute).

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

export function isOnline(lastSeenAt: Date | string | null | undefined, now: number = Date.now()): boolean {
  if (!lastSeenAt) return false;
  const last = typeof lastSeenAt === "string" ? new Date(lastSeenAt).getTime() : lastSeenAt.getTime();
  if (Number.isNaN(last)) return false;
  return now - last < ONLINE_THRESHOLD_MS;
}

/**
 * Lithuanian relative last-seen label. Returns null when we have no signal
 * (so the caller can hide the pill entirely).
 */
export function formatLastSeen(
  lastSeenAt: Date | string | null | undefined,
  now: number = Date.now(),
): string | null {
  if (!lastSeenAt) return null;
  const last = typeof lastSeenAt === "string" ? new Date(lastSeenAt).getTime() : lastSeenAt.getTime();
  if (Number.isNaN(last)) return null;

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
