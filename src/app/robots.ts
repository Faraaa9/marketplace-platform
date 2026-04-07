import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://paslaugurinka.lt";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/tiekejas/", "/tiekėjas/", "/paskyra/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
