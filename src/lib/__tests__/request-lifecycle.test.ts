import assert from "node:assert/strict";
import { requestCategoryWhere, requestInMatchSet } from "../category-matching";
import { shouldExpire, REQUEST_EXPIRY_DAYS } from "../request-expiry";
import { escapeEmailHtml, newRequestAlertEmail, claimRejectedEmail, requestExpiredEmail } from "../email";
import { rateLimitAsync } from "../rate-limit";
import {
  MULTILABEL_RATE_LIMIT,
  MULTILABEL_LOG_RATE_LIMIT,
  multilabelRateKey,
  multilabelLogRateKey,
} from "../../app/api/category-multilabel/limits";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-29T12:00:00Z");
const ago = (days: number) => new Date(now.getTime() - days * DAY);
const open = {
  status: "OPEN",
  moderationStatus: "APPROVED",
  createdAt: ago(60),
  updatedAt: ago(60),
  lastResponseAt: null as Date | null,
};

const tests: Array<[string, () => void | Promise<void>]> = [
  // ── lead feed: secondary categories ──
  [
    "lead feed where-clause matches primary OR any linked category",
    () => {
      assert.deepEqual(requestCategoryWhere(["a", "b"]), {
        OR: [{ categoryId: { in: ["a", "b"] } }, { categories: { some: { categoryId: { in: ["a", "b"] } } } }],
      });
    },
  ],
  [
    "a request is in my categories when only a SECONDARY category matches",
    () => {
      const match = new Set(["plumbing"]);
      assert.equal(requestInMatchSet({ categoryId: "tiling", categories: [{ categoryId: "plumbing" }] }, match), true);
      assert.equal(requestInMatchSet({ categoryId: "plumbing", categories: [] }, match), true);
      assert.equal(requestInMatchSet({ categoryId: "tiling", categories: [{ categoryId: "painting" }] }, match), false);
      assert.equal(requestInMatchSet({ categoryId: null, categories: [] }, match), false);
    },
  ],

  // ── expiry selection ──
  ["an approved OPEN request idle past the window expires", () => assert.equal(shouldExpire(open, now), true)],
  [
    "a request just inside the window does not expire",
    () => {
      const fresh = ago(REQUEST_EXPIRY_DAYS - 1);
      assert.equal(shouldExpire({ ...open, createdAt: fresh, updatedAt: fresh }, now), false);
    },
  ],
  [
    "a recent offer or edit counts as activity",
    () => {
      assert.equal(shouldExpire({ ...open, lastResponseAt: ago(3) }, now), false);
      assert.equal(shouldExpire({ ...open, updatedAt: ago(3) }, now), false);
    },
  ],
  [
    "non-OPEN and not-approved requests never expire",
    () => {
      for (const status of ["CLOSED", "IN_PROGRESS", "EXPIRED", "PENDING_CONFIRMATION"]) {
        assert.equal(shouldExpire({ ...open, status }, now), false, status);
      }
      assert.equal(shouldExpire({ ...open, moderationStatus: "PENDING" }, now), false);
    },
  ],

  // ── email escaping ──
  [
    "escapeEmailHtml escapes raw input and does not double-escape stored titles",
    () => {
      assert.equal(escapeEmailHtml(`<script>"x"</script>`), "&lt;script&gt;&quot;x&quot;&lt;/script&gt;");
      // request titles are stored already escaped by sanitizeHtml
      assert.equal(escapeEmailHtml("Tom &amp; Jerry"), "Tom &amp; Jerry");
    },
  ],
  [
    "templates escape names, titles and the claim-rejection reason",
    () => {
      const alert = newRequestAlertEmail("<b>Jonas</b>", `<img src=x onerror=alert(1)>`, "Valymas", "https://x/u?a=1&b=2");
      assert.ok(!alert.html.includes("<b>Jonas</b>"));
      assert.ok(!alert.html.includes("<img"));
      assert.ok(alert.html.includes("https://x/u?a=1&amp;b=2"), "unsubscribe link is in the body");
      assert.equal(alert.unsubscribeUrl, "https://x/u?a=1&b=2");
      const rejected = claimRejectedEmail("UAB", `<a href="evil">spauskite</a>`);
      assert.ok(!rejected.html.includes(`<a href="evil">`));
      const expired = requestExpiredEmail(`"><script>`, [{ title: "Dažymas &amp; tinkavimas", trackingToken: "tok" }], REQUEST_EXPIRY_DAYS);
      assert.ok(!expired.html.includes("<script>"));
      assert.ok(expired.subject.includes("Dažymas & tinkavimas"), "subjects are plain text");
      const many = requestExpiredEmail("Ona", [
        { title: "<i>A</i>", trackingToken: "t1" },
        { title: "B", trackingToken: "t2" },
      ], REQUEST_EXPIRY_DAYS);
      assert.ok(many.html.includes("/uzklausos/sekti/t1") && many.html.includes("/uzklausos/sekti/t2"), "one email lists every request");
      assert.ok(!many.html.includes("<i>A</i>"));
    },
  ],

  // ── multilabel rate limit (in-memory limiter: no Upstash env in tests) ──
  [
    "category-multilabel allows 20 calls per IP per hour, then blocks; other IPs unaffected",
    async () => {
      for (let i = 0; i < MULTILABEL_RATE_LIMIT.maxRequests; i++) {
        assert.equal((await rateLimitAsync(multilabelRateKey("1.1.1.1"), MULTILABEL_RATE_LIMIT)).success, true);
      }
      assert.equal((await rateLimitAsync(multilabelRateKey("1.1.1.1"), MULTILABEL_RATE_LIMIT)).success, false);
      assert.equal((await rateLimitAsync(multilabelRateKey("2.2.2.2"), MULTILABEL_RATE_LIMIT)).success, true);
    },
  ],
  [
    "the /log limiter has its own bucket",
    async () => {
      assert.notEqual(multilabelLogRateKey("1.1.1.1"), multilabelRateKey("1.1.1.1"));
      assert.equal((await rateLimitAsync(multilabelLogRateKey("1.1.1.1"), MULTILABEL_LOG_RATE_LIMIT)).success, true);
    },
  ],
];

(async () => {
  for (const [name, fn] of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log("RESULT: PASS");
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
