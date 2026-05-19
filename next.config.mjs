/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
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
    ],
  },
  async redirects() {
    return [
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
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://res.cloudinary.com https://images.unsplash.com https://paslaugos-img.dgn.lt; connect-src 'self'; font-src 'self' https://fonts.gstatic.com; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
