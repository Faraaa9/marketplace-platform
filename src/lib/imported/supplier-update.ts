/**
 * Supplier update logic — editable fields for claimed supplier owners.
 *
 * Only owner/manager can update. Only public-facing fields are editable.
 * Source provenance (snapshots, externalSource, etc.) is never modified.
 */

import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const supplierEditSchema = z.object({
  displayName: z.string().min(2, "Pavadinimas turi buti bent 2 simboliu").max(200),
  shortSummary: z.string().max(500).optional().or(z.literal("")),
  description: z.string().max(5000).optional().or(z.literal("")),
  phonePublic: z.string().max(30).optional().or(z.literal("")),
  emailPublic: z.string().email("Neteisingas el. pasto formatas").optional().or(z.literal("")),
  websiteUrl: z.string().url("Neteisingas URL formatas").optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
});

export type SupplierEditInput = z.infer<typeof supplierEditSchema>;

/**
 * Update editable fields on an imported provider's ProviderProfile.
 * Caller must verify access before calling this.
 */
export async function updateSupplierFields(profileId: string, data: SupplierEditInput) {
  return prisma.providerProfile.update({
    where: { id: profileId },
    data: {
      displayName: data.displayName,
      shortSummary: data.shortSummary || null,
      description: data.description || null,
      phone: data.phonePublic || null,
      publicEmail: data.emailPublic || null,
      website: data.websiteUrl || null,
      location: data.city || null,
    },
    select: {
      id: true,
      displayName: true,
      slug: true,
      status: true,
    },
  });
}
