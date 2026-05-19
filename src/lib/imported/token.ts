/**
 * Token utilities for claim flow.
 * Raw tokens are shown once to the requester, only hash is stored in DB.
 */

import crypto from "crypto";

export function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function defaultExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d;
}

export const VERIFICATION_METHODS = ["email", "phone", "domain_email", "dns", "manual"] as const;
export const CLAIM_STATUSES = ["pending", "approved", "rejected", "expired", "cancelled"] as const;
export const OWNERSHIP_STATUSES = ["owner", "manager", "pending", "revoked"] as const;

export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];
export type OwnershipStatus = (typeof OWNERSHIP_STATUSES)[number];
