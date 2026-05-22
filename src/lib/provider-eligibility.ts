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

/** A category positioned in the 2-level curated tree (a root or a depth-1). */
export interface CategoryNode {
  id: string;
  rootId: string | null; // null = this node is itself a root
}

/**
 * True if two categories are on the same branch — equal, or one is the
 * ancestor of the other. The curated service tree is only 2 levels deep, so
 * the only ancestor relation possible is root <-> its direct child.
 */
export function categoriesMatch(a: CategoryNode, b: CategoryNode): boolean {
  if (a.id === b.id) return true;
  if (a.rootId === null && b.rootId === a.id) return true; // a is b's root
  if (b.rootId === null && a.rootId === b.id) return true; // b is a's root
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
