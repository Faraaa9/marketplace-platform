import { createHash } from "node:crypto";
import { rateLimitAsync } from "@/lib/rate-limit";

// Per-account limit stops guessing one password; the looser per-IP limit stops
// spraying one password across many accounts.
export const LOGIN_LIMITS = {
  email: { maxRequests: 10, windowMs: 15 * 60 * 1000 },
  ip: { maxRequests: 50, windowMs: 15 * 60 * 1000 },
} as const;

type Limiter = typeof rateLimitAsync;

export async function loginAllowed(
  email: string,
  ip: string,
  limit: Limiter = rateLimitAsync,
): Promise<boolean> {
  const [byEmail, byIp] = await Promise.all([
    limit(`login:email:${email.trim().toLowerCase()}`, LOGIN_LIMITS.email),
    limit(`login:ip:${ip}`, LOGIN_LIMITS.ip),
  ]);
  return byEmail.success && byIp.success;
}

/**
 * Short, non-reversible stamp of the current password hash. Stored in the JWT
 * at sign-in; when the password changes (reset) the stamp no longer matches
 * and every older session is rejected.
 */
export function passwordFingerprint(passwordHash: string | null | undefined): string {
  if (!passwordHash) return "none";
  return createHash("sha256").update(passwordHash).digest("base64url").slice(0, 16);
}

