import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/seo/jsonld";

// Dinamik sitemap — məhsullar və kateqoriyalar DB-dən (qayda #4, #7).
//
// HƏCM: sitemap protokolu bir faylda 50 000 URL-ə icazə verir. Məhsul sayı
// artdıqca `PRODUCT_LIMIT` həddinə çatacaq; o zaman `generateSitemaps` ilə
// bölmək lazımdır. Hazırda ~1600 məhsul var, tək fayl kifayətdir.
const PRODUCT_LIMIT = 20000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, platforms] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, updatedAt: true },
      take: PRODUCT_LIMIT,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.category.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.platform.findMany({
      where: { isActive: true },
      select: { key: true },
    }),
  ]);

  // Platforma kateqoriyaları — YALNIZ aktiv platformaların yuxarı səviyyəsi.
  // Alt kateqoriyalar minlərlədir və çoxu boş nəticə verir; onları sitemap-a
  // yığmaq tarama büdcəsini israf edərdi.
  const platformKeys = platforms.map((p) => p.key);
  const platformCategories =
    platformKeys.length > 0
      ? await prisma.platformCategory.findMany({
          where: { platformKey: { in: platformKeys }, parentExternalId: "0" },
          select: { platformKey: true, externalId: true, updatedAt: true },
        })
      : [];

  const now = new Date();
  const staticPaths = [
    "",
    "/products",
    "/categories",
    "/new",
    "/deals",
    "/sale",
    "/brands",
    "/help",
  ];

  return [
    ...staticPaths.map((p) => ({
      url: `${SITE_URL}${p}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: p === "" ? 1 : 0.7,
    })),
    ...categories.map((c) => ({
      url: `${SITE_URL}/category/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...platformCategories.map((c) => ({
      // Kateqoriya baxışı `/products?platform=&cat=` ünvanındadır (ayrıca route yox).
      url: `${SITE_URL}/products?platform=${encodeURIComponent(
        c.platformKey,
      )}&cat=${encodeURIComponent(c.externalId)}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...products.map((pr) => ({
      url: `${SITE_URL}/products/${pr.id}`,
      lastModified: pr.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
  ];
}
