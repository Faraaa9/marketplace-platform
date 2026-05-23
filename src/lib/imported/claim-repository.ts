/**
 * Claim Repository — Prisma queries for claims.
 * All reads use `select` per AGENTS.md.
 *
 * A claim targets an unclaimed imported ProviderProfile. On approval the
 * target profile is bound directly to the claimer's user — there is no
 * separate identity table.
 */

import { prisma } from "@/lib/prisma";

// ── Errors ──────────────────────────────────────────────────────────

/**
 * Thrown inside the approve transaction when the target profile cannot be
 * bound — e.g. the claimer already owns a different ProviderProfile
 * (userId is unique). The service layer maps this to a ClaimError.
 */
export class ClaimApprovalConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaimApprovalConflictError";
  }
}

// ── Select shapes ───────────────────────────────────────────────────

const claimSelect = {
  id: true,
  providerProfileId: true,
  requestedByEmail: true,
  requestedByUserId: true,
  verificationMethod: true,
  status: true,
  expiresAt: true,
  emailVerifiedAt: true,
  reviewedAt: true,
  reviewedByUserId: true,
  reviewNotes: true,
  createdAt: true,
  updatedAt: true,
  providerProfile: {
    select: { id: true, displayName: true, slug: true, status: true },
  },
} as const;

const claimMinimalSelect = {
  id: true,
  status: true,
  expiresAt: true,
} as const;

// ── ClaimRequest ─────────────────────────────────────────────────────

export async function createClaimRequest(data: {
  providerProfileId: string;
  requestedByEmail: string;
  requestedByUserId?: string | null;
  verificationMethod: string;
  tokenHash: string;
  expiresAt: Date;
  submittedEvidenceJson?: string | null;
}) {
  return prisma.claimRequest.create({
    data,
    select: claimSelect,
  });
}

export async function findClaimById(id: string) {
  return prisma.claimRequest.findUnique({
    where: { id },
    select: claimSelect,
  });
}

export async function findClaimByTokenHash(tokenHash: string) {
  return prisma.claimRequest.findUnique({
    where: { tokenHash },
    select: {
      ...claimSelect,
      submittedEvidenceJson: true,
    },
  });
}

export async function findActivePendingClaim(providerProfileId: string) {
  return prisma.claimRequest.findFirst({
    where: {
      providerProfileId,
      status: "pending",
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
}

export async function updateClaimStatus(
  id: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  return prisma.claimRequest.update({
    where: { id },
    data: { status, ...extra },
    select: claimSelect,
  });
}

export async function markEmailVerified(id: string, requestedByUserId?: string | null) {
  return prisma.claimRequest.update({
    where: { id },
    data: {
      emailVerifiedAt: new Date(),
      ...(requestedByUserId ? { requestedByUserId } : {}),
    },
    select: claimSelect,
  });
}

/**
 * Transaction-safe approve: updates the claim, binds the target
 * ProviderProfile to the claimer (userId + claimed + active) and upgrades
 * the user to PROVIDER.
 */
export async function approveClaimTransaction(
  claimId: string,
  claim: {
    providerProfileId: string;
    requestedByEmail: string;
    requestedByUserId: string | null;
    verificationMethod: string;
  },
  reviewedByUserId: string | null,
  reviewNotes: string | null
) {
  return prisma.$transaction(async (tx) => {
    // Resolve userId: if null, try to find user by email
    let resolvedUserId = claim.requestedByUserId;
    if (!resolvedUserId) {
      const userByEmail = await tx.user.findUnique({
        where: { email: claim.requestedByEmail },
        select: { id: true },
      });
      if (userByEmail) {
        resolvedUserId = userByEmail.id;
        // Bind user to claim
        await tx.claimRequest.update({
          where: { id: claimId },
          data: { requestedByUserId: resolvedUserId },
          select: { id: true },
        });
      }
    }

    const updatedClaim = await tx.claimRequest.update({
      where: { id: claimId },
      data: {
        status: "approved",
        reviewedAt: new Date(),
        reviewedByUserId,
        reviewNotes,
      },
      select: claimSelect,
    });

    // Bind the target ProviderProfile to the claimer and activate it.
    // Without a resolved user the claim can still be approved, but the
    // profile cannot be owned until the claimer sets up an account
    // (handled by /api/claims/setup-account).
    let profile: { id: string; userId: string | null; status: string; isActive: boolean } | null =
      null;

    if (resolvedUserId) {
      const user = await tx.user.findUnique({
        where: { id: resolvedUserId },
        select: { id: true, role: true },
      });

      // ProviderProfile.userId is unique — a user can own only one profile.
      // If the claimer already owns a different profile, the bind would
      // violate the constraint, so surface a clear error instead.
      const existingOwned = await tx.providerProfile.findUnique({
        where: { userId: resolvedUserId },
        select: { id: true },
      });
      if (existingOwned && existingOwned.id !== claim.providerProfileId) {
        throw new ClaimApprovalConflictError(
          "Šis naudotojas jau valdo kitą tiekėjo profilį."
        );
      }

      if (user && user.role !== "ADMIN" && user.role !== "PROVIDER") {
        await tx.user.update({
          where: { id: user.id },
          data: { role: "PROVIDER" },
          select: { id: true },
        });
      }

      profile = await tx.providerProfile.update({
        where: { id: claim.providerProfileId },
        data: {
          userId: resolvedUserId,
          status: "claimed",
          isActive: true,
        },
        select: { id: true, userId: true, status: true, isActive: true },
      });
    } else {
      // No user yet — keep the profile unclaimed but record approval.
      profile = await tx.providerProfile.findUnique({
        where: { id: claim.providerProfileId },
        select: { id: true, userId: true, status: true, isActive: true },
      });
    }

    return { claim: updatedClaim, profile };
  });
}

/**
 * Reject claim with review metadata.
 */
export async function rejectClaimTransaction(
  claimId: string,
  reviewedByUserId: string | null,
  reviewNotes: string | null
) {
  return prisma.claimRequest.update({
    where: { id: claimId },
    data: {
      status: "rejected",
      reviewedAt: new Date(),
      reviewedByUserId,
      reviewNotes,
    },
    select: claimSelect,
  });
}

export async function findExpiredPendingClaims() {
  return prisma.claimRequest.findMany({
    where: {
      status: "pending",
      expiresAt: { lte: new Date() },
    },
    select: claimMinimalSelect,
  });
}

export async function markClaimsExpired(ids: string[]) {
  return prisma.claimRequest.updateMany({
    where: { id: { in: ids } },
    data: { status: "expired" },
  });
}

// ── ProviderProfile (claim target) ──────────────────────────────────

/**
 * True if a ProviderProfile is already owned by a user.
 * Used to block approving a second claim onto a profile that — although
 * still flagged "unclaimed" — has somehow already been bound.
 */
export async function findActiveIdentity(providerProfileId: string) {
  const profile = await prisma.providerProfile.findUnique({
    where: { id: providerProfileId },
    select: { id: true, userId: true, status: true },
  });
  if (!profile || !profile.userId) return null;
  return { id: profile.id, ownershipStatus: "owner" as const };
}

// ── User helpers ────────────────────────────────────────────────────

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true, role: true },
  });
}

export async function markUserEmailVerified(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { emailVerified: new Date() },
    select: { id: true },
  });
}

/**
 * Prepare a user during claim verification: verify their email and upgrade
 * the role to PROVIDER. Does NOT create or activate a ProviderProfile —
 * the imported profile they are claiming becomes theirs only on approval.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function prepareUserForClaimProviderAccount(userId: string, _isActive: boolean) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, emailVerified: true },
  });

  if (!user) return null;

  const userUpdates: Record<string, unknown> = {};
  if (!user.emailVerified) userUpdates.emailVerified = new Date();
  if (user.role !== "ADMIN" && user.role !== "PROVIDER") userUpdates.role = "PROVIDER";

  if (Object.keys(userUpdates).length > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: userUpdates,
      select: { id: true },
    });
  }

  return { id: user.id };
}

// ── Claim target lookup ─────────────────────────────────────────────

/**
 * Resolve a claim target by slug — an imported ProviderProfile.
 */
export async function findSupplierBySlug(slug: string) {
  return prisma.providerProfile.findUnique({
    where: { slug },
    select: { id: true, displayName: true, slug: true, status: true },
  });
}

// ── Stats ────────────────────────────────────────────────────────────

export async function getClaimStats() {
  const [total, pending, approved, rejected] = await Promise.all([
    prisma.claimRequest.count(),
    prisma.claimRequest.count({ where: { status: "pending" } }),
    prisma.claimRequest.count({ where: { status: "approved" } }),
    prisma.claimRequest.count({ where: { status: "rejected" } }),
  ]);
  const identities = await prisma.providerProfile.count({
    where: { sourceType: "imported", status: "claimed" },
  });
  return { total, pending, approved, rejected, identities };
}
