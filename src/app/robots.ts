import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/jsonld";

// /admin və /panel noindex (qayda #7) — həm də /api botlara bağlıdır.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/panel", "/api"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
