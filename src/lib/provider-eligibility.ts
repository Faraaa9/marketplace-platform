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

/**
 * Check whether a provider is eligible to respond to a specific request.
 * Pure logic — no DB calls. Caller provides the data.
 */
export function checkEligibility(
  providerId: string,
  request: { category: string; status: string; clientId: string | null },
  providerSpecs: string[],
): EligibilityResult {
  if (request.status !== "OPEN") {
    return { allowed: false, code: "REQUEST_CLOSED", message: "Ši užklausa nebepriima naujų pasiūlymų" };
  }

  if (request.clientId === providerId) {
    return { allowed: false, code: "OWN_REQUEST", message: "Negalite atsakyti į savo paties užklausą" };
  }

  if (providerSpecs.length === 0) {
    return {
      allowed: false,
      code: "NO_SPECIALIZATIONS",
      message: "Neturite nustatytų specializacijų. Užpildykite savo profilį, kad galėtumėte teikti pasiūlymus.",
    };
  }

  if (!providerSpecs.includes(request.category)) {
    return {
      allowed: false,
      code: "SPECIALIZATION_MISMATCH",
      message: "Ši užklausa nepriklauso jūsų specializacijos sričiai.",
    };
  }

  return { allowed: true, code: "OK", message: "" };
}

/** Parse specializations from DB (stored as JSON string or array). */
export function parseSpecializations(raw: unknown): string[] {
  if (!raw) return [];
  try {
    return typeof raw === "string" ? JSON.parse(raw) : Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}
