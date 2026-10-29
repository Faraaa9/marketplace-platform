export type ClaimDecision = "claim" | "already_claimed" | "owned_by_other" | "email_mismatch" | "email_unverified";

/**
 * Whether `user` may attach a guest request to their account. Holding the
 * tracking link is not enough: the account must own the email the request
 * was filed with, and that email must be verified (else anyone could register
 * an unverified account under the victim's address and claim).
 */
export function decideClaim(
  request: { clientId: string | null; clientEmail: string },
  user: { id: string; email: string; emailVerified: Date | null },
): ClaimDecision {
  if (request.clientId) return request.clientId === user.id ? "already_claimed" : "owned_by_other";
  if (request.clientEmail.trim().toLowerCase() !== user.email.trim().toLowerCase()) return "email_mismatch";
  if (!user.emailVerified) return "email_unverified";
  return "claim";
}
