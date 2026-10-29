import { BlockList, isIP } from "node:net";
import { lookup } from "node:dns/promises";

// Server-side fetches of user-supplied URLs (AI profile scraping) must never
// reach loopback, private networks or cloud metadata endpoints — the fetched
// content ends up on a public profile page.
const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 96], // unspecified + IPv4-compatible ::a.b.c.d
  ["2001::", 32], // Teredo
  ["2002::", 16], // 6to4
  ["::1", 128],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(net, prefix, "ipv6");
}

export function isPrivateIp(ip: string): boolean {
  const family = isIP(ip);
  if (family === 0) return true;
  // BlockList checks IPv4-mapped IPv6 (::ffff:a.b.c.d) against the IPv4 rules.
  return blocked.check(ip, family === 4 ? "ipv4" : "ipv6");
}

export class UnsafeUrlError extends Error {
  constructor(reason: string) {
    super(`Unsafe URL: ${reason}`);
    this.name = "UnsafeUrlError";
  }
}

type Resolver = (host: string) => Promise<string[]>;

const defaultResolver: Resolver = async (host) =>
  (await lookup(host, { all: true, verbatim: true })).map((r) => r.address);

/**
 * Throws UnsafeUrlError unless `raw` is an http(s) URL on a default port whose
 * host resolves only to public addresses. Every resolved address is checked,
 * so a hostname with one private A record is rejected.
 *
 * ponytail: DNS is resolved here and again by whoever fetches, so a rebinding
 * host could still flip between the two lookups. Pinning the resolved IP in the
 * fetch is the upgrade if that ever matters.
 */
export async function assertPublicHttpUrl(raw: string, resolve: Resolver = defaultResolver): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("invalid");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new UnsafeUrlError("protocol");
  if (url.username || url.password) throw new UnsafeUrlError("credentials");
  if (url.port && url.port !== "80" && url.port !== "443") throw new UnsafeUrlError("port");

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new UnsafeUrlError("host");
  }

  let addresses: string[];
  if (isIP(host)) {
    addresses = [host];
  } else {
    try {
      addresses = await resolve(host);
    } catch {
      throw new UnsafeUrlError("dns");
    }
  }
  if (addresses.length === 0 || addresses.some(isPrivateIp)) throw new UnsafeUrlError("private address");
  return url;
}
