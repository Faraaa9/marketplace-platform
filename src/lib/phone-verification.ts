import crypto from "crypto";

export const PHONE_CODE_TTL_MS = 10 * 60 * 1000;
export const PHONE_VERIFICATION_VALID_MS = 60 * 60 * 1000;

function getVerificationSecret(): string {
  return process.env.NEXTAUTH_SECRET || "development-phone-verification-secret";
}

export function createPhoneVerificationCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export function hashPhoneVerificationCode(phone: string, code: string): string {
  return crypto
    .createHash("sha256")
    .update(`${phone}:${code}:${getVerificationSecret()}`)
    .digest("hex");
}

export function phoneVerificationCodeMatches(phone: string, code: string, hash: string): boolean {
  const expected = hashPhoneVerificationCode(phone, code);
  const expectedBuffer = Buffer.from(expected);
  const hashBuffer = Buffer.from(hash);
  return expectedBuffer.length === hashBuffer.length && crypto.timingSafeEqual(expectedBuffer, hashBuffer);
}
