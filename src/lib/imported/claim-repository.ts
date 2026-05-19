/**
 * Claim Repository — Prisma queries for claims and supplier identities.
 * All reads use `select` per AGENTS.md.
 */

import { prisma } from "@/lib/prisma";

// ── Select shapes ───────────────────────────────────────────────────

const claimSelect = {
  id: true,
  supplierRecordId: true,
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
  supplier: {
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
  supplierRecordId: string;
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

export async function findActivePendingClaim(supplierRecordId: string) {
  return prisma.claimRequest.findFirst({
    where: {
      supplierRecordId,
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
 * Transaction-safe approve: updates claim, creates identity, marks supplier claimed.
 */
export async function approveClaimTransaction(
  claimId: string,
  claim: {
    supplierRecordId: string;
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

    const identity = await tx.supplierIdentity.create({
      data: {
        supplierRecordId: claim.supplierRecordId,
        userId: resolvedUserId,
        contactEmail: claim.requestedByEmail,
        ownershipStatus: "owner",
        verificationMethod: claim.verificationMethod,
        verifiedAt: new Date(),
      },
      select: {
        id: true,
        supplierRecordId: true,
        userId: true,
        ownershipStatus: true,
        verifiedAt: true,
      },
    });

    // Upgrade user to PROVIDER and activate ProviderProfile
    if (resolvedUserId) {
      const user = await tx.user.findUnique({
        where: { id: resolvedUserId },
        select: { id: true, role: true, emailVerified: true },
      });

      if (user && user.role !== "ADMIN") {
        if (user.role !== "PROVIDER") {
          await tx.user.update({
            where: { id: user.id },
            data: { role: "PROVIDER" },
            select: { id: true },
          });
        }

        await tx.providerProfile.upsert({
          where: { userId: user.id },
          update: { isActive: true },
          create: {
            userId: user.id,
            specializations: [],
            images: [],
            isActive: true,
          },
          select: { id: true },
        });
      }
    }

    await tx.supplierRecord.update({
      where: { id: claim.supplierRecordId },
      data: { status: "claimed" },
      select: { id: true },
    });

    return { claim: updatedClaim, identity };
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

// ── SupplierIdentity ─────────────────────────────────────────────────

export async function findActiveIdentity(supplierRecordId: string) {
  return prisma.supplierIdentity.findFirst({
    where: {
      supplierRecordId,
      ownershipStatus: { in: ["owner", "manager"] },
    },
    select: { id: true, ownershipStatus: true },
  });
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

export async function prepareUserForClaimProviderAccount(userId: string, isActive: boolean) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, emailVerified: true },
    });

    if (!user) return null;

    const userUpdates: Record<string, unknown> = {};
    if (!user.emailVerified) userUpdates.emailVerified = new Date();
    if (user.role !== "ADMIN" && user.role !== "PROVIDER") userUpdates.role = "PROVIDER";

    if (Object.keys(userUpdates).length > 0) {
      await tx.user.update({
        where: { id: user.id },
        data: userUpdates,
        select: { id: true },
      });
    }

    if (user.role !== "ADMIN") {
      await tx.providerProfile.upsert({
        where: { userId: user.id },
        update: isActive ? { isActive: true } : {},
        create: {
          userId: user.id,
          specializations: [],
          images: [],
          isActive,
        },
        select: { id: true },
      });
    }

    return { id: user.id };
  });
}

// ── SupplierRecord ──────────────────────────────────────────────────

export async function findSupplierBySlug(slug: string) {
  return prisma.supplierRecord.findUnique({
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
  const identities = await prisma.supplierIdentity.count();
  return { total, pending, approved, rejected, identities };
}
