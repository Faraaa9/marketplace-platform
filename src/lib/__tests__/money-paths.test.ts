/**
 * Money-path tests: credit spend, lead unlock, starter grant, Stripe purchase
 * webhook, refunds and disputes. They run against a REAL Postgres because the
 * guarantees under test (transactions, row locks, unique indexes) only exist
 * there — an in-memory fake would pass regardless.
 *
 *   TEST_DATABASE_URL=postgresql://postgres@localhost:5432/credits_test pnpm test:money
 *
 * The database must be local and disposable: every run truncates it. Create
 * the schema first with `DATABASE_URL=$TEST_DATABASE_URL pnpm exec prisma db push`.
 * Stripe events are crafted objects fed to the same handler the route uses
 * (signature verification is Stripe's SDK and is not re-tested here).
 */
import assert from "node:assert/strict";
import type Stripe from "stripe";

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  console.error("TEST_DATABASE_URL is not set — see the header of money-paths.test.ts.");
  process.exit(1);
}
if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(testUrl).hostname)) {
  console.error("Refusing to run: TEST_DATABASE_URL must point at a local, disposable database.");
  process.exit(1);
}
process.env.DATABASE_URL = testUrl;

// Loaded after DATABASE_URL is set so the Prisma singleton picks it up.
/* eslint-disable @typescript-eslint/no-require-imports */
const { prisma } = require("../prisma") as typeof import("../prisma");
const credits = require("../credits") as typeof import("../credits");
const { handleStripeEvent } = require("../stripe-webhook") as typeof import("../stripe-webhook");
const { getStripe } = require("../stripe") as typeof import("../stripe");
/* eslint-enable @typescript-eslint/no-require-imports */

let seq = 0;

async function makeProvider(balance = 0): Promise<string> {
  seq += 1;
  const user = await prisma.user.create({
    data: { email: `p${seq}@test.local`, role: "PROVIDER" },
    select: { id: true },
  });
  const profile = await prisma.providerProfile.create({
    data: { userId: user.id, images: [], creditBalance: balance },
    select: { id: true },
  });
  return profile.id;
}

async function makeRequest(): Promise<string> {
  seq += 1;
  const r = await prisma.serviceRequest.create({
    data: {
      title: `Darbas ${seq}`,
      description: "Testas",
      category: "test",
      location: "Vilnius",
      clientEmail: `c${seq}@test.local`,
      clientName: "Klientas",
    },
    select: { id: true },
  });
  return r.id;
}

const balanceOf = (id: string) => credits.getCreditBalance(id);
const ledger = (id: string) =>
  prisma.creditTransaction.findMany({
    where: { providerProfileId: id },
    orderBy: { createdAt: "asc" },
    select: { type: true, amount: true, balanceAfter: true, note: true },
  });
const claimed = (eventId: string) =>
  prisma.webhookEvent.count({ where: { source: "stripe", externalId: eventId } });

function checkoutEvent(id: string, providerProfileId: string, creditCount: number): Stripe.Event {
  return {
    id,
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_${id}`,
        mode: "payment",
        payment_status: "paid",
        payment_intent: `pi_${id}`,
        metadata: { providerProfileId, credits: String(creditCount), creditPackId: "" },
      },
    },
  } as unknown as Stripe.Event;
}

function refundEvent(id: string, chargeId: string, amount: number, refunded: number): Stripe.Event {
  return {
    id,
    type: "charge.refunded",
    data: { object: { id: chargeId, amount, amount_refunded: refunded, refunds: { data: [{ id: `re_${id}` }] } } },
  } as unknown as Stripe.Event;
}

function disputeEvent(
  id: string,
  type: "charge.dispute.created" | "charge.dispute.closed",
  chargeId: string,
  amount: number,
  status: string,
): Stripe.Event {
  return { id, type, data: { object: { id: `dp_${chargeId}`, charge: chargeId, amount, status } } } as unknown as Stripe.Event;
}

// Charge ids are derived from the event id; every crafted charge is 1000 cents.
const lookups = {
  checkoutChargeId: async (s: Stripe.Checkout.Session) => `ch_${String(s.payment_intent).slice(3)}`,
  chargeAmountCents: async () => 1000,
};

async function buy(eventId: string, providerProfileId: string, creditCount: number) {
  const out = await handleStripeEvent(checkoutEvent(eventId, providerProfileId, creditCount), lookups);
  assert.equal(out.duplicate, false);
  return `ch_${eventId}`;
}

const tests: Array<[string, () => Promise<void>]> = [
  [
    "webhook: a failed grant leaves the event unclaimed and the retry credits once",
    async () => {
      const missingProfile = "does-not-exist-yet";
      const event = checkoutEvent("evt_fail", missingProfile, 10);
      await assert.rejects(handleStripeEvent(event, lookups));
      assert.equal(await claimed("evt_fail"), 0, "claim must roll back with the failed grant");

      // The provider now exists (stands in for whatever transient error
      // broke the first delivery). Stripe's retry must be processed.
      const user = await prisma.user.create({ data: { email: "late@test.local" }, select: { id: true } });
      await prisma.providerProfile.create({ data: { id: missingProfile, userId: user.id, images: [] } });
      const retry = await handleStripeEvent(event, lookups);
      assert.equal(retry.duplicate, false);
      assert.ok(retry.afterCommit, "a fresh purchase schedules the confirmation email");
      assert.equal(await balanceOf(missingProfile), 10);
      assert.equal(await claimed("evt_fail"), 1);

      const again = await handleStripeEvent(event, lookups);
      assert.equal(again.duplicate, true);
      assert.equal(await balanceOf(missingProfile), 10);
    },
  ],
  [
    "webhook: a failed charge lookup leaves the event unclaimed",
    async () => {
      const p = await makeProvider();
      const failing = { ...lookups, checkoutChargeId: async () => { throw new Error("Stripe down"); } };
      await assert.rejects(handleStripeEvent(checkoutEvent("evt_lookup", p, 5), failing));
      assert.equal(await claimed("evt_lookup"), 0);
      assert.equal(await balanceOf(p), 0);
    },
  ],
  [
    "webhook: concurrent deliveries of one event credit exactly once",
    async () => {
      const p = await makeProvider();
      const event = checkoutEvent("evt_race", p, 7);
      const results = await Promise.allSettled([1, 2, 3, 4].map(() => handleStripeEvent(event, lookups)));
      const fulfilled = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<{ duplicate: boolean }>[];
      assert.equal(fulfilled.filter((r) => !r.value.duplicate).length, 1);
      assert.equal(await balanceOf(p), 7);
    },
  ],
  [
    "webhook: a second event for the same checkout session does not double-credit",
    async () => {
      const p = await makeProvider();
      const first = checkoutEvent("evt_same_a", p, 4);
      await handleStripeEvent(first, lookups);
      const second = { ...first, id: "evt_same_b" } as Stripe.Event;
      const out = await handleStripeEvent(second, lookups);
      assert.equal(out.afterCommit, undefined, "no second confirmation email");
      assert.equal(await balanceOf(p), 4);
    },
  ],
  [
    "refund: partial refunds reverse proportionally and add up",
    async () => {
      const p = await makeProvider();
      const charge = await buy("evt_buy_partial", p, 10);
      await handleStripeEvent(refundEvent("evt_re1", charge, 1000, 300), lookups);
      assert.equal(await balanceOf(p), 7, "30 % refunded → 3 of 10 credits back");
      await handleStripeEvent(refundEvent("evt_re2", charge, 1000, 1000), lookups);
      assert.equal(await balanceOf(p), 0, "cumulative 100 % → all 10 reversed in total");
      const rows = (await ledger(p)).filter((r) => r.type === "REFUND_REVERSAL");
      assert.deepEqual(rows.map((r) => r.amount), [-3, -7]);
    },
  ],
  [
    "refund: spent credits are not driven below zero and the shortfall is recorded",
    async () => {
      const p = await makeProvider();
      const charge = await buy("evt_buy_spent", p, 2);
      for (let i = 0; i < 2; i++) {
        const r = await credits.unlockLead({ providerProfileId: p, requestId: await makeRequest() });
        assert.equal(r.ok, true);
      }
      assert.equal(await balanceOf(p), 0);
      await handleStripeEvent(refundEvent("evt_re_spent", charge, 1000, 1000), lookups);
      assert.equal(await balanceOf(p), 0);
      const row = (await ledger(p)).find((r) => r.type === "REFUND_REVERSAL");
      assert.ok(row);
      assert.equal(row.amount, 0);
      assert.match(row.note ?? "", /neišieškota 2 kr\./);
    },
  ],
  [
    "refund: a charge with no matching purchase is acknowledged, not retried forever",
    async () => {
      const out = await handleStripeEvent(refundEvent("evt_re_orphan", "ch_unknown", 1000, 1000), lookups);
      assert.equal(out.duplicate, false);
      assert.equal(await claimed("evt_re_orphan"), 1);
    },
  ],
  [
    "dispute: opening takes credits back, winning restores them",
    async () => {
      const p = await makeProvider();
      const charge = await buy("evt_buy_dispute", p, 10);
      await handleStripeEvent(disputeEvent("evt_dp_open", "charge.dispute.created", charge, 1000, "needs_response"), lookups);
      assert.equal(await balanceOf(p), 0);
      await handleStripeEvent(disputeEvent("evt_dp_won", "charge.dispute.closed", charge, 1000, "won"), lookups);
      assert.equal(await balanceOf(p), 10);
    },
  ],
  [
    "dispute + refund together never reverse more than was bought",
    async () => {
      const p = await makeProvider(5);
      const charge = await buy("evt_buy_both", p, 10);
      await handleStripeEvent(refundEvent("evt_both_re", charge, 1000, 500), lookups);
      await handleStripeEvent(disputeEvent("evt_both_dp", "charge.dispute.created", charge, 1000, "needs_response"), lookups);
      assert.equal(await balanceOf(p), 5, "only the 10 purchased credits come back out");
    },
  ],
  [
    "unlock: one credit per lead, never twice, never negative under concurrency",
    async () => {
      const p = await makeProvider(1);
      const reqA = await makeRequest();
      const reqB = await makeRequest();
      const same = await Promise.all([1, 2, 3].map(() => credits.unlockLead({ providerProfileId: p, requestId: reqA })));
      assert.ok(same.every((r) => r.ok));
      assert.equal(await balanceOf(p), 0);
      assert.equal((await ledger(p)).filter((r) => r.type === "UNLOCK_SPEND").length, 1);

      const broke = await credits.unlockLead({ providerProfileId: p, requestId: reqB });
      assert.deepEqual(broke, { ok: false, reason: "INSUFFICIENT_CREDITS", balance: 0 });
      assert.equal(await prisma.leadUnlock.count({ where: { requestId: reqB } }), 0, "no unlock without payment");
    },
  ],
  [
    "spend: racing unlocks of different leads cannot overspend",
    async () => {
      const p = await makeProvider(2);
      const reqs = await Promise.all([1, 2, 3, 4, 5].map(() => makeRequest()));
      const results = await Promise.all(reqs.map((requestId) => credits.unlockLead({ providerProfileId: p, requestId })));
      assert.equal(results.filter((r) => r.ok).length, 2);
      assert.equal(await balanceOf(p), 0);
      assert.equal(await prisma.leadUnlock.count({ where: { providerProfileId: p } }), 2);
    },
  ],
  [
    "starter credits: granted at most once, even when called concurrently",
    async () => {
      await prisma.platformSettings.upsert({
        where: { id: "singleton" },
        update: { freeStarterCredits: 3 },
        create: { id: "singleton", freeStarterCredits: 3 },
      });
      const p = await makeProvider();
      await Promise.all([1, 2, 3, 4, 5].map(() => credits.grantStarterCredits(p)));
      await credits.grantStarterCredits(p);
      assert.equal(await balanceOf(p), 3);
      assert.equal((await ledger(p)).filter((r) => r.type === "STARTER_GRANT").length, 1);
    },
  ],
  [
    "config: a missing Stripe key fails loudly instead of using a placeholder",
    async () => {
      const saved = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;
      try {
        assert.throws(() => getStripe(), /STRIPE_SECRET_KEY is not set/);
      } finally {
        if (saved !== undefined) process.env.STRIPE_SECRET_KEY = saved;
      }
    },
  ],
];

async function main() {
  await prisma.$executeRawUnsafe("TRUNCATE users, service_requests, webhook_events, platform_settings CASCADE");
  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log(`ok   ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${name}\n`, error);
    }
  }
  await prisma.$disconnect();
  console.log(`\n${tests.length - failed}/${tests.length} passed`);
  if (failed) process.exit(1);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
