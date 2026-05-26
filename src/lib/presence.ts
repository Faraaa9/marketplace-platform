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
 * Granular "when was last active" bucket used in both card pills and the
 * profile pill. Hides entirely past 24h.
 *
 *   <5 min     → online
 *   5–30 min   → minutes rounded to 5
 *   30–60 min  → minutes rounded to 10
 *   1–5 val.   → whole hours
 *   5–12 val.  → "5 val.+"
 *   12–24 val. → "12 val.+"
 *   ≥24 h      → null
 */
type PresenceBucket =
  | { kind: "online" }
  | { kind: "minutes"; value: number }
  | { kind: "hours"; value: number }
  | { kind: "over"; threshold: 5 | 12 };

function bucketFor(diffMs: number): PresenceBucket | null {
  if (diffMs < ONLINE_THRESHOLD_MS) return { kind: "online" };
  if (diffMs >= RECENT_THRESHOLD_MS) return null;

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 30) {
    const value = Math.max(5, Math.floor(minutes / 5) * 5);
    return { kind: "minutes", value };
  }
  if (minutes < 60) {
    const value = Math.floor(minutes / 10) * 10;
    return { kind: "minutes", value };
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 5) return { kind: "hours", value: hours };
  if (hours < 12) return { kind: "over", threshold: 5 };
  return { kind: "over", threshold: 12 };
}

function renderBucket(bucket: PresenceBucket, mode: "short" | "long"): string {
  if (bucket.kind === "online") {
    return mode === "long" ? "Prisijungęs dabar" : "Online";
  }
  const prefix = mode === "long" ? "Prisijungęs " : "";
  if (bucket.kind === "minutes") return `${prefix}prieš ${bucket.value} min.`;
  if (bucket.kind === "hours") {
    // Card pills stay compact ("Prieš 3 val.") while the profile pill uses
    // the full noun form ("Prisijungęs prieš 3 valandas").
    const unit = mode === "long" ? hourWord(bucket.value) : "val.";
    return `${prefix}prieš ${bucket.value} ${unit}`;
  }
  return `${prefix}prieš ${bucket.threshold} val.+`;
}

/**
 * Short label for listing card pills: "Online", "Prieš 10 min",
 * "Prieš 2 val.", "Prieš 5 val.+", "Prieš 12 val.+". Capitalized for
 * pill display. Null when older than 24h.
 */
export function getPresenceLabel(
  lastSeenAt: Date | string | null | undefined,
  now: number = Date.now(),
): string | null {
  const last = toTimestamp(lastSeenAt);
  if (last === null) return null;
  const bucket = bucketFor(Math.max(0, now - last));
  if (!bucket) return null;
  const raw = renderBucket(bucket, "short");
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Long label for the profile page pill: "Prisijungęs dabar",
 * "Prisijungęs prieš 10 min.", etc. Same 24h cutoff as the card scale.
 */
export function formatLastSeen(
  lastSeenAt: Date | string | null | undefined,
  now: number = Date.now(),
): string | null {
  const last = toTimestamp(lastSeenAt);
  if (last === null) return null;
  const bucket = bucketFor(Math.max(0, now - last));
  return bucket ? renderBucket(bucket, "long") : null;
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
