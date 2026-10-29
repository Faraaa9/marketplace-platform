// Run: pnpm test:request-progress — pure, no DB.
import assert from "node:assert/strict";
import { canRate, isCustomerThreadUnread, requestStatusChip, requestStep } from "../request-progress";

const base = { status: "OPEN", moderationStatus: "APPROVED", responseCount: 0, acceptedResponseId: null, reviewed: false };

assert.equal(requestStep(base), 0, "no offers → Pateikta");
assert.equal(requestStep({ ...base, responseCount: 2 }), 1, "offers → Pasiūlymai");
assert.equal(requestStep({ ...base, status: "IN_PROGRESS", responseCount: 2, acceptedResponseId: "r1" }), 2, "picked");
assert.equal(requestStep({ ...base, status: "CLOSED", responseCount: 2, acceptedResponseId: "r1" }), 3, "done, not rated");
assert.equal(requestStep({ ...base, status: "CLOSED", responseCount: 2, acceptedResponseId: "r1", reviewed: true }), 5, "all done");

assert.equal(canRate({ ...base, status: "IN_PROGRESS", acceptedResponseId: "r1" }), true);
assert.equal(canRate({ ...base, status: "CLOSED", acceptedResponseId: "r1", reviewed: true }), false);
assert.equal(canRate({ ...base, status: "CLOSED" }), false, "closed without a pick can't be rated");

assert.equal(requestStatusChip(base).label, "Laukiama pasiūlymų");
assert.equal(requestStatusChip({ ...base, moderationStatus: "PENDING" }).label, "Peržiūrima");
assert.equal(requestStatusChip({ ...base, status: "PENDING_CONFIRMATION" }).label, "Laukia patvirtinimo");
assert.equal(requestStatusChip({ ...base, status: "CLOSED", acceptedResponseId: "r1" }).label, "Atlikta — įvertinkite");
assert.equal(requestStatusChip({ ...base, status: "CLOSED" }).label, "Uždaryta");

console.log("request-progress: ok");

const t0 = new Date("2026-10-01T10:00:00Z");
const t1 = new Date("2026-10-02T10:00:00Z");
assert.equal(isCustomerThreadUnread({ lastSenderId: undefined, providerId: "p", lastMessageAt: t0, lastReadAt: null, offerCreatedAt: t0 }), true, "new offer");
assert.equal(isCustomerThreadUnread({ lastSenderId: undefined, providerId: "p", lastMessageAt: t0, lastReadAt: t1, offerCreatedAt: t0 }), false, "seen offer");
assert.equal(isCustomerThreadUnread({ lastSenderId: undefined, providerId: "p", lastMessageAt: t0, lastReadAt: null }), false, "unanswered inquiry");
assert.equal(isCustomerThreadUnread({ lastSenderId: "p", providerId: "p", lastMessageAt: t1, lastReadAt: t0 }), true, "provider replied");
assert.equal(isCustomerThreadUnread({ lastSenderId: "c", providerId: "p", lastMessageAt: t1, lastReadAt: t0 }), false, "customer spoke last");
