export type EligibilityCode =
  | "OK"
  | "NO_SPECIALIZATIONS"
  | "SPECIALIZATION_MISMATCH"
  | "OWN_REQUEST"
  | "REQUEST_CLOSED"
  | "ALREADY_RESPONDED";

export interface EligibilityResult {
  allowed: boolean;
  code: EligibilityCode;
  message: string;
}

/** A category positioned in the curated service tree (root, subcategory, or service). */
export interface CategoryNode {
  id: string;
  rootId: string | null; // null = this node is itself a root
  parentId?: string | null; // direct parent id; null/absent for a root
}

/**
 * True if two categories are on the same branch — equal, or one is an ancestor
 * of the other. The curated service tree is 3 levels deep (root → subcategory →
 * service; see src/lib/service-categories.ts), so the possible ancestor
 * relations are: a root and anything under it (matched via rootId), and a
 * subcategory and its direct service child (matched via parentId).
 *
 * This mirrors the inbox matcher expandToMatchSet (id + ancestors + descendants)
 * so that any lead a provider can SEE in the inbox is also one they are eligible
 * to unlock/respond to. parentId is only needed for the subcategory↔service
 * relation; callers that omit it keep the root↔child behaviour. A 4th tree level
 * would break this (it needs the full match set) — guarded by the boundary test
 * src/lib/__tests__/taxonomy-depth-tripwire.test.ts, which fails if the taxonomy
 * ever exceeds 3 levels.
 */
export function categoriesMatch(a: CategoryNode, b: CategoryNode): boolean {
  if (a.id === b.id) return true;
  if (a.rootId === null && b.rootId === a.id) return true; // a is b's root
  if (b.rootId === null && a.rootId === b.id) return true; // b is a's root
  if (a.parentId != null && a.parentId === b.id) return true; // b is a's parent
  if (b.parentId != null && b.parentId === a.id) return true; // a is b's parent
  return false;
}

/**
 * Check whether a provider is eligible to respond to a specific request.
 * Pure logic — no DB calls. Caller provides the data.
 */
export function checkEligibility(
  providerId: string,
  request: { status: string; clientId: string | null; category: CategoryNode | null },
  providerCategories: CategoryNode[],
): EligibilityResult {
  if (request.status !== "OPEN") {
    return { allowed: false, code: "REQUEST_CLOSED", message: "Ši užklausa nebepriima naujų pasiūlymų" };
  }

  if (request.clientId === providerId) {
    return { allowed: false, code: "OWN_REQUEST", message: "Negalite atsakyti į savo paties užklausą" };
  }

  if (providerCategories.length === 0) {
    return {
      allowed: false,
      code: "NO_SPECIALIZATIONS",
      message: "Neturite pasirinktų kategorijų. Užpildykite savo profilį, kad galėtumėte teikti pasiūlymus.",
    };
  }

  // A request with no curated category is open to any provider.
  if (request.category === null) {
    return { allowed: true, code: "OK", message: "" };
  }

  const reqCategory = request.category;
  if (!providerCategories.some((c) => categoriesMatch(c, reqCategory))) {
    return {
      allowed: false,
      code: "SPECIALIZATION_MISMATCH",
      message: "Ši užklausa nepriklauso jūsų pasirinktoms kategorijoms.",
    };
  }

  return { allowed: true, code: "OK", message: "" };
}
