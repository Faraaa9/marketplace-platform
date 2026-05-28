/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  outputFileTracingIncludes: {
    "/api/profile/ai-generate": [
      "./node_modules/@sparticuz/chromium/**/*",
      "./node_modules/playwright-core/**/*",
    ],
  },
  // Cache Components (Next 16 PPR). Static shell prerenders at build time,
  // dynamic parts stream via Suspense, cached parts use the `'use cache'`
  // directive. See NOTES.md "Performance follow-ups" for the migration log.
  cacheComponents: true,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "framer-motion",
      "@hookform/resolvers",
    ],
  },
  images: {
    qualities: [75, 80, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "paslaugos-img.dgn.lt",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "paslaugos.lt",
      },
      {
        protocol: "https",
        hostname: "*.paslaugos.lt",
      },
      {
        protocol: "https",
        hostname: "*.licdn.com",
      },
      {
        protocol: "https",
        hostname: "media.licdn.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh4.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh5.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh6.googleusercontent.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/tiekejai",
        destination: "/meistrai",
        permanent: false,
      },
      {
        source: "/tiekejai/:path*",
        destination: "/meistrai/:path*",
        permanent: false,
      },
      {
        source: "/admin/tiekėjai",
        destination: "/admin/tiekejai",
        permanent: false,
      },
      {
        source: "/api/admin/tiekėjai",
        destination: "/api/admin/tiekejai",
        permanent: false,
      },
      {
        source: "/tiekėjas",
        destination: "/tiekejas",
        permanent: false,
      },
      {
        source: "/tiekėjas/:path*",
        destination: "/tiekejas/:path*",
        permanent: false,
      },
      {
        source: "/api/tiekėjas/:path*",
        destination: "/api/tiekejas/:path*",
        permanent: false,
      },
      {
        source: "/api/admin/tiekėjai/:path*",
        destination: "/api/admin/tiekejai/:path*",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://res.cloudinary.com https://images.unsplash.com https://paslaugos-img.dgn.lt https://api.dicebear.com https://paslaugos.lt https://*.paslaugos.lt https://media.licdn.com https://*.licdn.com https://lh3.googleusercontent.com https://lh4.googleusercontent.com https://lh5.googleusercontent.com https://lh6.googleusercontent.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co; font-src 'self' https://fonts.gstatic.com; frame-ancestors 'none';",
          },
        ],
      },
      // Public pages with no per-user data. Next.js sets `Cache-Control:
      // no-store` for dynamic routes, so we use `CDN-Cache-Control` — a
      // Vercel-only header that the framework doesn't touch — to opt the
      // edge back into caching. Browsers still honor Next.js's no-store
      // for correctness; the edge serves cached responses to repeat visitors.
      // s-maxage matches each page's `revalidate` window; SWR lets stale
      // responses ship instantly while regeneration runs in the background.
      {
        source: "/",
        headers: [
          {
            key: "CDN-Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/meistrai",
        headers: [
          {
            key: "CDN-Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
      {
        source: "/tiekejams",
        headers: [
          {
            key: "CDN-Cache-Control",
            value: "public, s-maxage=300, stale-while-revalidate=600",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
