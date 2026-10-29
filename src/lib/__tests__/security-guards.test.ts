import assert from "node:assert/strict";
import { assertPublicHttpUrl, isPrivateIp } from "../ssrf-guard";
import { LOGIN_LIMITS, loginAllowed } from "../auth-guards";
import { decideClaim } from "../request-claim";

// Fake DNS so the suite stays offline and deterministic.
const dns: Record<string, string[]> = {
  "example.lt": ["93.184.216.34"],
  "rebind.example": ["93.184.216.34", "10.0.0.5"],
  "metadata.example": ["169.254.169.254"],
  "v6local.example": ["::1"],
};
const resolve = async (host: string) => {
  const hit = dns[host];
  if (!hit) throw new Error("ENOTFOUND");
  return hit;
};

async function rejects(url: string) {
  await assert.rejects(assertPublicHttpUrl(url, resolve), `${url} should be rejected`);
}

const tests: Array<[string, () => void | Promise<void>]> = [
  [
    "ssrf: public https URL passes",
    async () => {
      const url = await assertPublicHttpUrl("https://example.lt/meistras", resolve);
      assert.equal(url.hostname, "example.lt");
    },
  ],
  [
    "ssrf: non-http protocols are rejected",
    async () => {
      await rejects("file:///etc/passwd");
      await rejects("ftp://example.lt/");
      await rejects("javascript:alert(1)");
      await rejects("data:text/html,hi");
    },
  ],
  [
    "ssrf: loopback, private and metadata literals are rejected",
    async () => {
      await rejects("http://127.0.0.1/");
      await rejects("http://localhost:3000/");
      await rejects("http://10.1.2.3/");
      await rejects("http://192.168.1.1/");
      await rejects("http://172.20.0.1/");
      await rejects("http://169.254.169.254/latest/meta-data/");
      await rejects("http://0.0.0.0/");
      await rejects("http://[::1]/");
      await rejects("http://[::ffff:127.0.0.1]/");
      await rejects("http://[fd00::1]/");
      // Alternate IPv4 spellings the URL parser normalises to 127.0.0.1.
      await rejects("http://2130706433/");
      await rejects("http://0x7f.1/");
    },
  ],
  [
    "ssrf: hostnames resolving to any private address are rejected",
    async () => {
      await rejects("http://metadata.example/");
      await rejects("http://rebind.example/");
      await rejects("http://v6local.example/");
      await rejects("http://does-not-resolve.example/");
    },
  ],
  [
    "ssrf: credentials and non-default ports are rejected",
    async () => {
      await rejects("http://user:pass@example.lt/");
      await rejects("http://example.lt:8080/");
      await assertPublicHttpUrl("http://example.lt:443/", resolve);
    },
  ],
  [
    "ssrf: isPrivateIp sanity",
    () => {
      assert.equal(isPrivateIp("8.8.8.8"), false);
      assert.equal(isPrivateIp("2606:4700::1111"), false);
      assert.equal(isPrivateIp("100.64.0.1"), true);
      assert.equal(isPrivateIp("not-an-ip"), true);
    },
  ],
  [
    "login: per-email limit blocks after the cap, other emails unaffected",
    async () => {
      // Uses the in-memory limiter (no Upstash env in tests).
      for (let i = 0; i < LOGIN_LIMITS.email.maxRequests; i++) {
        assert.equal(await loginAllowed("Victim@Example.lt", `198.51.100.${i}`), true);
      }
      assert.equal(await loginAllowed("victim@example.lt", "198.51.100.200"), false, "case-folded email shares the bucket");
      assert.equal(await loginAllowed("someone-else@example.lt", "198.51.100.201"), true);
    },
  ],
  [
    "login: per-IP limit blocks spraying across many emails",
    async () => {
      for (let i = 0; i < LOGIN_LIMITS.ip.maxRequests; i++) {
        assert.equal(await loginAllowed(`spray${i}@example.lt`, "203.0.113.9"), true);
      }
      assert.equal(await loginAllowed("fresh@example.lt", "203.0.113.9"), false);
    },
  ],
  [
    "claim: matching verified email can claim; case and spaces ignored",
    () => {
      const user = { id: "u1", email: "Jonas@Example.lt", emailVerified: new Date() };
      assert.equal(decideClaim({ clientId: null, clientEmail: " jonas@example.lt" }, user), "claim");
    },
  ],
  [
    "claim: different email is refused even with the tracking token",
    () => {
      const user = { id: "u1", email: "attacker@example.lt", emailVerified: new Date() };
      assert.equal(decideClaim({ clientId: null, clientEmail: "jonas@example.lt" }, user), "email_mismatch");
    },
  ],
  [
    "claim: unverified account with the right email is refused",
    () => {
      const user = { id: "u1", email: "jonas@example.lt", emailVerified: null };
      assert.equal(decideClaim({ clientId: null, clientEmail: "jonas@example.lt" }, user), "email_unverified");
    },
  ],
  [
    "claim: owned requests stay with their owner",
    () => {
      const user = { id: "u1", email: "jonas@example.lt", emailVerified: new Date() };
      assert.equal(decideClaim({ clientId: "u1", clientEmail: "jonas@example.lt" }, user), "already_claimed");
      assert.equal(decideClaim({ clientId: "u2", clientEmail: "jonas@example.lt" }, user), "owned_by_other");
    },
  ],
];

(async () => {
  for (const [name, fn] of tests) {
    await fn();
    console.log(`ok - ${name}`);
  }
  console.log("RESULT: PASS");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
