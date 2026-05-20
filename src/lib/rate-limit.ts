import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// ─── Upstash Redis rate limiter (production) ───
// Falls back to in-memory when UPSTASH env vars are not set (local dev)

const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

// Upstash rate limiters (created lazily)
let upstashLimiters: Map<string, Ratelimit> | null = null;

function getUpstashLimiter(config: RateLimitConfig): Ratelimit {
  if (!upstashLimiters) upstashLimiters = new Map();

  const configKey = `${config.maxRequests}:${config.windowMs}`;
  let limiter = upstashLimiters.get(configKey);
  if (!limiter) {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowMs} ms`),
      prefix: "rl",
    });
    upstashLimiters.set(configKey, limiter);
  }
  return limiter;
}

// ─── In-memory fallback (local dev only) ───
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

function memoryRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || entry.resetAt <= now) {
    memoryStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return { success: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt };
}

// ─── Public API ───
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Rate limiter — uses Upstash Redis in production, in-memory fallback for local dev.
 */
export async function rateLimitAsync(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
  if (!hasUpstash) {
    return memoryRateLimit(key, config);
  }

  try {
    const limiter = getUpstashLimiter(config);
    const result = await limiter.limit(key);
    return {
      success: result.success,
      remaining: result.remaining,
      resetAt: result.reset,
    };
  } catch (error) {
    console.error("Upstash rate limit error, falling back to allow:", error);
    // Fail open — don't block users if Redis is down
    return { success: true, remaining: config.maxRequests, resetAt: Date.now() + config.windowMs };
  }
}

// Preset configs
export const RATE_LIMITS = {
  requests: { maxRequests: 5, windowMs: 60 * 60 * 1000 },       // 5 per hour
  auth: { maxRequests: 10, windowMs: 15 * 60 * 1000 },          // 10 per 15 min
  api: { maxRequests: 60, windowMs: 60 * 1000 },                // 60 per minute
  messages: { maxRequests: 5, windowMs: 60 * 1000 },            // 5 per minute
  responses: { maxRequests: 10, windowMs: 10 * 60 * 1000 },     // 10 per 10 min
  aiImprove: { maxRequests: 15, windowMs: 60 * 60 * 1000 },     // 15 per hour (AI aprašymo tvarkymas)
  guestMessages: { maxRequests: 3, windowMs: 60 * 1000 },       // 3 per minute
  directInquiry: { maxRequests: 5, windowMs: 60 * 60 * 1000 },  // 5 per hour (sender)
  directInquiryGuest: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 per hour (guest)
  directInquiryPerProvider: { maxRequests: 20, windowMs: 60 * 60 * 1000 }, // 20 per hour (per provider)
} as const;

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
