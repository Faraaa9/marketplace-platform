/**
 * Provider access control — checks if a user owns a provider profile.
 *
 * Used for:
 * - Dashboard access to claimed provider profiles
 * - Edit permission checks
 * - Management CTA visibility (server-side)
 *
 * Ownership lives on `ProviderProfile.userId` — a profile is owned once an
 * approved claim binds it to a user. There is no separate identity table.
 */

import { prisma } from "@/lib/prisma";

/**
 * Check if a user owns a specific provider profile (by slug).
 * Returns the ProviderProfile if owned, null otherwise.
 */
export async function canManageSupplier(userId: string, supplierSlug: string) {
  const profile = await prisma.providerProfile.findFirst({
    where: { slug: supplierSlug, userId },
    select: {
      id: true,
      userId: true,
      slug: true,
      displayName: true,
      status: true,
      sourceType: true,
    },
  });

  return profile;
}

/**
 * Get all provider profiles a user owns.
 */
export async function getUserManagedSuppliers(userId: string) {
  return prisma.providerProfile.findMany({
    where: { userId },
    select: {
      id: true,
      userId: true,
      slug: true,
      displayName: true,
      status: true,
      sourceType: true,
      location: true,
      shortSummary: true,
      phone: true,
      publicEmail: true,
      website: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Auto-bind providers to a user by matching email.
 *
 * Legacy behavior (SupplierIdentity era). In the unified provider model,
 * ownership is established ONLY through the explicit claim flow — an email
 * match is not proof that the user owns the business. This is now a safe
 * no-op so the claim flow stays the single path to ownership.
 *
 * Kept as an export (and intentionally `async`) so `auth.ts` keeps importing
 * it without changes.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function attachIdentityToUserByEmail(
  _email: string,
  _userId: string
): Promise<number> {
  return 0;
}

/**
 * Check if a user owns a provider profile (by profile ID).
 */
export async function canManageSupplierById(userId: string, profileId: string) {
  const profile = await prisma.providerProfile.findFirst({
    where: { id: profileId, userId },
    select: { id: true },
  });

  return !!profile;
}
