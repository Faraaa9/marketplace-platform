import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { FREE_CATEGORY_LIMIT } from "@/lib/credits";
import { SERVICE_CATEGORY_WHERE } from "@/lib/service-categories";

type TxClient = Prisma.TransactionClient | typeof prisma;

/**
 * Sync a provider's FREE/base categories to `desiredIds`.
 *
 * Paid categories (rows with `expiresAt` set) are NEVER touched here — they are
 * managed only through `unlockCategory` and must survive profile edits, so a
 * provider can't accidentally lose categories they paid for by saving their
 * profile. Free categories are de-duplicated, validated, and capped at
 * FREE_CATEGORY_LIMIT; ids that are already active as a paid category are
 * skipped (no point making them free too).
 *
 * Returns the final ordered list of free category ids that were kept.
 */
export async function syncFreeCategories(
  tx: TxClient,
  providerProfileId: string,
  desiredIds: string[],
): Promise<string[]> {
  const existing = await tx.providerProfileCategory.findMany({
    where: { providerProfileId },
    select: { categoryId: true, expiresAt: true },
  });
  const paidIds = new Set(
    existing.filter((e) => e.expiresAt != null).map((e) => e.categoryId),
  );
  const freeExistingIds = new Set(
    existing.filter((e) => e.expiresAt == null).map((e) => e.categoryId),
  );

  const desired = [...new Set(desiredIds)]
    .filter((id) => !paidIds.has(id))
    .slice(0, FREE_CATEGORY_LIMIT);

  const validIds =
    desired.length > 0
      ? new Set(
          (
            await tx.category.findMany({
              where: { ...SERVICE_CATEGORY_WHERE, id: { in: desired } },
              select: { id: true },
            })
          ).map((c) => c.id),
        )
      : new Set<string>();
  const finalFree = desired.filter((id) => validIds.has(id));
  const finalSet = new Set(finalFree);

  // Remove free rows the provider deselected — but never paid rows.
  const toRemove = [...freeExistingIds].filter((id) => !finalSet.has(id));
  if (toRemove.length > 0) {
    await tx.providerProfileCategory.deleteMany({
      where: {
        providerProfileId,
        categoryId: { in: toRemove },
        expiresAt: null,
      },
    });
  }

  // Upsert kept free rows with sortOrder following the submitted order.
  for (let i = 0; i < finalFree.length; i++) {
    const categoryId = finalFree[i];
    if (freeExistingIds.has(categoryId)) {
      await tx.providerProfileCategory.update({
        where: { providerProfileId_categoryId: { providerProfileId, categoryId } },
        data: { sortOrder: i },
      });
    } else {
      await tx.providerProfileCategory.create({
        data: { providerProfileId, categoryId, sortOrder: i, expiresAt: null },
      });
    }
  }

  return finalFree;
}
