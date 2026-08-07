import React from "react";

export const SITE_URL = "https://e-commerce.ini.az";

// JSON.stringify XSS-ə qarşı təmizlənmir — `<` unicode-a çevrilir (Next sənədinin tövsiyəsi).
function serialize(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Səhifəyə struktur data əlavə edən <script type="application/ld+json"> (qayda #7). */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialize(data) }}
    />
  );
}

/**
 * Səhifə üçün `alternates` bloku.
 *
 * DİQQƏT — hreflang haqqında: hazırda dil COOKIE ilə seçilir (`server-lang.ts`),
 * `/[lang]` alt-yol routing-i HƏLƏ YOXDUR. Yəni `/az/products` kimi ünvanlar
 * mövcud deyil və 404 verərdi. Ona görə uydurma `hreflang` alternativləri
 * YAZMIRIQ — bu, Google-a olmayan ünvanları göstərmək olardı.
 *
 * Eyni URL hər üç dili qaytardığı üçün doğru olan: öz-özünə istinad edən
 * canonical + `x-default`. `/[lang]` routing-i gələndə (Faza 2) burada
 * `languages: { az: ..., en: ..., ru: ... }` əlavə olunacaq — TƏK YER.
 */
export function alternatesFor(path: string) {
  return {
    canonical: path,
    languages: { "x-default": path },
  };
}

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "E-Commerce",
    url: SITE_URL,
    logo: `${SITE_URL}/icon.svg`,
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "E-Commerce",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/products?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

type ProductLdInput = {
  id: string;
  name: string;
  description?: string;
  image?: string | string[];
  brand?: string;
  sku?: string | null;
  priceCents: number;
  /** Platformaya görə fərqlidir (CNY / EUR) — heç vaxt sabit deyil. */
  currency: string;
  inStock?: boolean;
  rating?: number;
  reviewCount?: number;
};

export function productLd(p: ProductLdInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description || undefined,
    image: p.image,
    sku: p.sku ?? undefined,
    brand: p.brand ? { "@type": "Brand", name: p.brand } : undefined,
    offers: {
      "@type": "Offer",
      price: (p.priceCents / 100).toFixed(2),
      priceCurrency: p.currency,
      availability: p.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${SITE_URL}/products/${p.id}`,
    },
    // Reytinq YALNIZ həqiqətən rəy varsa göstərilir. Uydurma `aggregateRating`
    // həm Google cəzası, həm də istifadəçini aldatmaqdır — platformadan
    // rəy sayı gəlmirsə sahə ümumiyyətlə yazılmır.
    aggregateRating:
      (p.rating ?? 0) > 0 && (p.reviewCount ?? 0) > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: p.rating,
            reviewCount: p.reviewCount,
          }
        : undefined,
  };
}

export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.url}`,
    })),
  };
}
