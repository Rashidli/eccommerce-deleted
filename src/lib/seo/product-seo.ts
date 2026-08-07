import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { pickLang } from "@/lib/data/pick-lang";
import type { Lang } from "@/lib/i18n";

/**
 * SEO üçün məhsul məlumatı.
 *
 * `ProductDTO` (catalog.ts) storefront komponentləri üçün formatlanıb — qiymət
 * orada artıq mətndir (`"$54.90"`) və `currency`/`sku` ümumiyyətlə yoxdur.
 * JSON-LD isə XAM dəyər istəyir: `price` rəqəm, `priceCurrency` ayrıca kod.
 * Ona görə SEO öz nazik oxu qatından keçir (UI birbaşa Prisma çağırmır).
 *
 * `cache()` sayəsində `generateMetadata` və səhifə render-i eyni sorğuda
 * BİR DƏFƏ baza sorğusu edir.
 */
export type ProductSeo = {
  id: string;
  name: string;
  description: string;
  image: string;
  images: string[];
  brand: string;
  sku: string | null;
  priceCents: number;
  /** Platformaya görə dəyişir: 1688/taobao → CNY, zara → EUR (qayda #6). */
  currency: string;
  inStock: boolean;
  rating: number;
  reviewCount: number;
  categoryName: string | null;
};

/**
 * HTML və artıq boşluqları təmizləyir — meta description düz mətn olmalıdır.
 *
 * VACİB: 1688 təsvirləri şəkil ağırlıqlı HTML-dir; təmizləndikdən sonra bəzən
 * yalnız zibil qalır (bazada 37 məhsulun təsviri hərfsiz-rəqəmsiz `\ \ \ …`
 * ardıcıllığıdır). Belə mətn meta description və JSON-LD-yə DÜŞMƏMƏLİDİR —
 * mənasız təsvir olmamasından pisdir, ona görə boş sayılır və çağıran tərəf
 * lokallaşdırılmış şablona keçir.
 */
export function toPlainText(value: string | null | undefined): string {
  if (!value) return "";
  const text = value
    .replace(/<[^>]*>/g, " ")
    // Tək qalmış tərs-kəsik (escape qalığı) mətnə aid deyil.
    .replace(/\\+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Heç bir hərf və ya rəqəm yoxdursa — məzmun yoxdur (unicode-a həssas).
  return /[\p{L}\p{N}]/u.test(text) ? text : "";
}

/** Meta description üçün sözü yarımçıq kəsmədən qısaldır. */
export function truncate(value: string, max = 160): string {
  const text = toPlainText(value);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function parseImages(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((i): i is string => typeof i === "string" && i.length > 0)
      : [];
  } catch {
    return [];
  }
}

/**
 * Keşsiz oxu — detal API-dən çəkilib DB-yə yazıldıqdan SONRA çağırmaq üçün.
 *
 * `generateMetadata` səhifə render-indən əvvəl işləyir, yəni `cache()` variantı
 * məhsul HƏLƏ zənginləşməmiş halda dəyəri yadda saxlaya bilər. Struktur data
 * (JSON-LD) üçün bu qəbuledilməzdir — ilk baxışda təsvir/şəkillər itərdi.
 */
export async function readProductSeo(
  id: string,
  lang: Lang,
): Promise<ProductSeo | null> {
  return buildProductSeo(id, lang);
}

/** Metadata üçün keşli variant — eyni sorğuda təkrar baza sorğusu olmasın. */
export const getProductSeo = cache(
  async (id: string, lang: Lang): Promise<ProductSeo | null> =>
    buildProductSeo(id, lang),
);

async function buildProductSeo(
  id: string,
  lang: Lang,
): Promise<ProductSeo | null> {
  const p = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!p) return null;

  const gallery = parseImages(p.images);

  return {
    id: p.id,
    name: pickLang(p, "name", lang) || p.name,
    description: toPlainText(pickLang(p, "desc", lang) || p.description),
    image: p.image,
    images: gallery.length > 0 ? gallery : p.image ? [p.image] : [],
    brand: p.brand,
    sku: p.sku ?? p.externalId ?? null,
    priceCents: p.priceCents,
    currency: p.currency,
    inStock: p.stock > 0,
    rating: p.rating,
    reviewCount: p.reviewCount,
    categoryName: p.category ? pickLang(p.category, "name", lang) : null,
  };
}

/** Kateqoriya baxışı üçün ad (breadcrumb + başlıq). */
export const getPlatformCategorySeo = cache(
  async (
    platformKey: string,
    externalId: string,
    lang: Lang,
  ): Promise<{ name: string } | null> => {
    const row = await prisma.platformCategory.findUnique({
      where: { platformKey_externalId: { platformKey, externalId } },
    });
    if (!row) return null;
    return { name: pickLang(row, "name", lang) || row.nameZh || externalId };
  },
);
