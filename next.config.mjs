/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  outputFileTracingIncludes: {
    "/api/profile/ai-generate": [
      "./node_modules/@sparticuz/chromium/**/*",
      "./node_modules/playwright-core/**/*",
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
    ];
  },
};

export default nextConfig;
