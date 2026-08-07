import type { MetadataRoute } from "next";

// Saytı telefonda tətbiq kimi qurmağa imkan verir (ana ekrana əlavə et).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "E-Commerce — Qlobal trendləri kəşf et",
    short_name: "E-Commerce",
    description:
      "1688 məhsulları. Bir tətbiqdə bütün qlobal trendlər.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#7c3aed",
    lang: "az",
    dir: "ltr",
    categories: ["shopping", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Səbətim", url: "/cart" },
      { name: "Sifarişlərim", url: "/panel/orders" },
      { name: "Endirimlər", url: "/deals" },
    ],
  };
}
