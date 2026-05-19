/**
 * Supplier access control — checks if a user can manage a supplier.
 *
 * Used for:
 * - Dashboard access to claimed supplier profiles
 * - Edit permission checks
 * - Management CTA visibility (server-side)
 */

import { prisma } from "@/lib/prisma";

/**
 * Check if a user can manage a specific supplier.
 * Returns the SupplierIdentity if authorized, null otherwise.
 */
export async function canManageSupplier(userId: string, supplierSlug: string) {
  const identity = await prisma.supplierIdentity.findFirst({
    where: {
      userId,
      ownershipStatus: { in: ["owner", "manager"] },
      supplier: { slug: supplierSlug },
    },
    select: {
      id: true,
      supplierRecordId: true,
      userId: true,
      contactEmail: true,
      ownershipStatus: true,
      verificationMethod: true,
      verifiedAt: true,
      supplier: {
        select: { id: true, displayName: true, slug: true, status: true },
      },
    },
  });

  return identity;
}

/**
 * Get all suppliers a user can manage.
 */
export async function getUserManagedSuppliers(userId: string) {
  const identities = await prisma.supplierIdentity.findMany({
    where: {
      userId,
      ownershipStatus: { in: ["owner", "manager"] },
    },
    select: {
      id: true,
      supplierRecordId: true,
      userId: true,
      contactEmail: true,
      ownershipStatus: true,
      verificationMethod: true,
      verifiedAt: true,
      createdAt: true,
      supplier: {
        select: {
          id: true,
          displayName: true,
          slug: true,
          status: true,
          city: true,
          shortSummary: true,
          phonePublic: true,
          emailPublic: true,
          websiteUrl: true,
          createdAt: true,
          _count: { select: { categoryLinks: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return identities;
}

/**
 * Try to bind a SupplierIdentity to a user by matching email.
 * Called after login/register when a user's email matches an unbound identity.
 */
export async function attachIdentityToUserByEmail(email: string, userId: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const result = await tx.supplierIdentity.updateMany({
      where: {
        contactEmail: email,
        userId: null,
        ownershipStatus: { in: ["owner", "manager"] },
      },
      data: { userId },
    });

    if (result.count === 0) {
      return 0;
    }

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { role: true, emailVerified: true },
    });

    if (user && user.role !== "ADMIN") {
      if (user.role !== "PROVIDER") {
        await tx.user.update({
          where: { id: userId },
          data: { role: "PROVIDER" },
          select: { id: true },
        });
      }

      // Binding an approved identity means the supplier is claimed — activate profile
      await tx.providerProfile.upsert({
        where: { userId },
        update: { isActive: true },
        create: {
          userId,
          specializations: [],
          images: [],
          isActive: true,
        },
        select: { id: true },
      });
    }

    return result.count;
  });
}

/**
 * Check if current user owns/manages a supplier (by supplier ID).
 */
export async function canManageSupplierById(userId: string, supplierRecordId: string) {
  const identity = await prisma.supplierIdentity.findFirst({
    where: {
      userId,
      supplierRecordId,
      ownershipStatus: { in: ["owner", "manager"] },
    },
    select: { id: true },
  });

  return !!identity;
}
