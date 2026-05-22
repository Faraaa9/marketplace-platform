import crypto from "crypto";

/**
 * Reply-by-email plumbing for the Resend inbound webhook.
 *
 * Outbound conversation emails carry a Reply-To of `reply+<token>@<domain>`.
 * The token is an HMAC-signed, all-lowercase string so it survives MTAs that
 * normalise the case of an address local-part. When such an email is received
 * back, the token tells us which thread the reply belongs to and who sent it.
 */

export type ThreadKind = "response" | "inquiry";
export type ReplyRole = "client" | "provider";

export interface ReplyTarget {
  kind: ThreadKind;
  threadId: string;
  /** The participant who receives the outbound email — i.e. the future replier. */
  role: ReplyRole;
}

const KIND_TO_CODE: Record<ThreadKind, string> = { response: "r", inquiry: "i" };
const CODE_TO_KIND: Record<string, ThreadKind> = { r: "response", i: "inquiry" };
const ROLE_TO_CODE: Record<ReplyRole, string> = { client: "c", provider: "p" };
const CODE_TO_ROLE: Record<string, ReplyRole> = { c: "client", p: "provider" };

const REPLY_PREFIX = "reply+";
/** HMAC tag length in hex chars (96 bits) — keeps the address well under 64 chars. */
const TAG_LENGTH = 24;

function replySecret(): string {
  return (
    process.env.INBOUND_REPLY_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    ""
  );
}

/** The domain Resend receives inbound mail on (e.g. `inbound.paslaugurinka.lt`). */
export function getInboundDomain(): string | null {
  return process.env.INBOUND_EMAIL_DOMAIN?.trim().toLowerCase() || null;
}

function sign(payload: string): string {
  return crypto
    .createHmac("sha256", replySecret())
    .update(payload)
    .digest("hex")
    .slice(0, TAG_LENGTH);
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/** Build the signed token for a thread/role pair, or null when unconfigured. */
export function buildReplyToken(target: ReplyTarget): string | null {
  if (!replySecret()) return null;
  const payload = `${KIND_TO_CODE[target.kind]}.${target.threadId}.${ROLE_TO_CODE[target.role]}`;
  return `${payload}.${sign(payload)}`;
}

/**
 * Full Reply-To address for a thread, or null when inbound email is not
 * configured (no domain / no secret) — callers then fall back to the default.
 */
export function buildReplyAddress(target: ReplyTarget): string | null {
  const domain = getInboundDomain();
  const token = buildReplyToken(target);
  if (!domain || !token) return null;
  return `${REPLY_PREFIX}${token}@${domain}`;
}

/** Verify and decode a reply token. Returns null on any tampering or malformation. */
export function parseReplyToken(token: string): ReplyTarget | null {
  const parts = token.toLowerCase().split(".");
  if (parts.length !== 4) return null;
  const [kindCode, threadId, roleCode, tag] = parts;
  const kind = CODE_TO_KIND[kindCode];
  const role = CODE_TO_ROLE[roleCode];
  if (!kind || !role || !threadId || !tag) return null;
  const expected = sign(`${kindCode}.${threadId}.${roleCode}`);
  if (!timingSafeEqualStr(tag, expected)) return null;
  return { kind, threadId, role };
}

/** Pull the bare `local@domain` out of an address that may be `Name <local@domain>`. */
export function extractEmailAddress(raw: string): string {
  const angle = raw.match(/<([^>]+)>/);
  return (angle ? angle[1] : raw).trim().toLowerCase();
}

/**
 * Find a `reply+<token>@...` recipient among the delivered addresses and return
 * the verified reply target, or null when none is a valid reply address.
 */
export function findReplyTarget(addresses: string[]): ReplyTarget | null {
  for (const raw of addresses) {
    const email = extractEmailAddress(raw);
    const at = email.indexOf("@");
    if (at === -1) continue;
    const local = email.slice(0, at);
    if (!local.startsWith(REPLY_PREFIX)) continue;
    const target = parseReplyToken(local.slice(REPLY_PREFIX.length));
    if (target) return target;
  }
  return null;
}

const QUOTE_HEADER =
  /(wrote|rašė|rase|escribió|a écrit|schrieb|napisał|napisała|написал|написала| writes):\s*$/i;

function isReplyBoundary(line: string): boolean {
  const l = line.trim();
  if (!l) return false;
  if (QUOTE_HEADER.test(l)) return true;
  if (/^-{2,}\s*original message\s*-{2,}/i.test(l)) return true;
  if (/^-{2,}\s*persiųstas laiškas\s*-{2,}/i.test(l)) return true;
  if (/^_{5,}$/.test(l)) return true; // Outlook divider
  return false;
}

/**
 * Strip the quoted original and signature from a reply body, leaving just the
 * newly-typed text. Heuristic — covers the common Gmail/Outlook/Apple Mail
 * patterns in English and Lithuanian.
 */
export function stripQuotedReply(raw: string): string {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const kept: string[] = [];
  for (const line of lines) {
    if (isReplyBoundary(line)) break;
    if (line.trim() === "--") break; // signature delimiter
    kept.push(line);
  }
  while (
    kept.length &&
    (kept[kept.length - 1].trimStart().startsWith(">") || kept[kept.length - 1].trim() === "")
  ) {
    kept.pop();
  }
  return kept.join("\n").trim();
}

/** Crude HTML-to-text fallback for when an inbound email has no plain-text part. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
