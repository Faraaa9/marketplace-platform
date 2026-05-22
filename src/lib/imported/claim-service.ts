/**
 * Claim Service — business logic for claim lifecycle.
 *
 * Flow: createClaim -> verifyToken (email verified) -> approve/reject
 * A claim targets an unclaimed imported ProviderProfile. On approve the
 * target profile is bound directly to the claimer (userId/status/isActive).
 */

import * as repo from "./claim-repository";
import { ClaimApprovalConflictError } from "./claim-repository";
import { generateToken, hashToken, defaultExpiresAt, VERIFICATION_METHODS } from "./token";
import type { VerificationMethod } from "./token";

// ── Error codes ─────────────────────────────────────────────────────

export const ClaimErrors = {
  MISSING_SUPPLIER: "MISSING_SUPPLIER",
  INVALID_EMAIL: "INVALID_EMAIL",
  INVALID_METHOD: "INVALID_METHOD",
  SUPPLIER_NOT_FOUND: "SUPPLIER_NOT_FOUND",
  NOT_CLAIMABLE: "NOT_CLAIMABLE",
  CLAIM_EXISTS: "CLAIM_EXISTS",
  MISSING_TOKEN: "MISSING_TOKEN",
  INVALID_TOKEN: "INVALID_TOKEN",
  EXPIRED_TOKEN: "EXPIRED_TOKEN",
  ALREADY_VERIFIED: "ALREADY_VERIFIED",
  INVALID_STATUS: "INVALID_STATUS",
  NOT_FOUND: "NOT_FOUND",
  IDENTITY_EXISTS: "IDENTITY_EXISTS",
  EXPIRED_CLAIM: "EXPIRED_CLAIM",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  APPROVAL_CONFLICT: "APPROVAL_CONFLICT",
} as const;

// ── Types ────────────────────────────────────────────────────────────

interface ClaimDto {
  id: string;
  providerProfileId: string;
  supplier: { id: string; displayName: string; slug: string; status: string } | null;
  requestedByEmail: string;
  requestedByUserId: string | null;
  verificationMethod: string;
  status: string;
  expiresAt: Date;
  emailVerifiedAt: Date | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  isExpired: boolean;
}

interface ServiceError {
  error: string;
  message: string;
  existingClaimId?: string;
}

// ── Validation helpers ───────────────────────────────────────────────

function isSupplierClaimable(supplier: { status: string }): boolean {
  return supplier.status === "unclaimed";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidVerificationMethod(method: string): method is VerificationMethod {
  return (VERIFICATION_METHODS as readonly string[]).includes(method);
}

function isClaimExpired(claim: { status: string; expiresAt: Date }): boolean {
  return claim.status === "pending" && new Date(claim.expiresAt) < new Date();
}

// ── DTO mapper ───────────────────────────────────────────────────────

function claimToDto(claim: Record<string, unknown>): ClaimDto {
  return {
    id: claim.id as string,
    providerProfileId: claim.providerProfileId as string,
    supplier: (claim.providerProfile as ClaimDto["supplier"]) || null,
    requestedByEmail: claim.requestedByEmail as string,
    requestedByUserId: (claim.requestedByUserId as string) || null,
    verificationMethod: claim.verificationMethod as string,
    status: claim.status as string,
    expiresAt: claim.expiresAt as Date,
    emailVerifiedAt: (claim.emailVerifiedAt as Date) || null,
    reviewedAt: (claim.reviewedAt as Date) || null,
    reviewNotes: (claim.reviewNotes as string) || null,
    createdAt: claim.createdAt as Date,
    updatedAt: claim.updatedAt as Date,
    isExpired: isClaimExpired({
      status: claim.status as string,
      expiresAt: claim.expiresAt as Date,
    }),
  };
}

// ── Service methods ──────────────────────────────────────────────────

/**
 * Create a new claim request. Returns the claim DTO and a raw token
 * (the token is only exposed here — the caller decides whether to send
 * it via email or return it in a dev context, never in public API JSON).
 */
export async function createClaim({
  supplierSlug,
  requestedByEmail,
  verificationMethod,
  submittedEvidenceJson,
  requestedByUserId,
}: {
  supplierSlug: string;
  requestedByEmail: string;
  verificationMethod: string;
  submittedEvidenceJson?: string;
  requestedByUserId?: string;
}): Promise<{ claim: ClaimDto; token: string } | ServiceError> {
  if (!supplierSlug) return { error: ClaimErrors.MISSING_SUPPLIER, message: "supplierSlug is required" };
  const normalizedEmail = requestedByEmail.trim().toLowerCase();

  if (!normalizedEmail || !isValidEmail(normalizedEmail))
    return { error: ClaimErrors.INVALID_EMAIL, message: "Valid email is required" };
  if (!isValidVerificationMethod(verificationMethod))
    return { error: ClaimErrors.INVALID_METHOD, message: `verificationMethod must be one of: ${VERIFICATION_METHODS.join(", ")}` };

  const supplier = await repo.findSupplierBySlug(supplierSlug);
  if (!supplier) return { error: ClaimErrors.SUPPLIER_NOT_FOUND, message: `Supplier not found: ${supplierSlug}` };

  if (!isSupplierClaimable(supplier)) {
    return { error: ClaimErrors.NOT_CLAIMABLE, message: `Supplier "${supplier.displayName}" is already ${supplier.status}` };
  }

  const existingPending = await repo.findActivePendingClaim(supplier.id);
  if (existingPending) {
    return { error: ClaimErrors.CLAIM_EXISTS, message: "An active claim request already exists for this supplier", existingClaimId: existingPending.id };
  }

  const rawToken = generateToken();
  const tokenH = hashToken(rawToken);

  const claim = await repo.createClaimRequest({
    providerProfileId: supplier.id,
    requestedByEmail: normalizedEmail,
    requestedByUserId: requestedByUserId || null,
    verificationMethod,
    tokenHash: tokenH,
    expiresAt: defaultExpiresAt(),
    submittedEvidenceJson: submittedEvidenceJson || null,
  });

  return {
    claim: claimToDto({ ...claim, providerProfile: supplier }),
    token: rawToken,
  };
}

export async function getClaimById(id: string): Promise<ClaimDto | null> {
  const claim = await repo.findClaimById(id);
  if (!claim) return null;
  return claimToDto(claim);
}

export async function getClaimByToken(rawToken: string): Promise<ClaimDto | null> {
  if (!rawToken) return null;
  const tokenH = hashToken(rawToken);
  const claim = await repo.findClaimByTokenHash(tokenH);
  if (!claim) return null;
  return claimToDto(claim);
}

/**
 * Verify a raw claim token.
 * Checks: token exists, claim is pending, not expired.
 * On success: marks emailVerifiedAt.
 */
export async function verifyToken(rawToken: string): Promise<{ claim: ClaimDto } | ServiceError> {
  if (!rawToken) return { error: ClaimErrors.MISSING_TOKEN, message: "Token is required" };

  const tokenH = hashToken(rawToken);
  const claim = await repo.findClaimByTokenHash(tokenH);

  if (!claim) return { error: ClaimErrors.INVALID_TOKEN, message: "Token not found or invalid" };

  if (claim.status !== "pending") {
    return { error: ClaimErrors.INVALID_STATUS, message: `Claim has status "${claim.status}" and cannot be verified` };
  }

  if (isClaimExpired(claim)) {
    return { error: ClaimErrors.EXPIRED_TOKEN, message: "This verification token has expired" };
  }

  if (claim.emailVerifiedAt) {
    return { error: ClaimErrors.ALREADY_VERIFIED, message: "Email has already been verified for this claim" };
  }

  const existingUser = await repo.findUserByEmail(claim.requestedByEmail);
  if (existingUser) {
    await repo.prepareUserForClaimProviderAccount(existingUser.id, false);
  }

  const updated = await repo.markEmailVerified(claim.id, existingUser?.id || null);
  return { claim: claimToDto(updated) };
}

/**
 * Approve a pending claim inside a transaction.
 * Binds the target ProviderProfile to the claimer and marks it claimed.
 */
export async function approveClaim(
  claimId: string,
  { reviewNotes, reviewedByUserId }: { reviewNotes?: string; reviewedByUserId?: string } = {}
): Promise<{ claim: ClaimDto; profile: Record<string, unknown> | null } | ServiceError> {
  const claim = await repo.findClaimById(claimId);
  if (!claim) return { error: ClaimErrors.NOT_FOUND, message: "Claim request not found" };

  const { providerProfileId } = claim;
  if (!providerProfileId) {
    return { error: ClaimErrors.NOT_FOUND, message: "Claim has no linked provider profile" };
  }

  if (claim.status !== "pending") {
    return { error: ClaimErrors.INVALID_STATUS, message: `Cannot approve claim with status "${claim.status}"` };
  }

  if (isClaimExpired(claim)) {
    return { error: ClaimErrors.EXPIRED_CLAIM, message: "Cannot approve an expired claim" };
  }

  if (claim.verificationMethod === "email" && !claim.emailVerifiedAt) {
    return { error: ClaimErrors.EMAIL_NOT_VERIFIED, message: "Email must be verified before approving this claim" };
  }

  const existingIdentity = await repo.findActiveIdentity(providerProfileId);
  if (existingIdentity) {
    return { error: ClaimErrors.IDENTITY_EXISTS, message: "This profile already has an owner" };
  }

  try {
    const result = await repo.approveClaimTransaction(
      claimId,
      {
        providerProfileId,
        requestedByEmail: claim.requestedByEmail,
        requestedByUserId: claim.requestedByUserId ?? null,
        verificationMethod: claim.verificationMethod,
      },
      reviewedByUserId || null,
      reviewNotes || null
    );

    return {
      claim: claimToDto(result.claim),
      profile: result.profile,
    };
  } catch (err) {
    if (err instanceof ClaimApprovalConflictError) {
      return { error: ClaimErrors.APPROVAL_CONFLICT, message: err.message };
    }
    throw err;
  }
}

/**
 * Reject a pending claim, recording review metadata.
 */
export async function rejectClaim(
  claimId: string,
  { reviewNotes, reviewedByUserId }: { reviewNotes?: string; reviewedByUserId?: string } = {}
): Promise<{ claim: ClaimDto } | ServiceError> {
  const claim = await repo.findClaimById(claimId);
  if (!claim) return { error: ClaimErrors.NOT_FOUND, message: "Claim request not found" };

  if (claim.status !== "pending") {
    return { error: ClaimErrors.INVALID_STATUS, message: `Cannot reject claim with status "${claim.status}"` };
  }

  const updated = await repo.rejectClaimTransaction(
    claimId,
    reviewedByUserId || null,
    reviewNotes || null
  );

  return { claim: claimToDto(updated) };
}

export async function expireOldClaims(): Promise<number> {
  const expired = await repo.findExpiredPendingClaims();
  if (expired.length === 0) return 0;
  await repo.markClaimsExpired(expired.map((c) => c.id));
  return expired.length;
}

export async function getStats() {
  return repo.getClaimStats();
}
