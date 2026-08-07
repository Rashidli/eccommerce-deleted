import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLang } from "@/lib/server-lang";
import { dict } from "@/lib/i18n";
import { getProductById, getRelatedProducts } from "@/lib/data/catalog";
import { fetchAndCacheProductDetail } from "@/lib/partzona/detail";
import {
  JsonLd,
  productLd,
  breadcrumbLd,
  alternatesFor,
} from "@/lib/seo/jsonld";
import { getProductSeo, readProductSeo, truncate } from "@/lib/seo/product-seo";
import { ProductDetail } from "./product-detail";

// Məhsul detalı — DB-dən (id-yə görə) + bənzər məhsullar.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const lang = await getLang();
  const t = dict[lang];

  // `cache()` sayəsində bu sorğu səhifə render-i ilə paylaşılır (təkrar sorğu yox).
  const p = await getProductSeo(id, lang);
  if (!p) return { title: t.common.noResults };

  const description = p.description
    ? truncate(p.description)
    : t.seo.productFallbackDescription
        .replace("{name}", p.name)
        .replace("{brand}", p.brand);

  const path = `/products/${p.id}`;

  return {
    title: p.name,
    description,
    alternates: alternatesFor(path),
    openGraph: {
      type: "website",
      title: p.name,
      description,
      url: path,
      images: p.image ? [{ url: p.image, alt: p.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: p.name,
      description,
      images: p.image ? [p.image] : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lang = await getLang();
  const t = dict[lang];

  // Platforma məhsulu üçün detal (təsvir, bütün şəkillər, SKU matrisi) bir dəfə
  // API-dən çəkilib DB-yə yazılır — sonrakı baxışlar birbaşa DB-dən gəlir (qayda #2, #4).
  // Seed məhsullarında (externalId yoxdur) heç nə etmir.
  await fetchAndCacheProductDetail(id, lang);

  const product = await getProductById(id, lang);
  if (!product) notFound();
  const related = await getRelatedProducts(id, lang);

  // Struktur data — detal çəkildikdən SONRA və KEŞSİZ oxunur ki, ilk baxışda da
  // təsvir/şəkillər JSON-LD-yə düşsün (keşli variant zənginləşmədən əvvəlki
  // dəyəri saxlaya bilərdi — `readProductSeo` şərhinə bax).
  const seo = await readProductSeo(id, lang);

  return (
    <>
      {seo && (
        <>
          <JsonLd
            data={productLd({
              id: seo.id,
              name: seo.name,
              description: seo.description,
              image: seo.images.length > 0 ? seo.images : undefined,
              brand: seo.brand,
              sku: seo.sku,
              priceCents: seo.priceCents,
              currency: seo.currency,
              inStock: seo.inStock,
              rating: seo.rating,
              reviewCount: seo.reviewCount,
            })}
          />
          <JsonLd
            data={breadcrumbLd([
              { name: t.seo.breadcrumbHome, url: "/" },
              { name: t.seo.productsTitle, url: "/products" },
              ...(seo.categoryName
                ? [{ name: seo.categoryName, url: "/categories" }]
                : []),
              { name: seo.name, url: `/products/${seo.id}` },
            ])}
          />
        </>
      )}
      <ProductDetail product={product} related={related} />
    </>
  );
}
