import Stripe from "stripe";

let client: Stripe | undefined;

/**
 * Shared Stripe client. Created lazily so a missing key fails the request that
 * needs it (loudly, in the server log) instead of the build, and so no route
 * ever silently talks to Stripe with a placeholder key.
 */
export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("[stripe] STRIPE_SECRET_KEY is not set — Stripe payments are disabled");
  }
  client = new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
  return client;
}
