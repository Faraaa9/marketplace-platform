import crypto from "crypto";

export const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;

function getVerificationSecret(): string {
  return process.env.NEXTAUTH_SECRET || "development-email-verification-secret";
}

export function hashEmailVerificationCode(email: string, code: string): string {
  return crypto
    .createHash("sha256")
    .update(`${email}:${code}:${getVerificationSecret()}`)
    .digest("hex");
}

export function emailVerificationCodeMatches(email: string, code: string, hash: string): boolean {
  const expected = hashEmailVerificationCode(email, code);
  const expectedBuffer = Buffer.from(expected);
  const hashBuffer = Buffer.from(hash);
  return expectedBuffer.length === hashBuffer.length && crypto.timingSafeEqual(expectedBuffer, hashBuffer);
}

export function hashDirectInquiryCode(providerId: string, code: string): string {
  return crypto
    .createHash("sha256")
    .update(`${providerId}:${code}:${getVerificationSecret()}`)
    .digest("hex");
}

export function directInquiryCodeMatches(providerId: string, code: string, hash: string): boolean {
  const expected = hashDirectInquiryCode(providerId, code);
  const expectedBuffer = Buffer.from(expected);
  const hashBuffer = Buffer.from(hash);
  return expectedBuffer.length === hashBuffer.length && crypto.timingSafeEqual(expectedBuffer, hashBuffer);
}
